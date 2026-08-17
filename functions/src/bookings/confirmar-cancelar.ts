import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../shared/auth-context';
import { LH_CODES, withLhCode } from '../shared/errors';

/**
 * SPEC-06 — `confirmarReserva` / `cancelarReserva`.
 *
 * Mismos roles que `crearReserva` (SPEC-05): receptionist, manager, admin,
 * superadmin — los mismos que hoy tienen acceso a la ruta `/bookings`.
 *
 * Hallazgos contra el código real (Task 06.1), no asumidos:
 * - No existe ninguna notificación al confirmar/cancelar hoy —
 *   `NotificationService` solo tiene `notifyNewBooking`/`notifyCheckIn`/
 *   `notifyCheckOut`/etc., ninguna para confirmar/cancelar. Nada que replicar.
 * - `BookingService.confirmBooking` (booking.service.ts:142-147) hoy NO
 *   valida que la reserva esté en `pending` antes de confirmar — escribe
 *   `status: 'confirmed'` sin condición. Esta Function SÍ lo valida, tal
 *   como pide el "Comportamiento esperado" del Spec — más estricta que hoy,
 *   sin consumidor todavía (Task 06.3 no implementada), cero riesgo actual.
 * - `BookingService.cancelBooking` (booking.service.ts:149-160) hoy solo
 *   rechaza `checked-in`, NO rechaza `checked-out` (aunque el botón "Cancelar"
 *   de la UI ya se oculta para `checked-out`, ver `bookings-list.component.html`
 *   y `calendar-event-detail.component.html`). Esta Function rechaza ambos,
 *   tal como pide la sección "Reglas de negocio" del Spec.
 */

async function getBookingOrThrow(tx: admin.firestore.Transaction, bookingId: string) {
  const ref = admin.firestore().collection('bookings').doc(bookingId);
  const snap = await tx.get(ref);
  if (!snap.exists) {
    throw new HttpsError('not-found', 'La reserva no existe', withLhCode(LH_CODES.BOOKING_NOT_FOUND));
  }
  return { ref, data: snap.data()! };
}

export const confirmarReserva = onCall(async (request) => {
  const caller = await requireRole(request.auth, ['receptionist', 'manager', 'admin', 'superadmin']);

  const bookingId = request.data?.bookingId;
  if (!bookingId) {
    throw new HttpsError(
      'invalid-argument',
      'bookingId es requerido',
      withLhCode(LH_CODES.VALIDATION_MISSING_BOOKING_ID)
    );
  }

  return admin.firestore().runTransaction(async (tx) => {
    const { ref, data } = await getBookingOrThrow(tx, bookingId);

    if (data.status !== 'pending') {
      throw new HttpsError(
        'failed-precondition',
        'Solo se puede confirmar una reserva pendiente',
        withLhCode(LH_CODES.BOOKING_NOT_PENDING)
      );
    }

    tx.update(ref, {
      status: 'confirmed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: caller.uid,
    });

    return { bookingId, status: 'confirmed' as const };
  });
});

export const cancelarReserva = onCall(async (request) => {
  const caller = await requireRole(request.auth, ['receptionist', 'manager', 'admin', 'superadmin']);

  const bookingId = request.data?.bookingId;
  const motivo = request.data?.motivo as string | undefined;
  if (!bookingId) {
    throw new HttpsError(
      'invalid-argument',
      'bookingId es requerido',
      withLhCode(LH_CODES.VALIDATION_MISSING_BOOKING_ID)
    );
  }

  return admin.firestore().runTransaction(async (tx) => {
    const { ref, data } = await getBookingOrThrow(tx, bookingId);

    if (data.status === 'checked-in') {
      throw new HttpsError(
        'failed-precondition',
        'No se puede cancelar una reserva con check-in realizado',
        withLhCode(LH_CODES.BOOKING_NOT_CANCELLABLE)
      );
    }
    if (data.status === 'checked-out') {
      throw new HttpsError(
        'failed-precondition',
        'No se puede cancelar una reserva con check-out realizado',
        withLhCode(LH_CODES.BOOKING_NOT_CANCELLABLE)
      );
    }

    tx.update(ref, {
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: caller.uid,
      ...(motivo ? { cancellationReason: motivo } : {}),
    });

    return { bookingId, status: 'cancelled' as const };
  });
});
