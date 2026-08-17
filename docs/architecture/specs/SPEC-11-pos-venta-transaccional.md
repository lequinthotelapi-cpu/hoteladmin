# SPEC-11 — Venta POS transaccional

**Estado:** IN PROGRESS (2026-08-17) — Tasks 11.1/11.2 completadas (Function transaccional implementada, unifica venta directa y "cargar a habitación" según tu decisión; 85 tests en verde contra el emulador real incluyendo concurrencia; `POSService`/`pos.component.ts` ya la consumen). Tasks 11.3/11.4 pendientes de que despliegues y confirmes. **El bug de doble IVA en "cargar a habitación" (ver detalle en Task 11.1) ya fue corregido** con tu confirmación explícita — ver addendum al final del archivo.

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
  - **Hallazgo de doble IVA — corregido (2026-08-17, con confirmación del usuario), ver addendum al final del archivo.**
  - Códigos de error nuevos: `LH-0306` (validación), `LH-0422..0425` (negocio).
  - **34 tests nuevos contra el emulador real**: 11 comportamiento (sin auth, sin rol, manager rechazado específicamente, datos faltantes, producto inexistente/inactivo, stock insuficiente con verificación de que no cambia nada, sin caja abierta, 2 casos felices con aritmética exacta, stock insuficiente en camino de habitación) + **1 test de concurrencia real**: dos ventas simultáneas del último ítem de stock → solo una tiene éxito, stock nunca negativo (criterio de aceptación explícito del Spec). Total `functions/`: 85 tests en verde contra el emulador (tras el fix de doble IVA, ver addendum) + 49 offline.

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
- **Estado:** PENDING — requiere que el usuario despliegue `registrarVentaPOS` (ya desplegado según confirmación posterior del usuario) y pruebe: venta directa con caja abierta, venta cargada a habitación (con el IVA ya corregido).

### Task 11.4 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 11.3 VERIFIED.
- **Estado:** PENDING

---

## Addendum (2026-08-17): corrección del bug de doble IVA en "cargar a habitación"

**Decisión del usuario:** corregir el bug (no dejarlo como estaba).

**El fix:** para `tipoVenta: 'habitacion'`, `registrarVentaPOS` ya **no** aplica el 19% de IVA de POS al monto que se carga a la cuenta. Se pasa el **subtotal sin gravar** a `aplicarCargoCuenta` (SPEC-09), y es la propia cuenta la que aplica su 13% de IVA de forma uniforme al recalcular — exactamente igual que a cualquier otro cargo del folio (alojamiento, servicios, etc.). Antes: subtotal $60 → 19% → $71.40 → +13% otra vez al entrar a la cuenta → $80.68 (doble impuesto). Ahora: subtotal $60 → la cuenta le aplica 13% → $67.80 (una sola vez).

**Por qué esta es la corrección correcta y no solo "quitar uno de los dos impuestos al azar":** una carga a habitación nunca crea su propio documento `sales` — se convierte en un cargo más de la cuenta del huésped. No tiene sentido que ese cargo cargue el IVA de un universo contable distinto (POS, 19%) en vez del de la cuenta a la que realmente pertenece (13%, la misma tasa que ya aplica a alojamiento y a cualquier otro cargo manual). La venta **directa** (`tipoVenta: 'directa'`) no se tocó — sigue con 19%, correcto para ese caso porque sí es su propio documento `sales` independiente.

**Archivos modificados:** `functions/src/pos/registrar-venta.ts` (lógica + comentarios explicando la corrección), `functions/src/pos/registrar-venta.emulator.test.ts` (aritmética esperada actualizada: `total` de una carga a habitación ahora refleja el 13%, no el 19%+13%).

**Pruebas:** 85/85 tests en verde contra el emulador (incluye el caso corregido) + 49 offline sin cambios.

**Nota para Angular:** `POSService.createSale`/`pos.component.ts` no necesitaron ningún cambio — ya delegaban completamente en `registrarVentaPOS` y usan el `total` que la Function devuelve, así que el fix es transparente para el cliente.
