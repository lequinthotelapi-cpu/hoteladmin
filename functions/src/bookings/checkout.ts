import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../shared/auth-context';
import { LH_CODES, withLhCode } from '../shared/errors';

/**
 * SPEC-08 — `registrarCheckOut` transaccional.
 *
 * Centraliza en una transacción lo que hoy `BookingService.checkOut`
 * (`booking.service.ts:183-198`) hace con 2 escrituras independientes sin
 * transacción (Room, Booking).
 *
 * Decisión del usuario (Task 08.1): NO conectar `createTaskFromCheckout`
 * automáticamente. Se confirmó que esa función existe en
 * `HousekeepingService` pero no tiene ningún caller hoy (código muerto), y
 * que además es inconsistente con el checkout real — deja la habitación en
 * `cleaning` en vez de `dirty`. Se decidió mantener el comportamiento actual
 * tal cual: la habitación queda en `dirty`, sin tarea de housekeeping
 * automática. La Guest Account no se toca en este flujo (permanece abierta
 * hasta cierre manual, igual que hoy).
 */

export const registrarCheckOut = onCall(async (request) => {
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
    const bookingRef = admin.firestore().collection('bookings').doc(bookingId);
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists) {
      throw new HttpsError('not-found', 'La reserva no existe', withLhCode(LH_CODES.BOOKING_NOT_FOUND));
    }
    const booking = bookingSnap.data()!;

    if (booking.status !== 'checked-in') {
      throw new HttpsError(
        'failed-precondition',
        'Solo se puede hacer check-out a reservas con check-in realizado',
        withLhCode(LH_CODES.BOOKING_NOT_CHECKED_IN)
      );
    }

    const roomRef = admin.firestore().collection('rooms').doc(booking.roomId);
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) {
      throw new HttpsError('not-found', 'La habitación no existe', withLhCode(LH_CODES.BOOKING_ROOM_NOT_FOUND));
    }

    tx.update(roomRef, { status: 'dirty' });
    tx.update(bookingRef, {
      status: 'checked-out',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: caller.uid,
    });

    return { bookingId, roomId: booking.roomId };
  });
});
