// Test de concurrencia REAL de registrarCheckIn (criterio de aceptación de SPEC-07:
// "un fallo simulado a mitad de la transacción no deja estado parcial"). Dos
// llamadas simultáneas al mismo check-in prueban la garantía atómica real de
// Firestore: solo una debe tener éxito (crear 1 Guest Account, dejar la reserva en
// checked-in), la otra debe fallar limpiamente sin dejar ningún efecto parcial.
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

admin.initializeApp({ projectId: 'lequinthotel-checkin-concurrency-test' });

import { registrarCheckIn } from './checkin';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(request: any) {
  return (registrarCheckIn as any).run(request);
}

describe('registrarCheckIn — concurrencia real (Firestore emulator)', () => {
  it('dos check-ins simultáneos de la misma reserva: solo uno tiene éxito, sin estado parcial', async () => {
    await admin.firestore().collection('users').doc('caller-a').set({ role: 'receptionist' });
    await admin.firestore().collection('users').doc('caller-b').set({ role: 'receptionist' });
    await admin.firestore().collection('rooms').doc('room-concurrent-ci').set({
      roomNumber: '303',
      roomType: 'standard',
      status: 'available',
      isActive: true,
      basePrice: 120,
    });
    await admin.firestore().collection('bookings').doc('booking-concurrent-ci').set({
      bookingNumber: 'BK-TEST-concurrent',
      status: 'confirmed',
      guestId: 'guest-x',
      guestName: 'Ana Gómez',
      roomId: 'room-concurrent-ci',
      roomNumber: '303',
      basePrice: 120,
      checkInDate: new Date(2026, 9, 1),
      checkOutDate: new Date(2026, 9, 3),
    });

    const results = await Promise.allSettled([
      callRun({ data: { bookingId: 'booking-concurrent-ci' }, auth: { uid: 'caller-a' } }),
      callRun({ data: { bookingId: 'booking-concurrent-ci' }, auth: { uid: 'caller-b' } }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: 'failed-precondition' });

    // Sin estado parcial: exactamente 1 Guest Account, habitación consistentemente
    // occupied, reserva consistentemente checked-in — nunca un estado a medias.
    const accountsSnap = await admin
      .firestore()
      .collection('guestAccounts')
      .where('bookingId', '==', 'booking-concurrent-ci')
      .get();
    expect(accountsSnap.size).toBe(1);

    const room = await admin.firestore().collection('rooms').doc('room-concurrent-ci').get();
    expect(room.data()?.status).toBe('occupied');

    const booking = await admin.firestore().collection('bookings').doc('booking-concurrent-ci').get();
    expect(booking.data()?.status).toBe('checked-in');
  });
});
