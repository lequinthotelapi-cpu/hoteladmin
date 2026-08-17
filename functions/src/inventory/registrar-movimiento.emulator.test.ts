// Tests de registrarMovimientoInventario contra el emulador real de Firestore.
// Correr con: firebase emulators:exec --only firestore "npm run test:concurrency"
// (desde functions/). No forma parte del `npm test` por defecto (offline).

import * as admin from 'firebase-admin';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido — este test debe correr dentro de ' +
      '`firebase emulators:exec --only firestore "npm run test:concurrency"`, no con `npm test` directo.'
  );
}

admin.initializeApp({ projectId: 'lequinthotel-inventory-test' });

import { registrarMovimientoInventario } from './registrar-movimiento';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(request: any) {
  return (registrarMovimientoInventario as any).run(request);
}

async function seedProduct(id: string, overrides: Record<string, unknown> = {}) {
  await admin
    .firestore()
    .collection('products')
    .doc(id)
    .set({ code: id, name: `Producto ${id}`, currentStock: 10, isActive: true, ...overrides });
}

describe('registrarMovimientoInventario — emulador real', () => {
  it('rechaza sin auth', async () => {
    await expect(callRun({ data: {}, auth: undefined })).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('rechaza sin rol suficiente (housekeeper)', async () => {
    await admin.firestore().collection('users').doc('caller-hk').set({ role: 'housekeeper' });
    await expect(callRun({ data: {}, auth: { uid: 'caller-hk' } })).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rechaza receptionist (no tiene acceso a /inventory)', async () => {
    await admin.firestore().collection('users').doc('caller-rc').set({ role: 'receptionist' });
    await expect(callRun({ data: {}, auth: { uid: 'caller-rc' } })).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rechaza manager (no tiene acceso a /inventory)', async () => {
    await admin.firestore().collection('users').doc('caller-mgr').set({ role: 'manager' });
    await expect(callRun({ data: {}, auth: { uid: 'caller-mgr' } })).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rechaza si faltan datos requeridos', async () => {
    await admin.firestore().collection('users').doc('caller-1').set({ role: 'admin' });
    await expect(callRun({ data: {}, auth: { uid: 'caller-1' } })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('rechaza type inválido', async () => {
    await admin.firestore().collection('users').doc('caller-2').set({ role: 'admin' });
    await seedProduct('prod-bad-type');
    await expect(
      callRun({
        data: { productId: 'prod-bad-type', type: 'not-a-type', reason: 'x', quantity: 1 },
        auth: { uid: 'caller-2' },
      })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('rechaza si el producto no existe', async () => {
    await admin.firestore().collection('users').doc('caller-3').set({ role: 'admin' });
    await expect(
      callRun({
        data: { productId: 'does-not-exist', type: 'entry', reason: 'compra', quantity: 1 },
        auth: { uid: 'caller-3' },
      })
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rechaza si el producto está inactivo', async () => {
    await admin.firestore().collection('users').doc('caller-4').set({ role: 'admin' });
    await seedProduct('prod-inactive', { isActive: false });

    await expect(
      callRun({
        data: { productId: 'prod-inactive', type: 'entry', reason: 'compra', quantity: 1 },
        auth: { uid: 'caller-4' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('rechaza salida con stock insuficiente, sin cambiar nada', async () => {
    await admin.firestore().collection('users').doc('caller-5').set({ role: 'admin' });
    await seedProduct('prod-low-stock', { currentStock: 2 });

    await expect(
      callRun({
        data: { productId: 'prod-low-stock', type: 'exit', reason: 'venta', quantity: 5 },
        auth: { uid: 'caller-5' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    const doc = await admin.firestore().collection('products').doc('prod-low-stock').get();
    expect(doc.data()?.currentStock).toBe(2);
  });

  it('rechaza quantity <= 0 (incluida en type "adjustment")', async () => {
    await admin.firestore().collection('users').doc('caller-6').set({ role: 'admin' });
    await seedProduct('prod-adjust-neg', { currentStock: 3 });

    await expect(
      callRun({
        data: { productId: 'prod-adjust-neg', type: 'adjustment', reason: 'conteo', quantity: -3 },
        auth: { uid: 'caller-6' },
      })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('caso feliz: entrada suma stock y registra el movimiento', async () => {
    await admin.firestore().collection('users').doc('caller-7').set({ role: 'admin' });
    await seedProduct('prod-entry', { currentStock: 5 });

    const result = await callRun({
      data: {
        productId: 'prod-entry',
        type: 'entry',
        reason: 'compra',
        quantity: 3,
        unitCost: 10,
        invoiceNumber: 'F-001',
        createdByName: 'Ana Admin',
      },
      auth: { uid: 'caller-7' },
    });

    expect(result.movementId).toBeTruthy();
    expect(result.newStock).toBe(8);

    const product = await admin.firestore().collection('products').doc('prod-entry').get();
    expect(product.data()?.currentStock).toBe(8);

    const movement = await admin.firestore().collection('inventoryMovements').doc(result.movementId).get();
    const data = movement.data()!;
    expect(data.type).toBe('entry');
    expect(data.previousStock).toBe(5);
    expect(data.newStock).toBe(8);
    expect(data.totalCost).toBe(30);
    expect(data.invoiceNumber).toBe('F-001');
    expect(data.createdByName).toBe('Ana Admin');
  });

  it('caso feliz: salida resta stock', async () => {
    await admin.firestore().collection('users').doc('caller-8').set({ role: 'superadmin' });
    await seedProduct('prod-exit', { currentStock: 10 });

    const result = await callRun({
      data: { productId: 'prod-exit', type: 'exit', reason: 'consumo', quantity: 4 },
      auth: { uid: 'caller-8' },
    });

    expect(result.newStock).toBe(6);
    const product = await admin.firestore().collection('products').doc('prod-exit').get();
    expect(product.data()?.currentStock).toBe(6);
  });

  it('caso feliz: ajuste suma la cantidad (misma fórmula que entry)', async () => {
    await admin.firestore().collection('users').doc('caller-9').set({ role: 'admin' });
    await seedProduct('prod-adjust', { currentStock: 10 });

    const result = await callRun({
      data: { productId: 'prod-adjust', type: 'adjustment', reason: 'conteo físico', quantity: 3 },
      auth: { uid: 'caller-9' },
    });

    expect(result.newStock).toBe(13);
  });

  it('concurrencia: dos salidas simultáneas del último stock disponible — solo una tiene éxito', async () => {
    await admin.firestore().collection('users').doc('caller-10').set({ role: 'admin' });
    await seedProduct('prod-concurrent', { currentStock: 5 });

    const results = await Promise.allSettled([
      callRun({
        data: { productId: 'prod-concurrent', type: 'exit', reason: 'venta', quantity: 5 },
        auth: { uid: 'caller-10' },
      }),
      callRun({
        data: { productId: 'prod-concurrent', type: 'exit', reason: 'venta', quantity: 5 },
        auth: { uid: 'caller-10' },
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const product = await admin.firestore().collection('products').doc('prod-concurrent').get();
    expect(product.data()?.currentStock).toBe(0);
  });
});
