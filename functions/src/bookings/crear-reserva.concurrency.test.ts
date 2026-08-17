// Test de concurrencia REAL de crearReserva.
//
// AJUSTE respecto al criterio de aceptación original de SPEC-05 ("dos llamadas
// concurrentes con fechas solapadas: solo una tiene éxito"): investigado y corregido
// con el usuario — ver "Hallazgo: pending vs. pending" en
// SPEC-05-crear-reserva.md. `crearReserva` siempre crea la reserva en `pending`, y
// `validarDisponibilidad` (SPEC-04, decisión ya tomada) solo bloquea contra
// `confirmed`/`checked-in` — exactamente igual que hoy en Angular. Por diseño, DOS
// reservas `pending` solapadas para la misma habitación SÍ pueden coexistir (no es
// una regresión: hoy mismo dos usuarios de Angular podrían crear el mismo par de
// reservas pending solapadas). El bloqueo real contra overbooking ocurre al
// confirmar (Spec 06), no al crear. Este archivo prueba lo que sí debe garantizar
// esta Spec: unicidad de `bookingNumber` bajo concurrencia, y que una reserva ya
// `confirmed` sí bloquea intentos concurrentes de solapamiento.
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

admin.initializeApp({ projectId: 'lequinthotel-crear-reserva-concurrency-test' });

import { crearReserva } from './crear-reserva';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(request: any) {
  return (crearReserva as any).run(request);
}

describe('crearReserva — concurrencia real (Firestore emulator)', () => {
  it('dos llamadas simultáneas con fechas solapadas (ambas quedan "pending"): AMBAS tienen éxito, por diseño', async () => {
    await admin.firestore().collection('users').doc('caller-a').set({ role: 'receptionist' });
    await admin.firestore().collection('users').doc('caller-b').set({ role: 'receptionist' });
    await admin.firestore().collection('rooms').doc('room-concurrent').set({
      roomNumber: '301',
      roomType: 'standard',
      capacity: 4,
      basePrice: 100,
      isActive: true,
    });
    await admin.firestore().collection('guests').doc('guest-a').set({
      firstName: 'A',
      lastName: 'Uno',
      email: 'a@example.com',
      phone: '1',
    });
    await admin.firestore().collection('guests').doc('guest-b').set({
      firstName: 'B',
      lastName: 'Dos',
      email: 'b@example.com',
      phone: '2',
    });

    const input = {
      roomId: 'room-concurrent',
      checkInDate: new Date(2026, 10, 1).toISOString(),
      checkOutDate: new Date(2026, 10, 4).toISOString(),
      adults: 1,
      children: 0,
      source: 'direct',
    };

    const results = await Promise.allSettled([
      callRun({ data: { ...input, guestId: 'guest-a' }, auth: { uid: 'caller-a' } }),
      callRun({ data: { ...input, guestId: 'guest-b' }, auth: { uid: 'caller-b' } }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];

    expect(fulfilled).toHaveLength(2);
    expect(new Set(fulfilled.map((r) => r.value.bookingNumber)).size).toBe(2);

    const snapshot = await admin
      .firestore()
      .collection('bookings')
      .where('roomId', '==', 'room-concurrent')
      .get();
    expect(snapshot.size).toBe(2);
    snapshot.forEach((doc) => expect(doc.data().status).toBe('pending'));
  });

  it('una reserva ya CONFIRMED bloquea intentos concurrentes de solapamiento (esto sí debe garantizarse)', async () => {
    await admin.firestore().collection('users').doc('caller-c').set({ role: 'receptionist' });
    await admin.firestore().collection('users').doc('caller-d').set({ role: 'receptionist' });
    await admin.firestore().collection('rooms').doc('room-confirmed-block').set({
      roomNumber: '302',
      roomType: 'standard',
      capacity: 4,
      basePrice: 100,
      isActive: true,
    });
    await admin.firestore().collection('guests').doc('guest-c').set({
      firstName: 'C',
      lastName: 'Tres',
      email: 'c@example.com',
      phone: '3',
    });
    await admin.firestore().collection('guests').doc('guest-d').set({
      firstName: 'D',
      lastName: 'Cuatro',
      email: 'd@example.com',
      phone: '4',
    });
    await admin.firestore().collection('bookings').add({
      roomId: 'room-confirmed-block',
      status: 'confirmed',
      checkInDate: new Date(2026, 10, 1),
      checkOutDate: new Date(2026, 10, 4),
    });

    const input = {
      roomId: 'room-confirmed-block',
      checkInDate: new Date(2026, 10, 2).toISOString(),
      checkOutDate: new Date(2026, 10, 5).toISOString(),
      adults: 1,
      children: 0,
      source: 'direct',
    };

    const results = await Promise.allSettled([
      callRun({ data: { ...input, guestId: 'guest-c' }, auth: { uid: 'caller-c' } }),
      callRun({ data: { ...input, guestId: 'guest-d' }, auth: { uid: 'caller-d' } }),
    ]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    for (const r of results as PromiseRejectedResult[]) {
      expect(r.reason).toMatchObject({ code: 'failed-precondition' });
    }
  });

  it('bookingNumber único bajo concurrencia: 10 reservas simultáneas en habitaciones distintas, mismo día', async () => {
    const checkIn = new Date(2026, 10, 20);
    const checkOut = new Date(2026, 10, 22);

    await Promise.all(
      Array.from({ length: 10 }, async (_, i) => {
        await admin.firestore().collection('users').doc(`caller-seq-${i}`).set({ role: 'receptionist' });
        await admin.firestore().collection('rooms').doc(`room-seq-${i}`).set({
          roomNumber: String(400 + i),
          roomType: 'standard',
          capacity: 4,
          basePrice: 80,
          isActive: true,
        });
        await admin.firestore().collection('guests').doc(`guest-seq-${i}`).set({
          firstName: 'G',
          lastName: String(i),
          email: `g${i}@example.com`,
          phone: String(i),
        });
      })
    );

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        callRun({
          data: {
            roomId: `room-seq-${i}`,
            guestId: `guest-seq-${i}`,
            checkInDate: checkIn.toISOString(),
            checkOutDate: checkOut.toISOString(),
            adults: 1,
            children: 0,
            source: 'direct',
          },
          auth: { uid: `caller-seq-${i}` },
        })
      )
    );

    const bookingNumbers = new Set(results.map((r) => r.bookingNumber));
    expect(bookingNumbers.size).toBe(10);
    for (const r of results) {
      expect(r.bookingNumber).toMatch(/^BK-20261120-\d{3}$/);
    }
  });
});
