// Tests de agregarCargoCuenta/agregarPagoCuenta/cerrarCuenta contra el emulador
// real de Firestore.
// Correr con: firebase emulators:exec --only firestore "npm run test:concurrency"
// (desde functions/). No forma parte del `npm test` por defecto (offline).

import * as admin from 'firebase-admin';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido — este test debe correr dentro de ' +
      '`firebase emulators:exec --only firestore "npm run test:concurrency"`, no con `npm test` directo.'
  );
}

admin.initializeApp({ projectId: 'lequinthotel-cargos-pagos-test' });

import { agregarCargoCuenta, agregarPagoCuenta, cerrarCuenta } from './cargos-pagos';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(fn: any, request: any) {
  return fn.run(request);
}

async function seedAccount(id: string, overrides: Record<string, unknown> = {}) {
  await admin
    .firestore()
    .collection('guestAccounts')
    .doc(id)
    .set({
      bookingId: 'booking-x',
      status: 'open',
      charges: [],
      payments: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      paid: 0,
      balance: 0,
      ...overrides,
    });
}

describe('agregarCargoCuenta — emulador real', () => {
  it('rechaza sin auth', async () => {
    await expect(
      callRun(agregarCargoCuenta, { data: { accountId: 'x' }, auth: undefined })
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('rechaza sin rol suficiente', async () => {
    await admin.firestore().collection('users').doc('caller-hk').set({ role: 'housekeeper' });
    await expect(
      callRun(agregarCargoCuenta, { data: { accountId: 'x' }, auth: { uid: 'caller-hk' } })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rechaza si faltan datos requeridos', async () => {
    await admin.firestore().collection('users').doc('caller-1').set({ role: 'receptionist' });
    await expect(
      callRun(agregarCargoCuenta, { data: { accountId: 'x' }, auth: { uid: 'caller-1' } })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('rechaza si la cuenta no existe', async () => {
    await admin.firestore().collection('users').doc('caller-2').set({ role: 'receptionist' });
    await expect(
      callRun(agregarCargoCuenta, {
        data: { accountId: 'does-not-exist', tipo: 'pos', descripcion: 'x', monto: 10, cantidad: 1 },
        auth: { uid: 'caller-2' },
      })
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rechaza si la cuenta está cerrada', async () => {
    await admin.firestore().collection('users').doc('caller-3').set({ role: 'receptionist' });
    await seedAccount('account-closed-1', { status: 'closed' });

    await expect(
      callRun(agregarCargoCuenta, {
        data: { accountId: 'account-closed-1', tipo: 'pos', descripcion: 'x', monto: 10, cantidad: 1 },
        auth: { uid: 'caller-3' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('caso feliz: agrega un cargo tipo pos (mismo camino que POS "cargar a habitación") y recalcula totales con 13% IVA', async () => {
    await admin.firestore().collection('users').doc('caller-4').set({ role: 'receptionist' });
    await seedAccount('account-happy-1');

    const result = await callRun(agregarCargoCuenta, {
      data: { accountId: 'account-happy-1', tipo: 'pos', descripcion: 'POS: Coca-Cola x2', monto: 20, cantidad: 1 },
      auth: { uid: 'caller-4' },
    });

    expect(result.subtotal).toBe(20);
    expect(result.tax).toBe(2.6);
    expect(result.total).toBe(22.6);
    expect(result.balance).toBe(22.6);

    const doc = await admin.firestore().collection('guestAccounts').doc('account-happy-1').get();
    expect(doc.data()?.charges).toHaveLength(1);
    expect(doc.data()?.charges[0].type).toBe('pos');
  });
});

// Cargo real de $100 — necesario porque agregarPagoCuenta recalcula
// subtotal/tax/total/balance desde `charges[]`, igual que
// GuestAccountService.calculateTotals; no confía en un `total`/`balance`
// sembrado a mano sin respaldo real en `charges`. Con IVA 13%: subtotal 100,
// tax 13, total 113.
const CHARGE_100 = [{ total: 100, type: 'other', description: 'x', amount: 100, quantity: 1 }];

describe('agregarPagoCuenta — emulador real', () => {
  it('rechaza si el pago excede el saldo pendiente', async () => {
    await admin.firestore().collection('users').doc('caller-5').set({ role: 'receptionist' });
    // El balance sembrado es el que valida el rechazo (igual que el código
    // actual, que también valida contra el campo balance almacenado, no uno
    // recalculado, en este chequeo puntual).
    await seedAccount('account-pay-1', { charges: CHARGE_100, total: 113, balance: 113 });

    await expect(
      callRun(agregarPagoCuenta, {
        data: { accountId: 'account-pay-1', monto: 150, metodoPago: 'cash' },
        auth: { uid: 'caller-5' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('caso feliz: pago parcial reduce el balance correctamente (con IVA 13% ya aplicado)', async () => {
    await admin.firestore().collection('users').doc('caller-6').set({ role: 'receptionist' });
    await seedAccount('account-pay-2', { charges: CHARGE_100, total: 113, balance: 113 });

    const result = await callRun(agregarPagoCuenta, {
      data: { accountId: 'account-pay-2', monto: 40, metodoPago: 'card' },
      auth: { uid: 'caller-6' },
    });

    expect(result.subtotal).toBe(100);
    expect(result.tax).toBe(13);
    expect(result.total).toBe(113);
    expect(result.paid).toBe(40);
    expect(result.balance).toBe(73);
  });
});

describe('cerrarCuenta — emulador real', () => {
  it('rechaza cerrar una cuenta con saldo pendiente', async () => {
    await admin.firestore().collection('users').doc('caller-7').set({ role: 'receptionist' });
    await seedAccount('account-close-1', { total: 100, balance: 100 });

    await expect(
      callRun(cerrarCuenta, { data: { accountId: 'account-close-1' }, auth: { uid: 'caller-7' } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('rechaza cerrar una cuenta ya cerrada', async () => {
    await admin.firestore().collection('users').doc('caller-8').set({ role: 'receptionist' });
    await seedAccount('account-close-2', { status: 'closed', balance: 0 });

    await expect(
      callRun(cerrarCuenta, { data: { accountId: 'account-close-2' }, auth: { uid: 'caller-8' } })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('caso feliz: cierra una cuenta con balance 0', async () => {
    await admin.firestore().collection('users').doc('caller-9').set({ role: 'receptionist' });
    await seedAccount('account-close-3', { total: 100, paid: 100, balance: 0 });

    const result = await callRun(cerrarCuenta, {
      data: { accountId: 'account-close-3' },
      auth: { uid: 'caller-9' },
    });

    expect(result).toEqual({ accountId: 'account-close-3', status: 'closed' });

    const doc = await admin.firestore().collection('guestAccounts').doc('account-close-3').get();
    expect(doc.data()?.status).toBe('closed');
    expect(doc.data()?.closedBy).toBe('caller-9');
  });
});
