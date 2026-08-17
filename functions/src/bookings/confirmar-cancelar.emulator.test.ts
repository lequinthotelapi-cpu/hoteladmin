// Tests de confirmarReserva/cancelarReserva contra el emulador real de Firestore.
// Correr con: firebase emulators:exec --only firestore "npm run test:concurrency"
// (desde functions/). No forma parte del `npm test` por defecto (offline).

import * as admin from 'firebase-admin';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido — este test debe correr dentro de ' +
      '`firebase emulators:exec --only firestore "npm run test:concurrency"`, no con `npm test` directo.'
  );
}

admin.initializeApp({ projectId: 'lequinthotel-confirmar-cancelar-test' });

import { confirmarReserva, cancelarReserva } from './confirmar-cancelar';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(fn: any, request: any) {
  return fn.run(request);
}

async function seedBooking(id: string, status: string) {
  await admin.firestore().collection('bookings').doc(id).set({
    bookingNumber: `BK-TEST-${id}`,
    status,
    roomId: 'room-x',
  });
}

describe('confirmarReserva — emulador real', () => {
  it('rechaza sin auth', async () => {
    await expect(callRun(confirmarReserva, { data: { bookingId: 'x' }, auth: undefined })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('SPEC-14: rechaza al rol ai-agent — solo tiene lista blanca para crearReserva, no para esta Function', async () => {
    await admin.firestore().collection('users').doc('caller-agent').set({ role: 'ai-agent' });
    await expect(
      callRun(confirmarReserva, { data: { bookingId: 'x' }, auth: { uid: 'caller-agent' } })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rechaza sin rol suficiente', async () => {
    await admin.firestore().collection('users').doc('caller-hk').set({ role: 'housekeeper' });
    await expect(
      callRun(confirmarReserva, { data: { bookingId: 'x' }, auth: { uid: 'caller-hk' } })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rechaza si falta bookingId', async () => {
    await admin.firestore().collection('users').doc('caller-1').set({ role: 'receptionist' });
    await expect(callRun(confirmarReserva, { data: {}, auth: { uid: 'caller-1' } })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('rechaza si la reserva no existe', async () => {
    await admin.firestore().collection('users').doc('caller-2').set({ role: 'receptionist' });
    await expect(
      callRun(confirmarReserva, { data: { bookingId: 'does-not-exist' }, auth: { uid: 'caller-2' } })
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rechaza confirmar una reserva que no está pending', async () => {
    await admin.firestore().collection('users').doc('caller-3').set({ role: 'receptionist' });
    await seedBooking('booking-confirmed-already', 'confirmed');
    await expect(
      callRun(confirmarReserva, { data: { bookingId: 'booking-confirmed-already' }, auth: { uid: 'caller-3' } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('caso feliz: confirma una reserva pending', async () => {
    await admin.firestore().collection('users').doc('caller-4').set({ role: 'receptionist' });
    await seedBooking('booking-pending-1', 'pending');

    const result = await callRun(confirmarReserva, {
      data: { bookingId: 'booking-pending-1' },
      auth: { uid: 'caller-4' },
    });

    expect(result).toEqual({ bookingId: 'booking-pending-1', status: 'confirmed' });
    const doc = await admin.firestore().collection('bookings').doc('booking-pending-1').get();
    expect(doc.data()?.status).toBe('confirmed');
    expect(doc.data()?.updatedBy).toBe('caller-4');
  });
});

describe('cancelarReserva — emulador real', () => {
  it('rechaza cancelar una reserva checked-in', async () => {
    await admin.firestore().collection('users').doc('caller-5').set({ role: 'receptionist' });
    await seedBooking('booking-checked-in', 'checked-in');
    await expect(
      callRun(cancelarReserva, { data: { bookingId: 'booking-checked-in' }, auth: { uid: 'caller-5' } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('rechaza cancelar una reserva checked-out', async () => {
    await admin.firestore().collection('users').doc('caller-6').set({ role: 'receptionist' });
    await seedBooking('booking-checked-out', 'checked-out');
    await expect(
      callRun(cancelarReserva, { data: { bookingId: 'booking-checked-out' }, auth: { uid: 'caller-6' } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('caso feliz: cancela una reserva pending con motivo', async () => {
    await admin.firestore().collection('users').doc('caller-7').set({ role: 'receptionist' });
    await seedBooking('booking-pending-2', 'pending');

    const result = await callRun(cancelarReserva, {
      data: { bookingId: 'booking-pending-2', motivo: 'Huésped canceló por teléfono' },
      auth: { uid: 'caller-7' },
    });

    expect(result).toEqual({ bookingId: 'booking-pending-2', status: 'cancelled' });
    const doc = await admin.firestore().collection('bookings').doc('booking-pending-2').get();
    expect(doc.data()?.status).toBe('cancelled');
    expect(doc.data()?.cancellationReason).toBe('Huésped canceló por teléfono');
  });

  it('caso feliz: cancela una reserva confirmed sin motivo (no escribe cancellationReason)', async () => {
    await admin.firestore().collection('users').doc('caller-8').set({ role: 'receptionist' });
    await seedBooking('booking-confirmed-2', 'confirmed');

    await callRun(cancelarReserva, { data: { bookingId: 'booking-confirmed-2' }, auth: { uid: 'caller-8' } });

    const doc = await admin.firestore().collection('bookings').doc('booking-confirmed-2').get();
    expect(doc.data()?.status).toBe('cancelled');
    expect(doc.data()?.cancellationReason).toBeUndefined();
  });
});
