import * as admin from 'firebase-admin';

/**
 * SPEC-04 — Validación server-side de disponibilidad.
 *
 * Debe llamarse DENTRO de la misma transacción de Firestore que luego escribe la
 * reserva (ver Spec 05, `crearReserva`) — recibe la `Transaction` activa `tx` en vez
 * de abrir su propia transacción, para no dejar una ventana de carrera entre
 * "validar" y "escribir".
 *
 * Réplica del cálculo real (no de la documentación): fórmula de solapamiento y
 * filtro de estados idénticos a `BookingFirebaseRepository.getOverlappingBookings`
 * (`booking-firebase.repository.ts:154-185`) y `BookingService.checkRoomAvailability`
 * (`booking.service.ts:303-316`) — solo bloquean reservas `confirmed`/`checked-in`.
 *
 * Diferencia deliberada con el código actual de Angular: esta función SÍ valida que
 * la habitación exista y esté `isActive` (tal como pide la sección "Validaciones" de
 * SPEC-04), algo que `BookingService.createBooking` hoy NO comprueba en ningún punto
 * (solo se filtra `isActive` en `searchAvailableRooms`, que es una búsqueda de solo
 * lectura, no en la creación). Es una validación nueva, más estricta que la actual —
 * sin consumidor todavía, así que no cambia nada en producción hasta que Spec 05
 * decida explícitamente adoptar este comportamiento.
 */

const BLOCKING_STATUSES = ['confirmed', 'checked-in'];

export interface BookingConflict {
  bookingId: string;
  bookingNumber?: string;
  checkInDate: Date;
  checkOutDate: Date;
  status: string;
}

export type DisponibilidadMotivo = 'room-not-found' | 'room-inactive' | 'overlap';

export interface DisponibilidadResult {
  disponible: boolean;
  motivo?: DisponibilidadMotivo;
  conflictos?: BookingConflict[];
}

function toDate(value: unknown): Date {
  if (value instanceof admin.firestore.Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string);
}

export async function validarDisponibilidad(
  tx: admin.firestore.Transaction,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<DisponibilidadResult> {
  const roomRef = admin.firestore().collection('rooms').doc(roomId);
  const roomSnap = await tx.get(roomRef);

  if (!roomSnap.exists) {
    return { disponible: false, motivo: 'room-not-found' };
  }
  if (roomSnap.data()?.isActive === false) {
    return { disponible: false, motivo: 'room-inactive' };
  }

  const bookingsQuery = admin.firestore().collection('bookings').where('roomId', '==', roomId);
  const bookingsSnap = await tx.get(bookingsQuery);

  const conflictos: BookingConflict[] = [];

  bookingsSnap.forEach((doc) => {
    if (excludeBookingId && doc.id === excludeBookingId) return;

    const data = doc.data();
    if (!BLOCKING_STATUSES.includes(data.status)) return;

    const existingCheckIn = toDate(data.checkInDate);
    const existingCheckOut = toDate(data.checkOutDate);

    // Idéntico a booking-firebase.repository.ts:182-183.
    const overlaps = checkIn < existingCheckOut && checkOut > existingCheckIn;
    if (overlaps) {
      conflictos.push({
        bookingId: doc.id,
        bookingNumber: data.bookingNumber,
        checkInDate: existingCheckIn,
        checkOutDate: existingCheckOut,
        status: data.status,
      });
    }
  });

  if (conflictos.length > 0) {
    return { disponible: false, motivo: 'overlap', conflictos };
  }

  return { disponible: true };
}
