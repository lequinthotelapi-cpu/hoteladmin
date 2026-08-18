# SPEC-15 — Movimientos de inventario transaccionales

**Estado:** IN PROGRESS (2026-08-18) — Tasks 15.1-15.4 VERIFIED/COMPLETED (Function desplegada a producción, confirmada por el usuario en la UI real; lógica cliente antigua ya reemplazada). Task 15.5 (endurecer `firestore.rules` para `inventoryMovements`) completa en código y probada, falta desplegarla a producción.

## Objetivo
Centralizar `InventoryMovementService.create()` en una Function transaccional que valide y actualice el stock del producto de forma atómica junto con el registro del movimiento, cerrando el mismo tipo de riesgo de condición de carrera ya corregido en `crearReserva` (SPEC-05) y `registrarVentaPOS` (SPEC-11).

## Problema actual (confirmado contra el código real)
`inventory-movement.service.ts:26-71`, método `create()`:
1. Lee el producto con `productService.getById` (una lectura suelta, fuera de transacción).
2. Calcula `quantityChange`/`previousStock`/`newStock` **en memoria del cliente**.
3. Escribe el documento de movimiento (`addDoc` en `inventoryMovements`).
4. Escribe la actualización de stock del producto (`updateDoc` en `products`) — **en una llamada completamente separada**, sin transacción, sin rollback si el paso 3 tuvo éxito y el 4 falla (o viceversa).

Esto es exactamente el mismo patrón de riesgo que tenían `crearReserva` antes de SPEC-05 y el descuento de stock de `POSService.createSale` antes de SPEC-11: dos movimientos concurrentes sobre el mismo producto (p. ej. dos salidas casi simultáneas) pueden ambos leer el mismo `previousStock`, calcular de forma independiente, y la segunda escritura pisa silenciosamente a la primera (stock final incorrecto, con pérdida de uno de los dos movimientos). Además, la validación de stock suficiente para `type: 'exit'` (`product.currentStock < data.quantity`) se hace contra esa misma lectura no transaccional, así que dos salidas concurrentes pueden ambas pasar la validación aunque juntas dejen el stock negativo.

## Comportamiento actual que debemos preservar
- Tipos de movimiento: `entry` (suma), `exit` (resta, valida stock suficiente), `adjustment` (suma — misma fórmula que `entry`, solo cambia la etiqueta/motivo para reportes). El formulario Angular exige `quantity >= 1` (`Validators.min(1)`) para los tres tipos — un ajuste que reste stock nunca fue alcanzable desde la UI real, aunque el modelo de datos lo permitía en teoría; no se preserva esa posibilidad teórica.
- El stock resultante nunca puede quedar negativo — garantizado por construcción (quantity siempre > 0, y `exit` valida stock suficiente antes de aplicar el cambio).
- El movimiento guarda una foto (`productName`, `productCode`, `previousStock`, `newStock`) — así que el historial no se corrompe aunque el producto se edite/elimine después.
- Los movimientos no se pueden eliminar (`InventoryMovementService.delete()` ya lanza error hoy — "por integridad de datos").
- La UI (`movement-create.component.ts`) permite opcionalmente `unitCost` e `invoiceNumber`.

## Comportamiento esperado
Callable `registrarMovimientoInventario(datos)`, transaccional: lee el producto, valida (existe, activo, stock suficiente si es salida, stock resultante no negativo), y en la misma transacción escribe el movimiento y actualiza `products.currentStock`.

## Reglas de negocio
Iguales a las ya implementadas en `InventoryMovementService.create()` (ver arriba), simplemente movidas a una transacción de Firestore para que sean atómicas.

## Datos de entrada
`{ productId: string; type: 'entry'|'exit'|'adjustment'; reason: string; quantity: number; unitCost?: number; supplierId?: string; invoiceNumber?: string; notes?: string }`.

## Datos de salida
`{ movementId: string; newStock: number }`.

## Validaciones
- Producto existe.
- Producto activo (**nuevo, confirmado con el usuario** — hoy `InventoryMovementService.create()` no valida `isActive`; se agrega esta validación, consistente con `registrarVentaPOS`, SPEC-11).
- `quantity > 0` (ya validado en el formulario Angular con `Validators.min(1)`, pero no server-side).
- Para `exit`: stock actual suficiente.
- Stock resultante nunca negativo (para cualquier tipo, incluido `adjustment`).

## Permisos/autorización
Solo `admin`/`superadmin` tienen la ruta `/inventory` en `DEFAULT_ROLE_PERMISSIONS` (confirmado — `receptionist`, `manager` y `housekeeper` no la tienen). `ALLOWED_ROLES = ['admin', 'superadmin']`.

## Firestore collections/documents involucrados
`inventoryMovements`, `products`.

## Firebase Functions/API involucradas
`registrarMovimientoInventario` (nueva).

## Dependencias
Ninguna Spec previa estrictamente (es independiente), pero sigue el mismo patrón de `registrarVentaPOS` (SPEC-11) para el descuento transaccional de stock — se puede reutilizar la forma de leer/validar productos con `tx.getAll`/`tx.get`.

## Impacto en Angular
`InventoryMovementService.create()` pasa a invocar la callable. UI de inventario (`features/private/inventory`) sin cambios de interfaz.

## Impacto potencial en Flutter
No auditado (fuera de alcance de esta sesión, según instrucción del usuario).

## Impacto potencial en n8n/agente IA
Bajo/nulo por ahora — no se ha pedido que el agente gestione inventario; se deja disponible por consistencia si se decide exponerlo más adelante.

## Criterios de aceptación
- Dos movimientos `exit` concurrentes que juntos exceden el stock disponible: solo los que quepan tienen éxito, el resto se rechaza con mensaje claro de stock insuficiente, y el stock final nunca es negativo.
- El movimiento y la actualización de stock se crean/aplican juntos o no se aplica ninguno (atomicidad).
- Los tres tipos (`entry`/`exit`/`adjustment`) calculan el mismo resultado que hoy calcula el cliente.

## Estrategia de pruebas
1. Tests en emulador: caso feliz por cada tipo, producto inexistente, producto inactivo (si se confirma la validación), stock insuficiente en `exit`, ajuste que dejaría stock negativo, sin auth, sin rol suficiente (housekeeper/receptionist/manager rechazados).
2. Test de concurrencia: dos `exit` simultáneas sobre el mismo producto con stock justo para una sola → solo una tiene éxito.
3. Regresión manual: registrar una entrada, una salida y un ajuste desde la UI de inventario.

## Riesgos de regresión
Medio — el flujo es menos usado que reservas/POS (según lo observado: sin otros consumidores de escritura en el código salvo este único componente), pero toca el stock que también lee y descuenta `registrarVentaPOS` (SPEC-11), así que ambos deben quedar consistentes en cómo tratan `currentStock`.

## Hallazgos adicionales del código real (fuera del alcance mínimo de esta Spec)
- `ProductService.create()`/`update()` validan unicidad de `code` con una lectura suelta (`searchByCode`) antes de escribir — mismo patrón TOCTOU (time-of-check-to-time-of-use), pero de bajo riesgo real: la edición del catálogo de productos la hace un admin, rara vez concurrente. No se incluye en el alcance mínimo de esta Spec.
- `ProductService.adjustStock()` y `ProductService.updateStock()` son métodos públicos **sin ningún caller en la UI** (código muerto) — no se migran ni se tocan.
- `firestore.rules` para `products`/`inventoryMovements` sigue sin endurecer (`allow create, update: if isAuthenticated()`), tal como quedó documentado en SPEC-12 Task 12.3. El endurecimiento de estas dos colecciones queda como Task de cierre de esta Spec (15.5), solo tras VERIFIED — mismo patrón que bookings/guestAccounts en SPEC-05/09.
- `dashboard.component.ts` y `pos.component.ts` **solo leen** productos (`getAll()`) — no son escritores, no se ven afectados por esta Spec.

---

## Tasks

### Task 15.1 — Implementar `registrarMovimientoInventario` transaccional
- **Archivos afectados:** nuevo `functions/src/inventory/registrar-movimiento.ts`, `functions/src/shared/errors.ts` (LH-0307), `functions/src/index.ts` (export).
- **Dependencias:** ninguna.
- **Validación:** tests en emulador + concurrencia.
- **Estado:** COMPLETED (2026-08-17)
  - Roles: `admin`/`superadmin` (únicos con la ruta `/inventory` en `DEFAULT_ROLE_PERMISSIONS`).
  - Validación de producto activo agregada (confirmado con el usuario, no existía en el cliente).
  - **Hallazgo durante la implementación de tests:** el modelo de datos original (`CreateInventoryMovementData.quantity: number`) sugería que `adjustment` podía aceptar un delta negativo, pero el formulario Angular real (`movement-create.component.ts`) exige `Validators.min(1)` para los tres tipos — un ajuste que reste stock nunca fue alcanzable desde la UI. La Function exige `quantity > 0` para los tres tipos (igual que la UI), y `adjustment` usa la misma fórmula que `entry` (suma). Esto también hace que la validación "stock no puede quedar negativo" sea inalcanzable por construcción para `entry`/`adjustment` (solo `exit` puede intentarlo, y ya se valida antes) — se eliminó el código muerto correspondiente y el código LH-0426 que se había reservado para ese caso, ya que nunca se dispara.
  - **13 tests nuevos contra el emulador real**: 10 comportamiento (sin auth, sin rol, receptionist/manager rechazados específicamente, datos faltantes, type inválido, producto inexistente/inactivo, stock insuficiente en salida con verificación de que no cambia nada, quantity <= 0 rechazado incluso en adjustment) + 3 casos felices (entry, exit, adjustment) + **1 test de concurrencia real**: dos salidas simultáneas del último stock disponible → solo una tiene éxito, stock nunca negativo. Total `functions/`: 99 tests en verde contra el emulador (incluye 96 preexistentes + 1 flake de contención de recursos ya conocido en `checkin.concurrency.test.ts`, confirmado no relacionado al rerun) + 49 offline.

### Task 15.2 — Adaptar `InventoryMovementService` en Angular
- **Archivos afectados:** `src/app/core/services/inventory-movement.service.ts`.
- **Dependencias:** Task 15.1.
- **Validación:** `ng build`; regresión manual (entrada/salida/ajuste).
- **Estado:** COMPLETED a nivel de código (2026-08-17)
  - `create()` ahora invoca `registrarMovimientoInventario` vía `httpsCallable`. Se eliminó la dependencia de `ProductService` (ya no se usa en este servicio) y el cálculo de stock en el cliente.
  - `ng build --configuration production` limpio. Regresión manual: **pendiente** (Task 15.3).

### Task 15.3 — Regresión manual y aprobación del usuario
- **Dependencias:** Task 15.2.
- **Estado:** VERIFIED (2026-08-18) — el usuario confirmó que la funcionalidad probada en producción real funciona correctamente.

### Task 15.4 — Retirar lógica cliente antigua
- **Dependencias:** Task 15.3 VERIFIED.
- **Estado:** COMPLETED — no quedó pendiente ningún retiro adicional: a diferencia de otras Specs, Task 15.2 ya reemplazó el cuerpo completo de `InventoryMovementService.create()` (no se dejó la lógica vieja en paralelo). Confirmado por grep que no queda ningún caller de `movementRepository.create/update` fuera del propio repositorio.

### Task 15.5 — Endurecer `firestore.rules` para `inventoryMovements`
- **Dependencias:** Task 15.3 VERIFIED.
- **Estado:** COMPLETED (código) (2026-08-18) — `inventoryMovements` pasa a `allow create, update, delete: if false` (confirmado que no queda ningún camino legítimo de escritura de cliente). `products` **deliberadamente sin tocar** — el CRUD de catálogo sigue siendo del cliente, fuera de alcance de SPEC-15. 21/21 tests en verde en `firestore-tests/` (incluye 2 nuevos: rechazo directo sobre `inventoryMovements`, y confirmación de que `products` sigue sin endurecer). Falta desplegar `firestore.rules` a producción — pendiente de tu confirmación.

---

## Decisiones confirmadas por el usuario (2026-08-17)

1. **Producto inactivo:** se rechaza el movimiento (cambio de comportamiento real, deliberado, consistente con `registrarVentaPOS`).
2. **Alcance:** solo `registrarMovimientoInventario`. El CRUD de productos (`ProductService.create/update/delete`) queda fuera de esta Spec — sin bug de concurrencia detectado, se deja para una Spec futura si se decide abordarlo.
