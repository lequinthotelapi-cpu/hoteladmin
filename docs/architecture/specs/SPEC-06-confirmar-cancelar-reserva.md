# SPEC-06 — `confirmarReserva` / `cancelarReserva`

**Estado:** IN PROGRESS (2026-08-17) — Tasks 06.1/06.2/06.3 completadas (Functions implementadas, 27 tests en verde contra el emulador real, `BookingService` ya las consume). Tasks 06.4/06.5 pendientes de que el usuario despliegue y confirme en producción, igual que en SPEC-05 (no puedo desplegar Functions yo mismo — sin credenciales de Firebase en este entorno).

## Objetivo
Centralizar las transiciones de estado `pending → confirmed` y `* → cancelled`, hoy realizadas por escritura directa a Firestore desde `BookingService`, replicando la restricción actual de que no se puede cancelar una reserva `checked-in`.

## Problema actual
`booking.service.ts:156-167` (`cancelBooking`) y el método equivalente de confirmación validan en cliente; las rules actuales permiten `update` de `bookings` a cualquier autenticado sin verificar la transición (se podría poner `status:'checked-in'` sin pasar por check-in real).

## Comportamiento actual que debemos preservar
- `cancelBooking` prohíbe cancelar si `status === 'checked-in'`.
- Confirmar solo tiene sentido desde `pending`.
- Ninguna de las dos operaciones cambia el estado físico de la habitación (regla ya confirmada en el análisis).
- Notificación a recepcionistas al crear reserva (trigger ya documentado en `CONTEXTO.md`/`NOTIFICACIONES.md`) — **confirmar si aplica también a confirmar/cancelar antes de asumir que hay que replicarla aquí**.

## Comportamiento esperado
Dos callables: `confirmarReserva({bookingId})` y `cancelarReserva({bookingId, motivo?})`, cada una validando la transición permitida antes de escribir.

## Reglas de negocio
- `confirmarReserva`: solo si `status === 'pending'`.
- `cancelarReserva`: rechaza si `status === 'checked-in'` o `'checked-out'`.

## Datos de entrada
`{ bookingId: string }` / `{ bookingId: string, motivo?: string }`.

## Datos de salida
`{ booking: BookingActualizado }`.

## Validaciones
Transición de estado válida (ver reglas de negocio); `bookingId` existe.

## Permisos/autorización
Igual que `crearReserva` — a confirmar contra `DEFAULT_ROLE_PERMISSIONS`.

## Firestore collections/documents involucrados
`bookings` (lectura+escritura).

## Firebase Functions/API involucradas
`confirmarReserva`, `cancelarReserva` (nuevas).

## Dependencias
SPEC-05 (misma convención, mismo módulo `functions/src/bookings/`).

## Impacto en Angular
`BookingService.confirmBooking`/`cancelBooking` pasan a invocar las callables. Componentes de `features/private/bookings` (lista) y `features/private/calendar` (dialog) que exponen los botones "Confirmar"/"Cancelar" (`BOOKING_CONFIRMATION_COMPLETE.md`) no deberían necesitar cambios de UI, solo el servicio subyacente cambia.

## Impacto potencial en Flutter
Ninguno auditado todavía.

## Impacto potencial en n8n/agente IA
El agente podría necesitar cancelar/confirmar reservas por conversación en el futuro ("cancela la reserva de Juan Pérez") — mismo patrón que `crearReserva`.

## Criterios de aceptación
- No se puede cancelar una reserva `checked-in` (rechazo con error claro).
- No se puede confirmar una reserva que no está `pending`.
- La UI de bookings/calendar sigue funcionando igual tras adaptar el servicio.

## Estrategia de pruebas
1. Tests en emulador: transición válida, transición inválida, caller sin rol.
2. Regresión manual en `features/private/bookings` y `features/private/calendar`.

## Riesgos de regresión
Medio — menos crítico que crear/check-in/check-out, pero toca un flujo usado a diario.

---

## Tasks

### Task 06.1 — Confirmar si hay notificaciones/side-effects a replicar
- **Objetivo:** verificar contra `NOTIFICACIONES.md` y el código de triggers si confirmar/cancelar dispara alguna notificación hoy.
- **Dependencias:** ninguna.
- **Validación:** hallazgo documentado antes de implementar.
- **Riesgos de regresión:** ninguno (investigación).
- **Estado:** COMPLETED (2026-08-17)
  - **Hallazgo:** no hay ninguna notificación hoy. `NotificationService` (`notification.service.ts`) solo expone `notifyNewBooking`, `notifyCheckIn`, `notifyCheckOut`, `notifyHousekeepingTask`, `notifyPaymentReceived`, `notifyLowStock` — ninguna para confirmar/cancelar reserva. Ni `BookingService.confirmBooking` ni `cancelBooking` llaman a `NotificationService` en ningún punto. Nada que replicar.
  - **Hallazgos adicionales (código real vs. texto del Spec), mismo patrón que specs anteriores:**
    - `confirmBooking` (`booking.service.ts:142-147`) hoy **no valida** que la reserva esté `pending` antes de confirmar — escribe `status: 'confirmed'` incondicionalmente. La Function implementada sí valida esto (tal como pide el Spec), siendo deliberadamente más estricta que el código actual.
    - `cancelBooking` (`booking.service.ts:149-160`) hoy solo rechaza `checked-in`, **no** rechaza `checked-out` (a pesar de que la sección "Reglas de negocio" del Spec pedía ambos). La UI ya oculta el botón "Cancelar" para `checked-out` (`bookings-list.component.html`, `calendar-event-detail.component.html`), así que agregar el rechazo server-side cierra una inconsistencia real, no introduce una restricción sorpresiva desde la perspectiva del usuario.
    - Existe además `markAsNoShow` (`booking.service.ts:162-167`), una tercera transición de estado no cubierta por este Spec (ni mencionada) — no se tocó, queda fuera de alcance.

### Task 06.2 — Implementar `confirmarReserva` y `cancelarReserva`
- **Archivos afectados:** nuevo `functions/src/bookings/confirmar-cancelar.ts`.
- **Dependencias:** SPEC-05, Task 06.1.
- **Validación:** tests en emulador.
- **Estado:** COMPLETED (2026-08-17)
  - Ambas callables usan los mismos roles que `crearReserva` (receptionist/manager/admin/superadmin). `confirmarReserva({bookingId})` valida existencia + `status === 'pending'`. `cancelarReserva({bookingId, motivo?})` valida existencia + rechaza `checked-in` y `checked-out`; si se pasa `motivo`, se guarda en un campo nuevo `cancellationReason` (aditivo, no existía en el modelo — no lo escribe si no se manda `motivo`, así que no rompe nada existente).
  - Códigos de error nuevos en `shared/errors.ts` dentro de los rangos reservados: `LH-0302` (validación), `LH-0405/0406/0407` (negocio).
  - **10 tests contra el emulador real** (`confirmar-cancelar.emulator.test.ts`): sin auth, sin rol, sin `bookingId`, reserva inexistente, confirmar una ya-confirmada (rechazado), confirmar pending (éxito), cancelar `checked-in` (rechazado), cancelar `checked-out` (rechazado), cancelar pending con motivo (éxito, guarda `cancellationReason`), cancelar confirmed sin motivo (éxito, no escribe el campo). Total en `functions/`: 27 tests en verde contra el emulador (17 previos + 10 nuevos) + 49 offline sin cambios.

### Task 06.3 — Adaptar `BookingService` en Angular
- **Archivos afectados:** `src/app/core/services/booking.service.ts`.
- **Dependencias:** Task 06.2.
- **Validación:** `ng build`; regresión manual en bookings/calendar.
- **Riesgos de regresión:** medio.
- **Estado:** COMPLETED a nivel de código (2026-08-17) — `confirmBooking`/`cancelBooking` mantienen su firma pública exacta, ahora llaman `httpsCallable(functions, 'confirmarReserva'|'cancelarReserva')` y propagan `error.message` tal cual. `userId` queda sin usar (se deriva de `request.auth`) pero se mantiene en la firma. `ng build --configuration production` limpio. Regresión manual en UI real: **pendiente** (ver Task 06.4).

### Task 06.4 — Regresión manual y aprobación del usuario
- **Dependencias:** Task 06.3.
- **Validación:** aprobación explícita.
- **Estado:** PENDING — igual que SPEC-05 Task 05.4: requiere que el usuario despliegue `confirmarReserva`/`cancelarReserva` (`firebase deploy --only functions --project lequinthotel-ca6ef`) y pruebe confirmar/cancelar una reserva real en la UI. No se puede hacer sin esa acción del usuario (sin credenciales de Firebase en este entorno).

### Task 06.5 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 06.4 VERIFIED.
- **Estado:** PENDING — no ejecutar hasta que 06.4 esté VERIFIED (principio de compatibilidad).
