# SPEC-09 — Cargos, pagos y cierre de Guest Account

**Estado:** IN PROGRESS (2026-08-17) — Tasks 09.1-09.3 completadas (3 Functions transaccionales implementadas, 55 tests en verde contra el emulador real incluyendo concurrencia; `GuestAccountService` ya las consume, cubriendo también el camino POS sin tocar `pos.component.ts`). Tasks 09.4/09.5 pendientes de que el usuario despliegue y confirme en producción.

## Objetivo
Centralizar `addCharge`, `addPayment` y `closeAccount` de `GuestAccountService` en Cloud Functions transaccionales, cerrando el riesgo de condición de carrera (arrays completos sobrescritos) y el riesgo de seguridad de que hoy cualquier autenticado pueda escribir `balance: 0` directo en Firestore.

## Problema actual
`guest-account.service.ts:86-193`: lectura del documento completo → mutación del array `charges[]`/`payments[]` en memoria → sobrescritura completa, sin transacción ni `arrayUnion`. Dos cargos/pagos simultáneos pueden perderse (el segundo sobrescribe basado en una lectura desactualizada).

## Comportamiento actual que debemos preservar
- Solo cuentas `open` aceptan cargos/pagos.
- IVA 13% (vía Spec 03).
- Pago no puede exceder el saldo pendiente.
- Cierre solo permitido con `balance === 0`.

## Comportamiento esperado
Tres callables transaccionales: `agregarCargoCuenta`, `agregarPagoCuenta`, `cerrarCuenta`, usando `arrayUnion`/transacción para evitar pérdida de escrituras concurrentes, y reutilizando `calcularTotalesConImpuesto` (Spec 03).

## Reglas de negocio
Ver arriba, sección B.2 del análisis.

## Datos de entrada
`agregarCargoCuenta({accountId, tipo, descripcion, monto, cantidad})`; `agregarPagoCuenta({accountId, monto, metodoPago})`; `cerrarCuenta({accountId})`.

## Datos de salida
Cuenta actualizada con totales recalculados.

## Validaciones
Cuenta `open` (para cargo/pago); pago `<= balance` pendiente; `balance === 0` para cerrar.

## Permisos/autorización
Rol `receptionist` o superior, a confirmar.

## Firestore collections/documents involucrados
`guestAccounts`.

## Firebase Functions/API involucradas
Nuevas: `agregarCargoCuenta`, `agregarPagoCuenta`, `cerrarCuenta`. Reutiliza Spec 03.

## Dependencias
SPEC-03, SPEC-07 (la cuenta se crea en check-in).

## Impacto en Angular
`GuestAccountService.addCharge/addPayment/closeAccount` pasan a invocar las callables. Componentes: detalle de Guest Account, dialogs de agregar cargo/pago, integración POS (venta "a la habitación" agrega un cargo — verificar que ese camino también pase por la nueva Function, no solo el dialog manual).

## Impacto potencial en Flutter
No auditado.

## Impacto potencial en n8n/agente IA
Caso de uso futuro ("agrega un cargo de $50 a la cuenta de la 205"), no conectado en esta Spec.

## Criterios de aceptación
- Dos cargos simultáneos a la misma cuenta no se pierden entre sí (test de concurrencia).
- Un pago que excede el saldo se rechaza.
- Una cuenta con saldo pendiente no puede cerrarse.
- El flujo POS "cargar a habitación" sigue funcionando igual.

## Estrategia de pruebas
1. Tests en emulador incluyendo concurrencia (dos cargos simultáneos).
2. Regresión manual: detalle de cuenta, dialogs de cargo/pago, cierre de cuenta, venta POS cargada a habitación.
3. Verificar `InvoiceService` (Spec 10 depende de esto) sigue pudiendo leer `charges[]` con el mismo formato.

## Riesgos de regresión
Alto — maneja dinero real y es la base de la facturación (Spec 10).

---

## Tasks

### Task 09.1 — Confirmar el camino "cargar venta POS a la habitación" y sus consumidores exactos
- **Objetivo:** no romper la integración POS→Guest Account.
- **Dependencias:** ninguna.
- **Validación:** documentado antes de implementar.
- **Estado:** COMPLETED (2026-08-17)
  - **Confirmado contra el código real:** `pos.component.ts:208-213` (flujo "cargar a habitación") llama a `GuestAccountService.addCharge(...)` — el mismo método que usa el diálogo manual de cargos. No hay un camino separado ni una Function/API distinta para POS. Adaptar `addCharge` (Task 09.3) cubre automáticamente el flujo POS sin tocar `pos.component.ts`.
  - **Hallazgo adicional:** `GuestAccountService.removeCharge` no tiene ningún caller en la UI (código muerto) — no está en el alcance del Spec (no se menciona en "Comportamiento esperado"), así que no se centralizó.

### Task 09.2 — Implementar `agregarCargoCuenta`, `agregarPagoCuenta`, `cerrarCuenta`
- **Archivos afectados:** nuevo `functions/src/guest-accounts/`.
- **Dependencias:** SPEC-03, SPEC-07, Task 09.1.
- **Validación:** tests en emulador + concurrencia.
- **Estado:** COMPLETED (2026-08-17)
  - Las 3 Functions (`functions/src/guest-accounts/cargos-pagos.ts`) usan `runTransaction` (read-modify-write con reintento automático en conflicto) en vez de `arrayUnion` — evita perder cargos/pagos concurrentes igual que `arrayUnion` lo haría, pero permite calcular `total`/`quantity` del cargo y recalcular subtotal/tax/total/paid/balance en la misma operación atómica. Réplica bit a bit de `GuestAccountService.calculateTotals` (13% IVA vía `calcularTotalesConImpuesto`, SPEC-03).
  - `agregarPagoCuenta` valida el monto contra el campo `balance` **almacenado** (no recalculado), igual que el código actual.
  - Códigos de error nuevos: `LH-0303/0304` (validación), `LH-0411..0415` (negocio).
  - **19 tests en verde contra el emulador real**: 12 comportamiento (sin auth/rol/datos, cuenta inexistente/cerrada, pago excede saldo, cierre con saldo pendiente, cierre ya-cerrada, y 3 casos felices verificando aritmética exacta) + **1 test de concurrencia real** que satisface el criterio de aceptación explícito del Spec: 10 cargos simultáneos a la misma cuenta → ningún cargo se pierde, subtotal final es la suma exacta de los 10. Total `functions/`: 55 tests en verde contra el emulador + 49 offline.
  - **Bug encontrado y corregido durante esta Task — en el propio test, no en el código:** un test inicial sembraba `total`/`balance` sin cargos reales de respaldo en el array `charges`; como la Function siempre recalcula desde `charges[]` (nunca confía en un total viejo), el test fallaba con una expectativa matemáticamente inconsistente. Corregido sembrando un cargo real. Esto confirma que la Function recalcula correctamente desde la fuente de verdad, tal como se pretendía.

### Task 09.3 — Adaptar `GuestAccountService` en Angular
- **Archivos afectados:** `src/app/core/services/guest-account.service.ts`.
- **Dependencias:** Task 09.2.
- **Validación:** `ng build`; regresión manual completa (incluye POS).
- **Riesgos de regresión:** alto.
- **Estado:** COMPLETED a nivel de código (2026-08-17) — `addCharge`/`addPayment`/`closeAccount` mantienen su firma pública exacta, ahora llaman a las Functions vía `httpsCallable`. `createAccountFromBooking`, `removeCharge` y `calculateTotals` (privado) no se tocaron — fuera de alcance (el primero ya lo reemplaza `registrarCheckIn` de SPEC-07 para el flujo real de check-in; los otros dos son código muerto/interno sin caller externo). `ng build --configuration production` limpio. Regresión manual (incluyendo POS): **pendiente** (Task 09.4).

### Task 09.4 — Regresión manual y aprobación del usuario
- **Dependencias:** Task 09.3.
- **Estado:** PENDING — requiere que el usuario despliegue estas 3 Functions y pruebe: agregar cargo manual, agregar cargo vía POS "cargar a habitación", agregar pago, cerrar cuenta.

### Task 09.5 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 09.4 VERIFIED.
- **Estado:** PENDING
