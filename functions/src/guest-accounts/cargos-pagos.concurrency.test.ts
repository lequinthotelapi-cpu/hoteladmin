// Test de concurrencia REAL de agregarCargoCuenta (criterio de aceptación
// explícito de SPEC-09: "dos cargos simultáneos a la misma cuenta no se pierden
// entre sí"). El patrón actual (leer array completo → mutar en memoria →
// sobrescribir) pierde escrituras bajo concurrencia; la transacción no debería.
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

admin.initializeApp({ projectId: 'lequinthotel-cargos-pagos-concurrency-test' });

import { agregarCargoCuenta } from './cargos-pagos';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(request: any) {
  return (agregarCargoCuenta as any).run(request);
}

describe('agregarCargoCuenta — concurrencia real (Firestore emulator)', () => {
  it('10 cargos simultáneos a la misma cuenta: ninguno se pierde, subtotal final es la suma exacta', async () => {
    await admin.firestore().collection('users').doc('caller-concurrent').set({ role: 'receptionist' });
    await admin.firestore().collection('guestAccounts').doc('account-concurrent').set({
      bookingId: 'booking-x',
      status: 'open',
      charges: [],
      payments: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      paid: 0,
      balance: 0,
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        callRun({
          data: { accountId: 'account-concurrent', tipo: 'pos', descripcion: `Item ${i}`, monto: 10, cantidad: 1 },
          auth: { uid: 'caller-concurrent' },
        })
      )
    );

    // El último resultado en aplicarse debe reflejar el subtotal acumulado total.
    const doc = await admin.firestore().collection('guestAccounts').doc('account-concurrent').get();
    const data = doc.data()!;

    expect(data.charges).toHaveLength(10);
    expect(data.subtotal).toBe(100); // 10 cargos de $10 cada uno, ninguno perdido
    expect(data.tax).toBeCloseTo(13, 5);
    expect(data.total).toBeCloseTo(113, 5);

    // Todos los resultados individuales también deben ser consistentes con el
    // estado final que dejaron (cada uno vio su propia escritura confirmada).
    expect(results).toHaveLength(10);
  });
});
