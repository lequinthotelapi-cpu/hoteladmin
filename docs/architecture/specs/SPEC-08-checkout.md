# SPEC-08 — `registrarCheckOut` transaccional

**Estado:** IN PROGRESS (2026-08-17) — Tasks 08.1-08.3 completadas (Function transaccional implementada, 43 tests en verde contra el emulador real; `BookingService.checkOut` ya la consume). Tasks 08.4/08.5 pendientes de que el usuario despliegue y confirme en producción.

## Objetivo
Centralizar el check-out (reserva `checked-in` → habitación `dirty`, reserva `checked-out`) en una Function transaccional, y resolver la pregunta abierta sobre si debe disparar automáticamente una tarea de housekeeping.

## Problema actual
Flujo hoy no transaccional en `BookingService.checkOut` (`booking.service.ts:200-215`). Además, `HousekeepingService.createTaskFromCheckout` existe pero no se encontró invocada desde el checkout real — no se debe asumir que hay que "conectarla" sin confirmar con el usuario si es intencional que hoy sea manual.

## Comportamiento actual que debemos preservar
- Solo reservas `checked-in` pueden hacer checkout.
- Habitación pasa a `dirty` (no `cleaning`).
- Guest Account permanece abierta hasta cierre manual (no se cierra automáticamente en checkout).

## Comportamiento esperado
Callable `registrarCheckOut({bookingId})`, transaccional:
1. Valida `status === 'checked-in'`.
2. Actualiza habitación a `dirty`.
3. Actualiza reserva a `checked-out`.
4. **Pendiente de decisión (Task 08.1):** ¿crear automáticamente una tarea de housekeeping (`createTaskFromCheckout`) dentro de esta misma transacción, o dejarlo fuera exactamente como hoy?

## Reglas de negocio
Ver arriba; no se cierra la Guest Account automáticamente.

## Datos de entrada
`{ bookingId: string }`.

## Datos de salida
`{ booking: BookingActualizado; room: RoomActualizada; housekeepingTaskId?: string }`.

## Validaciones
`status === 'checked-in'`.

## Permisos/autorización
Rol `receptionist` o superior, a confirmar.

## Firestore collections/documents involucrados
`bookings`, `rooms`, opcionalmente `housekeepingTasks` (según Task 08.1).

## Firebase Functions/API involucradas
`registrarCheckOut` (nueva).

## Dependencias
SPEC-07 (mismo módulo).

## Impacto en Angular
`BookingService.checkOut` pasa a invocar la callable.

## Impacto potencial en Flutter
No auditado.

## Impacto potencial en n8n/agente IA
Caso de uso futuro natural, no conectado en esta Spec.

## Criterios de aceptación
- Checkout de una reserva no `checked-in` se rechaza.
- Habitación queda en `dirty`, nunca `cleaning`, salvo que el usuario confirme lo contrario en Task 08.1.
- Guest Account no se toca en este flujo.

## Estrategia de pruebas
1. Tests en emulador: caso feliz, transición inválida.
2. Regresión manual en el flujo real de checkout.
3. Si Task 08.1 decide conectar housekeeping automático: prueba adicional de que la tarea se crea con los mismos datos que produciría `createTaskFromCheckout` hoy si se llamara manualmente.

## Riesgos de regresión
Alto — igual naturaleza que check-in, flujo diario crítico.

---

## Tasks

### Task 08.1 — Decidir si se conecta `createTaskFromCheckout` automáticamente
- **Objetivo:** confirmar con el usuario si el gap detectado es intencional (tarea manual) o un bug a corregir como parte de esta migración.
- **Dependencias:** ninguna.
- **Validación:** decisión documentada del usuario.
- **Estado:** DECIDED (2026-08-17)
  - **Hallazgo confirmado contra el código real:** `HousekeepingService.createTaskFromCheckout` (`housekeeping.service.ts:109-132`) existe pero no tiene **ningún caller** en todo `src/` (confirmado con `grep`) — es código muerto. Además es inconsistente con el checkout real: deja la habitación en `cleaning`, mientras que `BookingService.checkOut` (el flujo que sí corre hoy) la deja en `dirty`.
  - **Decisión del usuario:** mantenerlo manual, tal como está hoy. `registrarCheckOut` no crea ninguna tarea de housekeeping ni toca `createTaskFromCheckout` — paridad total con el comportamiento actual.

### Task 08.2 — Implementar `registrarCheckOut` transaccional
- **Archivos afectados:** nuevo `functions/src/bookings/checkout.ts`.
- **Dependencias:** SPEC-07, Task 08.1.
- **Validación:** tests en emulador.
- **Estado:** COMPLETED (2026-08-17)
  - Transacción simple: valida reserva `checked-in` + habitación existe, actualiza habitación a `dirty` y reserva a `checked-out`. Guest Account no se toca (permanece abierta, igual que hoy).
  - Código de error nuevo: `LH-0410` (reserva no checked-in).
  - **7 tests contra el emulador real**: sin auth, sin rol, sin bookingId, reserva inexistente, reserva no checked-in, caso feliz (habitación en `dirty`, nunca `cleaning`), y una prueba explícita de que no se crea ninguna tarea de housekeeping. Total `functions/`: 43 tests en verde contra el emulador (36 previos + 7 nuevos) + 49 offline sin cambios. No se agregó un test de concurrencia dedicado — la garantía atómica de Firestore ya se probó repetidamente en Specs 04/05/07 con el mismo mecanismo (`runTransaction`), y este Spec no exige uno explícitamente en su estrategia de pruebas.

### Task 08.3 — Adaptar `BookingService.checkOut` en Angular
- **Archivos afectados:** `src/app/core/services/booking.service.ts`.
- **Dependencias:** Task 08.2.
- **Validación:** `ng build`; regresión manual.
- **Riesgos de regresión:** alto.
- **Estado:** COMPLETED a nivel de código (2026-08-17) — `checkOut` mantiene su firma pública, ahora llama `httpsCallable(functions, 'registrarCheckOut')`. `ng build --configuration production` limpio. Regresión manual en UI real: **pendiente** (Task 08.4).

### Task 08.4 — Regresión manual y aprobación del usuario
- **Dependencias:** Task 08.3.
- **Estado:** PENDING — requiere que el usuario despliegue `registrarCheckOut` y pruebe un check-out real.

### Task 08.5 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 08.4 VERIFIED.
- **Estado:** PENDING
