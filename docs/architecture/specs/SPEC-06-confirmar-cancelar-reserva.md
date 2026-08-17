# SPEC-06 — `confirmarReserva` / `cancelarReserva`

**Estado:** PENDING

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
- **Estado:** PENDING

### Task 06.2 — Implementar `confirmarReserva` y `cancelarReserva`
- **Archivos afectados:** nuevo `functions/src/bookings/confirmar-cancelar.ts`.
- **Dependencias:** SPEC-05, Task 06.1.
- **Validación:** tests en emulador.
- **Estado:** PENDING

### Task 06.3 — Adaptar `BookingService` en Angular
- **Archivos afectados:** `src/app/core/services/booking.service.ts`.
- **Dependencias:** Task 06.2.
- **Validación:** `ng build`; regresión manual en bookings/calendar.
- **Riesgos de regresión:** medio.
- **Estado:** PENDING

### Task 06.4 — Regresión manual y aprobación del usuario
- **Dependencias:** Task 06.3.
- **Validación:** aprobación explícita.
- **Estado:** PENDING

### Task 06.5 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 06.4 VERIFIED.
- **Estado:** PENDING
