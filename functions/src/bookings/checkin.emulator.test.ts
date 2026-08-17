// Tests de registrarCheckIn contra el emulador real de Firestore.
// Correr con: firebase emulators:exec --only firestore "npm run test:concurrency"
// (desde functions/). No forma parte del `npm test` por defecto (offline).

import * as admin from 'firebase-admin';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido — este test debe correr dentro de ' +
      '`firebase emulators:exec --only firestore "npm run test:concurrency"`, no con `npm test` directo.'
  );
}

admin.initializeApp({ projectId: 'lequinthotel-checkin-test' });

import { registrarCheckIn } from './checkin';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(request: any) {
  return (registrarCheckIn as any).run(request);
}

async function seedRoom(id: string, status: string) {
  await admin.firestore().collection('rooms').doc(id).set({
    roomNumber: '101',
    roomType: 'standard',
    status,
    isActive: true,
    basePrice: 100,
  });
}

async function seedBooking(id: string, overrides: Record<string, unknown>) {
  await admin.firestore().collection('bookings').doc(id).set({
    bookingNumber: `BK-TEST-${id}`,
    status: 'confirmed',
    guestId: 'guest-x',
    guestName: 'Juan Pérez',
    roomId: 'room-x',
    roomNumber: '101',
    basePrice: 100,
    checkInDate: new Date(2026, 8, 1),
    checkOutDate: new Date(2026, 8, 4),
    ...overrides,
  });
}

describe('registrarCheckIn — emulador real', () => {
  it('rechaza sin auth', async () => {
    await expect(callRun({ data: { bookingId: 'x' }, auth: undefined })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('rechaza sin rol suficiente', async () => {
    await admin.firestore().collection('users').doc('caller-hk').set({ role: 'housekeeper' });
    await expect(
      callRun({ data: { bookingId: 'x' }, auth: { uid: 'caller-hk' } })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rechaza si falta bookingId', async () => {
    await admin.firestore().collection('users').doc('caller-1').set({ role: 'receptionist' });
    await expect(callRun({ data: {}, auth: { uid: 'caller-1' } })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('rechaza si la reserva no existe', async () => {
    await admin.firestore().collection('users').doc('caller-2').set({ role: 'receptionist' });
    await expect(
      callRun({ data: { bookingId: 'does-not-exist' }, auth: { uid: 'caller-2' } })
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rechaza si la reserva no está confirmed', async () => {
    await admin.firestore().collection('users').doc('caller-3').set({ role: 'receptionist' });
    await seedBooking('booking-pending-ci', { status: 'pending', roomId: 'room-ci-1' });
    await seedRoom('room-ci-1', 'available');

    await expect(
      callRun({ data: { bookingId: 'booking-pending-ci' }, auth: { uid: 'caller-3' } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('rechaza si la habitación no está available', async () => {
    await admin.firestore().collection('users').doc('caller-4').set({ role: 'receptionist' });
    await seedRoom('room-ci-2', 'dirty');
    await seedBooking('booking-confirmed-ci', { roomId: 'room-ci-2' });

    await expect(
      callRun({ data: { bookingId: 'booking-confirmed-ci' }, auth: { uid: 'caller-4' } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    const room = await admin.firestore().collection('rooms').doc('room-ci-2').get();
    expect(room.data()?.status).toBe('dirty');
  });

  it('caso feliz: check-in crea Guest Account con cargo correcto, habitación pasa a occupied, reserva a checked-in', async () => {
    await admin.firestore().collection('users').doc('caller-5').set({ role: 'receptionist' });
    await seedRoom('room-ci-3', 'available');
    await seedBooking('booking-happy-ci', { roomId: 'room-ci-3', basePrice: 150 });

    const result = await callRun({ data: { bookingId: 'booking-happy-ci' }, auth: { uid: 'caller-5' } });

    expect(result.bookingId).toBe('booking-happy-ci');
    expect(result.guestAccountId).toBeTruthy();

    const room = await admin.firestore().collection('rooms').doc('room-ci-3').get();
    expect(room.data()?.status).toBe('occupied');

    const booking = await admin.firestore().collection('bookings').doc('booking-happy-ci').get();
    expect(booking.data()?.status).toBe('checked-in');

    const account = await admin.firestore().collection('guestAccounts').doc(result.guestAccountId).get();
    const data = account.data()!;
    expect(data.status).toBe('open');
    expect(data.charges).toHaveLength(1);
    expect(data.charges[0].total).toBe(450); // 150 * 3 noches
    expect(data.subtotal).toBe(450);
    expect(data.tax).toBe(58.5); // 13%
    expect(data.total).toBe(508.5);
    expect(data.balance).toBe(508.5);
    expect(data.paid).toBe(0);
  });

  it('idempotencia: si ya existe una Guest Account para la reserva, no crea otra', async () => {
    await admin.firestore().collection('users').doc('caller-6').set({ role: 'receptionist' });
    await seedRoom('room-ci-4', 'available');
    await seedBooking('booking-idem-ci', { roomId: 'room-ci-4' });

    const existingAccountRef = admin.firestore().collection('guestAccounts').doc();
    await existingAccountRef.set({ bookingId: 'booking-idem-ci', status: 'open', charges: [] });

    const result = await callRun({ data: { bookingId: 'booking-idem-ci' }, auth: { uid: 'caller-6' } });

    expect(result.guestAccountId).toBe(existingAccountRef.id);

    const snapshot = await admin
      .firestore()
      .collection('guestAccounts')
      .where('bookingId', '==', 'booking-idem-ci')
      .get();
    expect(snapshot.size).toBe(1);
  });
});
