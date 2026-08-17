import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../shared/auth-context';
import { LH_CODES, withLhCode } from '../shared/errors';
import { validarDisponibilidad } from './availability';
import { calcularPrecioReserva } from '../shared/pricing';
import { getNextSequence } from '../shared/counters';

/**
 * SPEC-05 — `crearReserva` centralizada.
 *
 * Reemplaza (cuando Angular se adapte, Task 05.3 — todavía no hecho) la lógica hoy en
 * `BookingService.createBooking` (`booking.service.ts:42-108`), que valida
 * disponibilidad/capacidad, calcula precio y escribe SIN transacción — dos usuarios
 * pueden pasar la validación para las mismas fechas antes de que ninguno escriba.
 *
 * Contrato confirmado contra el código real (Task 05.1), no asumido:
 * `CreateBookingDto` real (`booking.model.ts:52-62`) usa `adults`+`children` por
 * separado (no un `totalGuests` combinado como sugería el texto del Spec) y tiene
 * `source: string` requerido (viene de `ParametersService.getOptions('reservationSources')`,
 * una lista configurable — se acepta como string libre, igual que hoy) y
 * `specialRequests`/`notes` opcionales. `CrearReservaInput` replica ese DTO real.
 *
 * Roles permitidos: los mismos que hoy tienen acceso a la ruta `/bookings` en
 * `DEFAULT_ROLE_PERMISSIONS` (`role-permission.model.ts`) — receptionist, manager,
 * admin, superadmin. housekeeper y guest no pueden crear reservas, igual que hoy
 * (no tienen la ruta habilitada).
 *
 * Fuera de alcance de esta Function (se queda en Angular, no migrado en esta Spec):
 * notificar a recepcionistas tras crear la reserva — eso sigue en
 * `BookingService.createBooking` después de invocar esta Function con éxito, no es
 * parte de la escritura transaccional que este Spec centraliza.
 */

export interface CrearReservaInput {
  roomId: string;
  guestId: string;
  checkInDate: string | number;
  checkOutDate: string | number;
  adults: number;
  children: number;
  source: string;
  specialRequests?: string;
  notes?: string;
}

export interface CrearReservaResult {
  bookingId: string;
  bookingNumber: string;
  totalPrice: number;
  nights: number;
  status: 'pending';
}

function parseDate(value: string | number, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpsError('invalid-argument', `${field} inválida`, withLhCode(LH_CODES.VALIDATION_INVALID_DATES));
  }
  return date;
}

export const crearReserva = onCall(async (request) => {
  const caller = await requireRole(request.auth, ['receptionist', 'manager', 'admin', 'superadmin']);

  const input = request.data as CrearReservaInput;

  if (!input?.roomId || !input?.guestId || !input?.checkInDate || !input?.checkOutDate || !input?.source) {
    throw new HttpsError(
      'invalid-argument',
      'roomId, guestId, checkInDate, checkOutDate y source son requeridos',
      withLhCode(LH_CODES.VALIDATION_INVALID_DATES)
    );
  }

  const checkInDate = parseDate(input.checkInDate, 'checkInDate');
  const checkOutDate = parseDate(input.checkOutDate, 'checkOutDate');

  if (checkOutDate <= checkInDate) {
    throw new HttpsError(
      'invalid-argument',
      'checkOutDate debe ser posterior a checkInDate',
      withLhCode(LH_CODES.VALIDATION_INVALID_DATES)
    );
  }

  const adults = input.adults ?? 0;
  const children = input.children ?? 0;
  const totalGuests = adults + children;

  if (totalGuests < 1) {
    throw new HttpsError(
      'invalid-argument',
      'Debe haber al menos un huésped',
      withLhCode(LH_CODES.VALIDATION_INVALID_GUESTS)
    );
  }

  const result = await admin.firestore().runTransaction(async (tx) => {
    const roomRef = admin.firestore().collection('rooms').doc(input.roomId);
    const guestRef = admin.firestore().collection('guests').doc(input.guestId);

    // tx.getAll(...) en vez de Promise.all([tx.get(a), tx.get(b)]) — llamar tx.get()
    // concurrentemente sobre la misma transacción es un antipatrón conocido de
    // Firestore (aunque no resultó ser la causa de un problema de concurrencia real
    // que se investigó aquí — ver SPEC-05, hallazgo sobre pending-vs-pending).
    const [roomSnap, guestSnap] = await tx.getAll(roomRef, guestRef);

    if (!roomSnap.exists) {
      throw new HttpsError('not-found', 'La habitación no existe', withLhCode(LH_CODES.BOOKING_ROOM_NOT_FOUND));
    }
    const room = roomSnap.data()!;

    if (room.isActive !== true) {
      throw new HttpsError(
        'failed-precondition',
        'La habitación no está activa',
        withLhCode(LH_CODES.BOOKING_ROOM_INACTIVE)
      );
    }

    if (!guestSnap.exists) {
      throw new HttpsError('not-found', 'El huésped no existe', withLhCode(LH_CODES.BOOKING_GUEST_NOT_FOUND));
    }
    const guest = guestSnap.data()!;

    if (totalGuests > room.capacity) {
      throw new HttpsError(
        'failed-precondition',
        `La habitación solo tiene capacidad para ${room.capacity} personas`,
        withLhCode(LH_CODES.BOOKING_CAPACITY_EXCEEDED)
      );
    }

    const disponibilidad = await validarDisponibilidad(tx, input.roomId, checkInDate, checkOutDate);
    if (!disponibilidad.disponible) {
      throw new HttpsError('failed-precondition', 'La habitación no está disponible para las fechas seleccionadas', {
        ...withLhCode(LH_CODES.BOOKING_NOT_AVAILABLE),
        conflictos: disponibilidad.conflictos,
      });
    }

    const { nights, totalPrice } = calcularPrecioReserva(room.basePrice, checkInDate, checkOutDate);
    const { numero: bookingNumber } = await getNextSequence(tx, 'booking', checkInDate);

    const bookingRef = admin.firestore().collection('bookings').doc();
    tx.set(bookingRef, {
      bookingNumber,
      guestId: input.guestId,
      guestName: `${guest.firstName} ${guest.lastName}`,
      guestEmail: guest.email,
      guestPhone: guest.phone,
      roomId: input.roomId,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      checkInDate,
      checkOutDate,
      nights,
      adults,
      children,
      basePrice: room.basePrice,
      totalPrice,
      status: 'pending',
      source: input.source,
      // Angular nunca envía undefined para estos campos (el formulario los
      // defaultea a '', ver booking-create-update.component.ts:75-76) — se replica
      // ese default aquí porque Firestore rechaza escribir valores `undefined`.
      specialRequests: input.specialRequests ?? '',
      notes: input.notes ?? '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: caller.uid,
    });

    return { bookingId: bookingRef.id, bookingNumber, totalPrice, nights };
  });

  return { ...result, status: 'pending' } as CrearReservaResult;
});
