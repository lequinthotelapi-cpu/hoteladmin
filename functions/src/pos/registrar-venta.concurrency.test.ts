// Test de concurrencia REAL de registrarVentaPOS (criterio de aceptación
// explícito de SPEC-11: "dos ventas concurrentes del último ítem de stock:
// solo una tiene éxito").
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

admin.initializeApp({ projectId: 'lequinthotel-pos-concurrency-test' });

import { registrarVentaPOS } from './registrar-venta';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(request: any) {
  return (registrarVentaPOS as any).run(request);
}

describe('registrarVentaPOS — concurrencia real (Firestore emulator)', () => {
  it('dos ventas simultáneas del último ítem de stock: solo una tiene éxito, stock nunca queda negativo', async () => {
    await admin.firestore().collection('users').doc('caller-a').set({ role: 'receptionist' });
    await admin.firestore().collection('users').doc('caller-b').set({ role: 'receptionist' });
    await admin.firestore().collection('cashRegisters').add({ userId: 'caller-a', status: 'open', initialAmount: 0 });
    await admin.firestore().collection('cashRegisters').add({ userId: 'caller-b', status: 'open', initialAmount: 0 });
    await admin.firestore().collection('products').doc('prod-last-unit').set({
      code: 'X1',
      name: 'Último producto',
      price: 50,
      currentStock: 1,
      isActive: true,
    });

    const sale = { items: [{ productId: 'prod-last-unit', quantity: 1 }], paymentMethod: 'cash', tipoVenta: 'directa' };

    const results = await Promise.allSettled([
      callRun({ data: sale, auth: { uid: 'caller-a' } }),
      callRun({ data: sale, auth: { uid: 'caller-b' } }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: 'failed-precondition' });

    const product = await admin.firestore().collection('products').doc('prod-last-unit').get();
    expect(product.data()?.currentStock).toBe(0); // nunca negativo

    const salesSnap = await admin.firestore().collection('sales').get();
    expect(salesSnap.size).toBe(1);
  });
});
