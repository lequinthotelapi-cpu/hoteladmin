// Test de concurrencia REAL contra el emulador de Firestore (criterio de aceptación
// de SPEC-04: "dos llamadas simultáneas para el mismo roomId y fechas solapadas →
// solo una tiene éxito"). `crearReserva` (Spec 05) todavía no existe, así que este
// test simula exactamente el patrón que Spec 05 deberá seguir: validar+escribir
// DENTRO de la misma transacción, para que la propia atomicidad de Firestore evite
// el overbooking.
//
// Correr con: firebase emulators:exec --only firestore "npm run test:concurrency"
// (desde functions/). No forma parte del `npm test` por defecto (offline).

import * as admin from 'firebase-admin';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido — este test debe correr dentro de ' +
      '`firebase emulators:exec --only firestore "npm run test:concurrency"`, no con `npm test` directo.'
  );
}

admin.initializeApp({ projectId: 'lequinthotel-availability-test' });

import { validarDisponibilidad } from './availability';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

async function intentarCrearReserva(roomId: string, checkIn: Date, checkOut: Date) {
  return admin.firestore().runTransaction(async (tx) => {
    const result = await validarDisponibilidad(tx, roomId, checkIn, checkOut);
    if (!result.disponible) {
      throw new Error(`CONFLICT:${result.motivo}`);
    }

    const bookingRef = admin.firestore().collection('bookings').doc();
    tx.set(bookingRef, {
      roomId,
      status: 'confirmed',
      checkInDate: checkIn,
      checkOutDate: checkOut,
    });

    return bookingRef.id;
  });
}

describe('validarDisponibilidad — concurrencia real (Firestore emulator)', () => {
  it('dos intentos simultáneos de reservar las mismas fechas en la misma habitación: solo uno tiene éxito', async () => {
    await admin.firestore().collection('rooms').doc('room-concurrency-1').set({ isActive: true });

    const checkIn = new Date(2026, 8, 1);
    const checkOut = new Date(2026, 8, 5);

    const results = await Promise.allSettled([
      intentarCrearReserva('room-concurrency-1', checkIn, checkOut),
      intentarCrearReserva('room-concurrency-1', checkIn, checkOut),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toBe('CONFLICT:overlap');

    const snapshot = await admin.firestore().collection('bookings').where('roomId', '==', 'room-concurrency-1').get();
    expect(snapshot.size).toBe(1);
  });

  it('dos intentos simultáneos en fechas NO solapadas: ambos tienen éxito', async () => {
    await admin.firestore().collection('rooms').doc('room-concurrency-2').set({ isActive: true });

    const results = await Promise.allSettled([
      intentarCrearReserva('room-concurrency-2', new Date(2026, 8, 1), new Date(2026, 8, 5)),
      intentarCrearReserva('room-concurrency-2', new Date(2026, 8, 10), new Date(2026, 8, 15)),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
  });
});
