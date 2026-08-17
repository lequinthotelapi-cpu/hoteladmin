import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../shared/auth-context';
import { LH_CODES, withLhCode } from '../shared/errors';
import { calcularPrecioReserva, calcularTotalesConImpuesto } from '../shared/pricing';

/**
 * SPEC-07 — `registrarCheckIn` transaccional.
 *
 * Centraliza en una sola transacción lo que hoy `BookingService.checkIn`
 * (`booking.service.ts:170-192`) hace con 3 escrituras independientes sin
 * transacción (Guest Account, Room, Booking) — si la segunda o tercera
 * fallaban, quedaba estado a medias.
 *
 * Réplica exacta del cargo de alojamiento de `GuestAccountService.
 * createAccountFromBooking` (`guest-account.service.ts:40-83`): mismas
 * noches (vía `calcularPrecioReserva`, SPEC-03), mismo 13% de IVA (vía
 * `calcularTotalesConImpuesto`), misma verificación de idempotencia (si ya
 * existe una Guest Account para esta reserva, no crea otra — replicado con
 * `getByBooking`).
 *
 * Decisión del usuario (Task 07.1): a diferencia del código actual, que NO
 * valida el estado de la habitación antes del check-in, esta Function SÍ
 * exige `room.status === 'available'` — cierra un gap real que coincide con
 * la regla de negocio ya documentada (CLAUDE.md: "room must be available").
 * Nota: `'reserved'` nunca es un valor realmente persistido en
 * `rooms/{id}.status` — es un estado puramente visual/computado en el
 * cliente a partir de las reservas (confirmado: no hay ningún
 * `status: 'reserved'` en el código de escritura de habitaciones), así que
 * solo se valida contra `available`.
 */

const READY_FOR_CHECKIN_ROOM_STATUS = 'available';

function toDate(value: unknown): Date {
  if (value instanceof admin.firestore.Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

export const registrarCheckIn = onCall(async (request) => {
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

    if (booking.status !== 'confirmed') {
      throw new HttpsError(
        'failed-precondition',
        'Solo se puede hacer check-in a reservas confirmadas',
        withLhCode(LH_CODES.BOOKING_NOT_CONFIRMED)
      );
    }

    const roomRef = admin.firestore().collection('rooms').doc(booking.roomId);
    const roomSnap = await tx.get(roomRef);
    if (!roomSnap.exists) {
      throw new HttpsError('not-found', 'La habitación no existe', withLhCode(LH_CODES.BOOKING_ROOM_NOT_FOUND));
    }
    const room = roomSnap.data()!;

    if (room.status !== READY_FOR_CHECKIN_ROOM_STATUS) {
      throw new HttpsError(
        'failed-precondition',
        `La habitación no está lista para check-in (estado actual: ${room.status})`,
        withLhCode(LH_CODES.ROOM_NOT_READY_FOR_CHECKIN)
      );
    }

    const existingAccountsSnap = await tx.get(
      admin.firestore().collection('guestAccounts').where('bookingId', '==', bookingId).limit(1)
    );

    let guestAccountId: string;

    if (!existingAccountsSnap.empty) {
      guestAccountId = existingAccountsSnap.docs[0].id;
    } else {
      const checkInDate = toDate(booking.checkInDate);
      const checkOutDate = toDate(booking.checkOutDate);
      const { nights, totalPrice: accommodationSubtotal } = calcularPrecioReserva(
        booking.basePrice,
        checkInDate,
        checkOutDate
      );
      const { subtotal, tax, total } = calcularTotalesConImpuesto(accommodationSubtotal);

      // date/createdAt del cargo usan new Date() (no serverTimestamp()) porque
      // Firestore no soporta FieldValue.serverTimestamp() dentro de un array
      // — igual que el código actual, que también usa `new Date()` aquí.
      const accommodationCharge = {
        accountId: '',
        type: 'accommodation',
        description: `Alojamiento - ${nights} noche(s)`,
        amount: booking.basePrice,
        quantity: nights,
        total: accommodationSubtotal,
        date: new Date(),
        createdBy: caller.uid,
        createdAt: new Date(),
      };

      const accountRef = admin.firestore().collection('guestAccounts').doc();
      tx.set(accountRef, {
        bookingId,
        bookingNumber: booking.bookingNumber,
        guestId: booking.guestId,
        guestName: booking.guestName,
        roomId: booking.roomId,
        roomNumber: booking.roomNumber,
        status: 'open',
        checkInDate: booking.checkInDate,
        charges: [accommodationCharge],
        payments: [],
        subtotal,
        tax,
        total,
        paid: 0,
        balance: total,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: caller.uid,
      });
      guestAccountId = accountRef.id;
    }

    tx.update(roomRef, { status: 'occupied' });
    tx.update(bookingRef, {
      status: 'checked-in',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: caller.uid,
    });

    return { guestAccountId, bookingId, roomId: booking.roomId };
  });
});
