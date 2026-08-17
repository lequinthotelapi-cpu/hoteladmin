// Tests de registrarCheckOut contra el emulador real de Firestore.
// Correr con: firebase emulators:exec --only firestore "npm run test:concurrency"
// (desde functions/). No forma parte del `npm test` por defecto (offline).

import * as admin from 'firebase-admin';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido — este test debe correr dentro de ' +
      '`firebase emulators:exec --only firestore "npm run test:concurrency"`, no con `npm test` directo.'
  );
}

admin.initializeApp({ projectId: 'lequinthotel-checkout-test' });

import { registrarCheckOut } from './checkout';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(request: any) {
  return (registrarCheckOut as any).run(request);
}

async function seedRoom(id: string, status: string) {
  await admin.firestore().collection('rooms').doc(id).set({ roomNumber: '101', status, isActive: true });
}

async function seedBooking(id: string, overrides: Record<string, unknown>) {
  await admin.firestore().collection('bookings').doc(id).set({
    bookingNumber: `BK-TEST-${id}`,
    status: 'checked-in',
    roomId: 'room-x',
    ...overrides,
  });
}

describe('registrarCheckOut — emulador real', () => {
  it('rechaza sin auth', async () => {
    await expect(callRun({ data: { bookingId: 'x' }, auth: undefined })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('rechaza sin rol suficiente', async () => {
    await admin.firestore().collection('users').doc('caller-hk').set({ role: 'housekeeper' });
    await expect(callRun({ data: { bookingId: 'x' }, auth: { uid: 'caller-hk' } })).rejects.toMatchObject({
      code: 'permission-denied',
    });
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

  it('rechaza si la reserva no está checked-in', async () => {
    await admin.firestore().collection('users').doc('caller-3').set({ role: 'receptionist' });
    await seedRoom('room-co-1', 'occupied');
    await seedBooking('booking-confirmed-co', { status: 'confirmed', roomId: 'room-co-1' });

    await expect(
      callRun({ data: { bookingId: 'booking-confirmed-co' }, auth: { uid: 'caller-3' } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('caso feliz: habitación pasa a dirty (nunca cleaning), reserva a checked-out', async () => {
    await admin.firestore().collection('users').doc('caller-4').set({ role: 'receptionist' });
    await seedRoom('room-co-2', 'occupied');
    await seedBooking('booking-happy-co', { roomId: 'room-co-2' });

    const result = await callRun({ data: { bookingId: 'booking-happy-co' }, auth: { uid: 'caller-4' } });

    expect(result).toEqual({ bookingId: 'booking-happy-co', roomId: 'room-co-2' });

    const room = await admin.firestore().collection('rooms').doc('room-co-2').get();
    expect(room.data()?.status).toBe('dirty');

    const booking = await admin.firestore().collection('bookings').doc('booking-happy-co').get();
    expect(booking.data()?.status).toBe('checked-out');
    expect(booking.data()?.updatedBy).toBe('caller-4');
  });

  it('no crea ninguna tarea de housekeeping (decisión: manual, no automático)', async () => {
    await admin.firestore().collection('users').doc('caller-5').set({ role: 'receptionist' });
    await seedRoom('room-co-3', 'occupied');
    await seedBooking('booking-no-hk', { roomId: 'room-co-3' });

    await callRun({ data: { bookingId: 'booking-no-hk' }, auth: { uid: 'caller-5' } });

    const tasksSnap = await admin
      .firestore()
      .collection('housekeepingTasks')
      .where('roomId', '==', 'room-co-3')
      .get();
    expect(tasksSnap.empty).toBe(true);
  });
});
