// Tests de crearReserva contra el emulador real de Firestore (no mocks) — la propia
// estrategia de pruebas de SPEC-05 pide probar esta Function así, dado que compone
// requireRole + validarDisponibilidad + calcularPrecioReserva + getNextSequence
// dentro de una única transacción real.
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

admin.initializeApp({ projectId: 'lequinthotel-crear-reserva-test' });

import { crearReserva, CrearReservaInput } from './crear-reserva';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(request: any) {
  return (crearReserva as any).run(request);
}

async function seedUser(uid: string, role: string) {
  await admin.firestore().collection('users').doc(uid).set({ role });
}

async function seedRoom(id: string, overrides: Record<string, unknown> = {}) {
  await admin
    .firestore()
    .collection('rooms')
    .doc(id)
    .set({ roomNumber: '101', roomType: 'standard', capacity: 2, basePrice: 100, isActive: true, ...overrides });
}

async function seedGuest(id: string, overrides: Record<string, unknown> = {}) {
  await admin
    .firestore()
    .collection('guests')
    .doc(id)
    .set({ firstName: 'Juan', lastName: 'Pérez', email: 'juan@example.com', phone: '555-0001', ...overrides });
}

function baseInput(overrides: Partial<CrearReservaInput> = {}): CrearReservaInput {
  return {
    roomId: 'room-1',
    guestId: 'guest-1',
    checkInDate: new Date(2026, 8, 1).toISOString(),
    checkOutDate: new Date(2026, 8, 4).toISOString(),
    adults: 2,
    children: 0,
    source: 'direct',
    ...overrides,
  };
}

describe('crearReserva — emulador real', () => {
  beforeEach(async () => {
    // Limpieza mínima entre tests: cada test usa ids propios para no interferir.
  });

  it('rechaza sin auth', async () => {
    await expect(callRun({ data: baseInput(), auth: undefined })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('rechaza si el caller no tiene rol suficiente (housekeeper)', async () => {
    await seedUser('caller-hk', 'housekeeper');

    await expect(callRun({ data: baseInput(), auth: { uid: 'caller-hk' } })).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rechaza checkOutDate <= checkInDate', async () => {
    await seedUser('caller-1', 'receptionist');

    await expect(
      callRun({
        data: baseInput({
          checkInDate: new Date(2026, 8, 5).toISOString(),
          checkOutDate: new Date(2026, 8, 5).toISOString(),
        }),
        auth: { uid: 'caller-1' },
      })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('rechaza si la habitación no existe', async () => {
    await seedUser('caller-2', 'receptionist');
    await seedGuest('guest-rnf');

    await expect(
      callRun({
        data: baseInput({ roomId: 'room-does-not-exist', guestId: 'guest-rnf' }),
        auth: { uid: 'caller-2' },
      })
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rechaza si la habitación está inactiva', async () => {
    await seedUser('caller-3', 'receptionist');
    await seedRoom('room-inactive-1', { isActive: false });
    await seedGuest('guest-3');

    await expect(
      callRun({
        data: baseInput({ roomId: 'room-inactive-1', guestId: 'guest-3' }),
        auth: { uid: 'caller-3' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('rechaza si el huésped no existe', async () => {
    await seedUser('caller-4', 'receptionist');
    await seedRoom('room-4');

    await expect(
      callRun({
        data: baseInput({ roomId: 'room-4', guestId: 'guest-does-not-exist' }),
        auth: { uid: 'caller-4' },
      })
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rechaza si excede la capacidad de la habitación', async () => {
    await seedUser('caller-5', 'receptionist');
    await seedRoom('room-5', { capacity: 2 });
    await seedGuest('guest-5');

    await expect(
      callRun({
        data: baseInput({ roomId: 'room-5', guestId: 'guest-5', adults: 3, children: 0 }),
        auth: { uid: 'caller-5' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('rechaza si las fechas se solapan con una reserva confirmed existente', async () => {
    await seedUser('caller-6', 'receptionist');
    await seedRoom('room-6');
    await seedGuest('guest-6');
    await admin.firestore().collection('bookings').add({
      roomId: 'room-6',
      status: 'confirmed',
      checkInDate: new Date(2026, 8, 1),
      checkOutDate: new Date(2026, 8, 5),
    });

    await expect(
      callRun({
        data: baseInput({ roomId: 'room-6', guestId: 'guest-6', checkInDate: new Date(2026, 8, 3).toISOString(), checkOutDate: new Date(2026, 8, 6).toISOString() }),
        auth: { uid: 'caller-6' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('caso feliz: crea la reserva con precio/bookingNumber/estado correctos', async () => {
    await seedUser('caller-7', 'receptionist');
    await seedRoom('room-7', { roomNumber: '202', roomType: 'suite', capacity: 3, basePrice: 150 });
    await seedGuest('guest-7', { firstName: 'Ana', lastName: 'Gómez', email: 'ana@example.com', phone: '555-9999' });

    const result = await callRun({
      data: baseInput({
        roomId: 'room-7',
        guestId: 'guest-7',
        checkInDate: new Date(2026, 8, 10).toISOString(),
        checkOutDate: new Date(2026, 8, 13).toISOString(),
        adults: 2,
        children: 1,
        source: 'direct',
      }),
      auth: { uid: 'caller-7' },
    });

    expect(result.status).toBe('pending');
    expect(result.nights).toBe(3);
    expect(result.totalPrice).toBe(450); // 150 * 3, sin IVA (Task 03.1)
    expect(result.bookingNumber).toMatch(/^BK-20260910-\d{3}$/);
    expect(result.bookingId).toBeTruthy();

    const doc = await admin.firestore().collection('bookings').doc(result.bookingId).get();
    const data = doc.data()!;
    expect(data.status).toBe('pending');
    expect(data.guestName).toBe('Ana Gómez');
    expect(data.roomNumber).toBe('202');
    expect(data.adults).toBe(2);
    expect(data.children).toBe(1);
    expect(data.specialRequests).toBe('');
    expect(data.notes).toBe('');
    expect(data.createdBy).toBe('caller-7');
    expect(data.createdByRole).toBe('receptionist');
  });

  it('SPEC-14: el rol ai-agent puede crear reservas (única Function habilitada para el agente por ahora), con trazabilidad', async () => {
    await seedUser('caller-agent', 'ai-agent');
    await seedRoom('room-agent-1', { capacity: 3 });
    await seedGuest('guest-agent-1');

    const result = await callRun({
      data: baseInput({ roomId: 'room-agent-1', guestId: 'guest-agent-1' }),
      auth: { uid: 'caller-agent' },
    });

    expect(result.status).toBe('pending');

    const doc = await admin.firestore().collection('bookings').doc(result.bookingId).get();
    expect(doc.data()?.createdBy).toBe('caller-agent');
    expect(doc.data()?.createdByRole).toBe('ai-agent');
  });

  it('roles con acceso a /bookings (manager, admin, superadmin) también pueden crear reservas', async () => {
    await seedRoom('room-8', { capacity: 2 });
    await seedGuest('guest-8');

    for (const [i, role] of ['manager', 'admin', 'superadmin'].entries()) {
      const uid = `caller-role-${role}`;
      await seedUser(uid, role);

      const result = await callRun({
        data: baseInput({
          roomId: 'room-8',
          guestId: 'guest-8',
          checkInDate: new Date(2026, 9, 1 + i * 5).toISOString(),
          checkOutDate: new Date(2026, 9, 3 + i * 5).toISOString(),
        }),
        auth: { uid },
      });

      expect(result.status).toBe('pending');
    }
  });
});
