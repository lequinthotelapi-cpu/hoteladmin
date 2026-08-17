// Test de concurrencia REAL contra el emulador de Firestore (Task 02.1 / criterio de
// aceptación de SPEC-02: "20 llamadas simultáneas devuelven 20 valores únicos y
// consecutivos"). No usa mocks — depende de FIRESTORE_EMULATOR_HOST, que
// `firebase emulators:exec` fija automáticamente en el proceso hijo.
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

admin.initializeApp({ projectId: 'lequinthotel-counters-test' });

import { getNextSequence } from './counters';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

// getNextSequence recibe la Transaction del caller (ver addendum en counters.ts) —
// cada llamada de este test abre su propia transacción externa, tal como hará
// `crearReserva` (Spec 05).
function callInOwnTransaction(tipo: 'booking' | 'invoice', fecha: Date) {
  return admin.firestore().runTransaction((tx) => getNextSequence(tx, tipo, fecha));
}

describe('getNextSequence — concurrencia real (Firestore emulator)', () => {
  it('20 llamadas simultáneas a getNextSequence("booking", misma fecha) devuelven 20 valores únicos y consecutivos', async () => {
    const fecha = new Date(2026, 7, 16);

    const results = await Promise.all(Array.from({ length: 20 }, () => callInOwnTransaction('booking', fecha)));

    const sequences = results.map((r) => r.sequence).sort((a, b) => a - b);
    expect(sequences).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));

    const numeros = new Set(results.map((r) => r.numero));
    expect(numeros.size).toBe(20);

    for (const r of results) {
      expect(r.periodo).toBe('20260816');
      expect(r.numero).toMatch(/^BK-20260816-\d{3}$/);
    }
  });

  it('llamadas concurrentes a tipos/períodos distintos no interfieren entre sí', async () => {
    const [booking, invoice] = await Promise.all([
      callInOwnTransaction('booking', new Date(2026, 7, 17)),
      callInOwnTransaction('invoice', new Date(2026, 7, 17)),
    ]);

    expect(booking.numero).toBe('BK-20260817-001');
    expect(invoice.numero).toBe('FAC-202608-0001');
  });
});
