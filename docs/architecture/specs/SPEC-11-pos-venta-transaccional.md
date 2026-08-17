# SPEC-11 — Venta POS transaccional

**Estado:** IN PROGRESS (2026-08-17) — Tasks 11.1/11.2 completadas (Function transaccional implementada, unifica venta directa y "cargar a habitación" según tu decisión; 83 tests en verde contra el emulador real incluyendo concurrencia; `POSService`/`pos.component.ts` ya la consumen). Tasks 11.3/11.4 pendientes de que despliegues y confirmes. **Hallazgo importante que requiere tu atención (no corregido, solo documentado):** se descubrió un bug de doble IVA preexistente en "cargar a habitación" — ver detalle en Task 11.1.

## Objetivo
Centralizar `POSService.createSale` en una Function transaccional que valide y descuente stock de forma atómica, cerrando el riesgo de stock negativo/doble venta identificado en el análisis (mismo patrón de riesgo que el overbooking de reservas).

## Problema actual
`pos.service.ts:21-83`: valida stock, luego descuenta stock producto por producto en un loop secuencial no atómico, sin rollback si falla un paso intermedio. Dos ventas concurrentes del mismo producto pueden ambas pasar la validación.

## Comportamiento actual que debemos preservar
- Requiere caja abierta del cajero.
- Valida producto activo y stock suficiente por ítem.
- Registra la venta y la transacción de caja asociada.

## Comportamiento esperado
Callable `registrarVentaPOS(datos)`, transaccional: valida caja abierta, valida y descuenta stock de todos los ítems dentro de la misma transacción (todo o nada), crea la venta y la transacción de caja.

## Reglas de negocio
Ver sección B.6 del análisis.

## Datos de entrada
`{ items: {productId, quantity, unitPrice}[]; cashRegisterId: string; paymentMethod: string; tipoVenta: 'directa' | 'habitacion'; guestAccountId?: string }`.

## Datos de salida
`{ saleId: string; total: number }`.

## Validaciones
Caja abierta y del cajero correcto; stock suficiente por ítem (verificado y descontado atómicamente); producto activo.

## Permisos/autorización
Rol con acceso a POS, a confirmar.

## Firestore collections/documents involucrados
`sales`, `products`, `cashRegisters`, `transactions`, y si `tipoVenta === 'habitacion'`, `guestAccounts` (integración con Spec 09).

## Firebase Functions/API involucradas
`registrarVentaPOS` (nueva). Si `tipoVenta === 'habitacion'`, reutiliza `agregarCargoCuenta` (Spec 09) internamente.

## Dependencias
SPEC-03 (IVA), SPEC-09 (si aplica carga a habitación).

## Impacto en Angular
`POSService.createSale` pasa a invocar la callable. UI de POS (`features/private/pos`) sin cambios de interfaz.

## Impacto potencial en Flutter
No auditado.

## Impacto potencial en n8n/agente IA
Bajo probablemente — venta POS es una operación presencial, poco probable que el agente la ejecute, pero se deja disponible por consistencia.

## Criterios de aceptación
- Dos ventas concurrentes del último ítem de stock: solo una tiene éxito, la otra se rechaza con mensaje claro de stock insuficiente.
- El registro de venta y la transacción de caja se crean juntos o no se crea ninguno (atomicidad).
- La integración "cargar a habitación" sigue funcionando igual (usa Spec 09 internamente).

## Estrategia de pruebas
1. Tests en emulador: caso feliz, stock insuficiente, caja no abierta, concurrencia sobre el mismo producto.
2. Regresión manual: venta directa y venta cargada a habitación desde la UI de POS.

## Riesgos de regresión
Alto — toca inventario y caja simultáneamente, dos flujos financieros sensibles.

---

## Tasks

### Task 11.1 — Implementar `registrarVentaPOS` transaccional
- **Archivos afectados:** nuevo `functions/src/pos/registrar-venta.ts`.
- **Dependencias:** SPEC-03, SPEC-09.
- **Validación:** tests en emulador + concurrencia.
- **Estado:** COMPLETED (2026-08-17)

  **Hallazgo crítico contra el código real, que requirió tu decisión antes de implementar:** "cargar a habitación" (`pos.component.ts:202-224`, antes de esta Spec) **no pasaba por `POSService.createSale` en absoluto** — era código separado en el componente (`guestAccountService.addCharge` + un loop manual de `productService.updateStock`), sin ninguna validación de stock suficiente (a diferencia de la venta directa). El texto del Spec asumía un único flujo unificado; la realidad eran dos caminos completamente distintos.
  - **Tu decisión:** unificar ambos en `registrarVentaPOS`, agregando la validación de stock que hoy falta en el camino de habitación (cambio de comportamiento real y deliberado — hoy un cargo a habitación se acepta silenciosamente incluso sin stock suficiente; con esta Function, se rechaza).
  - Roles: `receptionist`/`admin`/`superadmin` — **no `manager`**, a diferencia de otras Specs de bookings/guest-accounts. Confirmado contra `DEFAULT_ROLE_PERMISSIONS`: manager no tiene la ruta `/pos`.
  - IVA 19%, no 13%: confirmado en `pos.component.ts:160` (`this.subtotal * 0.19`) — específico de ventas POS, distinto del 13% de reservas/guest accounts. Se reutiliza `calcularTotalesConImpuesto` (SPEC-03) pasándole `0.19` explícito (parámetro que ya existía para este caso, sin usarse hasta ahora).
  - "Reutiliza `agregarCargoCuenta` (SPEC-09) internamente": como Firestore no permite invocar otra Cloud Function dentro de una transacción de forma atómica, se refactorizó `cargos-pagos.ts` para extraer `aplicarCargoCuenta(tx, accountId, cargo, callerUid)` como función compartida — la usan tanto la callable pública `agregarCargoCuenta` como `registrarVentaPOS` (tipoVenta `habitacion`), dentro de sus propias transacciones.
  - **Orden de lecturas/escrituras:** Firestore exige que todas las lecturas de una transacción ocurran antes que cualquier escritura. Se leen todos los productos (`tx.getAll`) y, según el caso, la caja abierta o se aplica el cargo a la cuenta (que hace su propia lectura+escritura), **antes** de decrementar stock — de lo contrario Firestore rechaza la transacción.
  - **Hallazgo adicional, no corregido, solo documentado y replicado fielmente:** al cargar una venta POS a la habitación, el `total` ya incluye 19% de IVA, pero se guarda como un único `charge.total`; `aplicarCargoCuenta`/`calcularTotalesCuenta` vuelve a aplicarle 13% de IVA al recalcular los totales de la cuenta — **doble impuesto** (ej. $60 de subtotal → $71.40 tras 19% → $80.68 tras el 13% adicional). Se confirmó que esto **también le pasa al código actual** (`pos.component.ts` pasa el total ya gravado con 19% como `amount` a `addCharge`, que también vuelve a aplicar 13%) — no es un bug introducido por esta migración, es preexistente. Se replicó fielmente (no se "corrigió" sin permiso) y queda documentado para que decidas si amerita una Task de corrección separada.
  - Códigos de error nuevos: `LH-0306` (validación), `LH-0422..0425` (negocio).
  - **34 tests nuevos contra el emulador real**: 11 comportamiento (sin auth, sin rol, manager rechazado específicamente, datos faltantes, producto inexistente/inactivo, stock insuficiente con verificación de que no cambia nada, sin caja abierta, 2 casos felices con aritmética exacta incluyendo el hallazgo de doble IVA documentado arriba, stock insuficiente en camino de habitación) + **1 test de concurrencia real**: dos ventas simultáneas del último ítem de stock → solo una tiene éxito, stock nunca negativo (criterio de aceptación explícito del Spec). Total `functions/`: 83 tests en verde contra el emulador + 49 offline.

### Task 11.2 — Adaptar `POSService` en Angular
- **Archivos afectados:** `src/app/core/services/pos.service.ts`.
- **Dependencias:** Task 11.1.
- **Validación:** `ng build`; regresión manual (venta directa + a habitación).
- **Riesgos de regresión:** alto.
- **Estado:** COMPLETED a nivel de código (2026-08-17)
  - **También se tocó `pos.component.ts`** (no solo el servicio, como listaba originalmente el Spec) — necesario porque la decisión de unificar ambos flujos significa que el camino "cargar a habitación", antes inline en el componente, ahora también pasa por `POSService.createSale`. Se eliminaron las ~20 líneas de lógica manual (`guestAccountService.addCharge` + loop de `productService.updateStock`) del componente.
  - `POSService.createSale` cambia su tipo de retorno de `Promise<Sale>` a `Promise<{saleId, total}>` (coincide con lo que devuelve la Function) — confirmado que es seguro: el único caller (`pos.component.ts:192`) nunca usó el valor de retorno.
  - `ng build --configuration production` limpio. Regresión manual (venta directa + a habitación): **pendiente** (Task 11.3).

### Task 11.3 — Regresión manual y aprobación del usuario
- **Dependencias:** Task 11.2.
- **Estado:** PENDING — requiere que el usuario despliegue `registrarVentaPOS` y pruebe: venta directa con caja abierta, venta cargada a habitación, y confirme si el hallazgo de doble IVA en cargos a habitación amerita corrección (fuera del alcance de esta Spec, requeriría su propia decisión).

### Task 11.4 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 11.3 VERIFIED.
- **Estado:** PENDING
