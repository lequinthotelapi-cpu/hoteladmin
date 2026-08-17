// Tests de registrarVentaPOS contra el emulador real de Firestore.
// Correr con: firebase emulators:exec --only firestore "npm run test:concurrency"
// (desde functions/). No forma parte del `npm test` por defecto (offline).

import * as admin from 'firebase-admin';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido — este test debe correr dentro de ' +
      '`firebase emulators:exec --only firestore "npm run test:concurrency"`, no con `npm test` directo.'
  );
}

admin.initializeApp({ projectId: 'lequinthotel-pos-test' });

import { registrarVentaPOS } from './registrar-venta';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(request: any) {
  return (registrarVentaPOS as any).run(request);
}

async function seedProduct(id: string, overrides: Record<string, unknown> = {}) {
  await admin
    .firestore()
    .collection('products')
    .doc(id)
    .set({ code: id, name: `Producto ${id}`, price: 10, currentStock: 5, isActive: true, ...overrides });
}

async function seedOpenCashRegister(userId: string) {
  await admin.firestore().collection('cashRegisters').add({ userId, status: 'open', initialAmount: 0 });
}

describe('registrarVentaPOS — emulador real', () => {
  it('rechaza sin auth', async () => {
    await expect(callRun({ data: {}, auth: undefined })).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('rechaza sin rol suficiente (housekeeper)', async () => {
    await admin.firestore().collection('users').doc('caller-hk').set({ role: 'housekeeper' });
    await expect(callRun({ data: {}, auth: { uid: 'caller-hk' } })).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rechaza manager (no tiene acceso a /pos, a diferencia de otros roles)', async () => {
    await admin.firestore().collection('users').doc('caller-mgr').set({ role: 'manager' });
    await expect(callRun({ data: {}, auth: { uid: 'caller-mgr' } })).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rechaza si faltan datos requeridos', async () => {
    await admin.firestore().collection('users').doc('caller-1').set({ role: 'receptionist' });
    await expect(callRun({ data: {}, auth: { uid: 'caller-1' } })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('rechaza si falta guestAccountId para tipoVenta habitacion', async () => {
    await admin.firestore().collection('users').doc('caller-2').set({ role: 'receptionist' });
    await expect(
      callRun({
        data: { items: [{ productId: 'x', quantity: 1 }], paymentMethod: 'cash', tipoVenta: 'habitacion' },
        auth: { uid: 'caller-2' },
      })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('rechaza si el producto no existe', async () => {
    await admin.firestore().collection('users').doc('caller-3').set({ role: 'receptionist' });
    await seedOpenCashRegister('caller-3');
    await expect(
      callRun({
        data: {
          items: [{ productId: 'does-not-exist', quantity: 1 }],
          paymentMethod: 'cash',
          tipoVenta: 'directa',
        },
        auth: { uid: 'caller-3' },
      })
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rechaza si el producto está inactivo', async () => {
    await admin.firestore().collection('users').doc('caller-4').set({ role: 'receptionist' });
    await seedOpenCashRegister('caller-4');
    await seedProduct('prod-inactive', { isActive: false });

    await expect(
      callRun({
        data: { items: [{ productId: 'prod-inactive', quantity: 1 }], paymentMethod: 'cash', tipoVenta: 'directa' },
        auth: { uid: 'caller-4' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('rechaza si el stock es insuficiente', async () => {
    await admin.firestore().collection('users').doc('caller-5').set({ role: 'receptionist' });
    await seedOpenCashRegister('caller-5');
    await seedProduct('prod-low-stock', { currentStock: 2 });

    await expect(
      callRun({
        data: { items: [{ productId: 'prod-low-stock', quantity: 5 }], paymentMethod: 'cash', tipoVenta: 'directa' },
        auth: { uid: 'caller-5' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    const doc = await admin.firestore().collection('products').doc('prod-low-stock').get();
    expect(doc.data()?.currentStock).toBe(2); // sin cambios — todo o nada
  });

  it('rechaza venta directa sin caja abierta', async () => {
    await admin.firestore().collection('users').doc('caller-6').set({ role: 'receptionist' });
    await seedProduct('prod-no-register', {});

    await expect(
      callRun({
        data: { items: [{ productId: 'prod-no-register', quantity: 1 }], paymentMethod: 'cash', tipoVenta: 'directa' },
        auth: { uid: 'caller-6' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('caso feliz: venta directa crea sale+transaction, descuenta stock, aplica IVA 19%', async () => {
    await admin.firestore().collection('users').doc('caller-7').set({ role: 'receptionist' });
    await seedOpenCashRegister('caller-7');
    await seedProduct('prod-happy-1', { price: 100, currentStock: 10 });

    const result = await callRun({
      data: {
        items: [{ productId: 'prod-happy-1', quantity: 2 }],
        paymentMethod: 'cash',
        tipoVenta: 'directa',
        createdByName: 'Ana Recep',
      },
      auth: { uid: 'caller-7' },
    });

    expect(result.saleId).toBeTruthy();
    expect(result.total).toBeCloseTo(238, 5); // subtotal 200, IVA 19% = 38, total 238

    const sale = await admin.firestore().collection('sales').doc(result.saleId).get();
    expect(sale.data()?.subtotal).toBe(200);
    expect(sale.data()?.tax).toBeCloseTo(38, 5);
    expect(sale.data()?.createdByName).toBe('Ana Recep');

    const product = await admin.firestore().collection('products').doc('prod-happy-1').get();
    expect(product.data()?.currentStock).toBe(8);

    const txSnap = await admin
      .firestore()
      .collection('transactions')
      .where('reference', '==', result.saleId)
      .get();
    expect(txSnap.size).toBe(1);
    expect(txSnap.docs[0].data().type).toBe('sale');
  });

  it('caso feliz: venta a habitación agrega cargo tipo pos a la cuenta, descuenta stock, NO crea sale ni transaction', async () => {
    await admin.firestore().collection('users').doc('caller-8').set({ role: 'receptionist' });
    await seedProduct('prod-happy-2', { name: 'Cerveza', price: 20, currentStock: 10 });
    await admin.firestore().collection('guestAccounts').doc('account-pos-1').set({
      status: 'open',
      charges: [],
      payments: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      paid: 0,
      balance: 0,
    });
    // Conteo previo, no "colección vacía" — otros tests de este archivo ya
    // crean ventas reales en la misma colección compartida del emulador.
    const salesCountBefore = (await admin.firestore().collection('sales').get()).size;

    const result = await callRun({
      data: {
        items: [{ productId: 'prod-happy-2', quantity: 3 }],
        paymentMethod: 'cash',
        tipoVenta: 'habitacion',
        guestAccountId: 'account-pos-1',
      },
      auth: { uid: 'caller-8' },
    });

    expect(result.saleId).toBeNull();
    expect(result.total).toBeCloseTo(71.4, 5); // subtotal 60, IVA 19% = 11.4, total 71.4

    // NOTA — doble IVA, replicado fielmente del comportamiento actual: el
    // "total" de la venta POS (71.4) ya incluye 19% de IVA, pero se guarda
    // como `charge.total` de un único cargo; aplicarCargoCuenta/
    // calcularTotalesCuenta vuelve a aplicar 13% de IVA sobre ESE monto al
    // recalcular los totales de la cuenta (71.4 * 1.13 = 80.682). Esto
    // también le pasa hoy al código real (pos.component.ts pasa el total ya
    // gravado con 19% como `amount` a addCharge, que igualmente vuelve a
    // aplicar 13%) — no se "corrigió" sin permiso, se documenta el hallazgo.
    const account = await admin.firestore().collection('guestAccounts').doc('account-pos-1').get();
    const data = account.data()!;
    expect(data.charges).toHaveLength(1);
    expect(data.charges[0].type).toBe('pos');
    expect(data.charges[0].description).toContain('Cerveza x3');
    expect(data.charges[0].total).toBeCloseTo(71.4, 5);
    expect(data.balance).toBeCloseTo(80.682, 5);

    const product = await admin.firestore().collection('products').doc('prod-happy-2').get();
    expect(product.data()?.currentStock).toBe(7);

    const salesCountAfter = (await admin.firestore().collection('sales').get()).size;
    expect(salesCountAfter).toBe(salesCountBefore);
  });

  it('rechaza venta a habitación con stock insuficiente (validación que hoy NO existe en el código actual)', async () => {
    await admin.firestore().collection('users').doc('caller-9').set({ role: 'receptionist' });
    await seedProduct('prod-low-2', { currentStock: 1 });
    await admin.firestore().collection('guestAccounts').doc('account-pos-2').set({
      status: 'open',
      charges: [],
      payments: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      paid: 0,
      balance: 0,
    });

    await expect(
      callRun({
        data: {
          items: [{ productId: 'prod-low-2', quantity: 5 }],
          paymentMethod: 'cash',
          tipoVenta: 'habitacion',
          guestAccountId: 'account-pos-2',
        },
        auth: { uid: 'caller-9' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    const account = await admin.firestore().collection('guestAccounts').doc('account-pos-2').get();
    expect(account.data()?.charges).toHaveLength(0); // sin cambios — todo o nada
  });
});
