// Tests de emitirFactura/cancelarFactura contra el emulador real de Firestore.
// Correr con: firebase emulators:exec --only firestore "npm run test:concurrency"
// (desde functions/). No forma parte del `npm test` por defecto (offline).

import * as admin from 'firebase-admin';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido — este test debe correr dentro de ' +
      '`firebase emulators:exec --only firestore "npm run test:concurrency"`, no con `npm test` directo.'
  );
}

admin.initializeApp({ projectId: 'lequinthotel-facturacion-test' });

import { emitirFactura, cancelarFactura } from './facturacion';

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
      status: 'closed',
      balance: 0,
      subtotal: 100,
      tax: 13,
      total: 113,
      charges: [{ description: 'Alojamiento - 1 noche(s)', quantity: 1, amount: 100, total: 100 }],
      ...overrides,
    });
}

const clientData = { clientName: 'Juan Pérez', clientTaxId: '001-0001-0001A' };

describe('emitirFactura — emulador real', () => {
  it('rechaza sin auth', async () => {
    await expect(
      callRun(emitirFactura, { data: { referenceId: 'x', tipo: 'guest_account', ...clientData }, auth: undefined })
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('rechaza sin rol suficiente', async () => {
    await admin.firestore().collection('users').doc('caller-hk').set({ role: 'housekeeper' });
    await expect(
      callRun(emitirFactura, {
        data: { referenceId: 'x', tipo: 'guest_account', ...clientData },
        auth: { uid: 'caller-hk' },
      })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rechaza si faltan datos requeridos', async () => {
    await admin.firestore().collection('users').doc('caller-1').set({ role: 'receptionist' });
    await expect(
      callRun(emitirFactura, { data: { referenceId: 'x' }, auth: { uid: 'caller-1' } })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('rechaza tipo "pos" (no implementado, sin precedente real que replicar)', async () => {
    await admin.firestore().collection('users').doc('caller-2').set({ role: 'receptionist' });
    await expect(
      callRun(emitirFactura, {
        data: { referenceId: 'sale-1', tipo: 'pos', ...clientData },
        auth: { uid: 'caller-2' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('rechaza si la cuenta no existe', async () => {
    await admin.firestore().collection('users').doc('caller-3').set({ role: 'receptionist' });
    await expect(
      callRun(emitirFactura, {
        data: { referenceId: 'does-not-exist', tipo: 'guest_account', ...clientData },
        auth: { uid: 'caller-3' },
      })
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rechaza si la cuenta no está closed', async () => {
    await admin.firestore().collection('users').doc('caller-4').set({ role: 'receptionist' });
    await seedAccount('account-open-1', { status: 'open' });

    await expect(
      callRun(emitirFactura, {
        data: { referenceId: 'account-open-1', tipo: 'guest_account', ...clientData },
        auth: { uid: 'caller-4' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('rechaza si la cuenta tiene saldo pendiente', async () => {
    await admin.firestore().collection('users').doc('caller-5').set({ role: 'receptionist' });
    await seedAccount('account-balance-1', { balance: 50 });

    await expect(
      callRun(emitirFactura, {
        data: { referenceId: 'account-balance-1', tipo: 'guest_account', ...clientData },
        auth: { uid: 'caller-5' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('caso feliz: emite factura con número BK... FAC-YYYYMM-XXXX e items desde los cargos', async () => {
    await admin.firestore().collection('users').doc('caller-6').set({ role: 'receptionist' });
    await seedAccount('account-happy-1');

    const result = await callRun(emitirFactura, {
      data: { referenceId: 'account-happy-1', tipo: 'guest_account', ...clientData },
      auth: { uid: 'caller-6' },
    });

    expect(result.invoiceNumber).toMatch(/^FAC-\d{6}-\d{4}$/);
    expect(result.invoiceId).toBeTruthy();

    const doc = await admin.firestore().collection('invoices').doc(result.invoiceId).get();
    const data = doc.data()!;
    expect(data.status).toBe('active');
    expect(data.referenceId).toBe('account-happy-1');
    expect(data.subtotal).toBe(100);
    expect(data.total).toBe(113);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].subtotal).toBe(100);
  });

  it('rechaza una segunda factura para la misma referencia (referencia duplicada)', async () => {
    await admin.firestore().collection('users').doc('caller-7').set({ role: 'receptionist' });
    await seedAccount('account-dup-1');

    await callRun(emitirFactura, {
      data: { referenceId: 'account-dup-1', tipo: 'guest_account', ...clientData },
      auth: { uid: 'caller-7' },
    });

    await expect(
      callRun(emitirFactura, {
        data: { referenceId: 'account-dup-1', tipo: 'guest_account', ...clientData },
        auth: { uid: 'caller-7' },
      })
    ).rejects.toMatchObject({ code: 'already-exists' });
  });
});

describe('cancelarFactura — emulador real', () => {
  it('rechaza si falta motivo', async () => {
    await admin.firestore().collection('users').doc('caller-8').set({ role: 'receptionist' });
    await expect(
      callRun(cancelarFactura, { data: { invoiceId: 'x' }, auth: { uid: 'caller-8' } })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('rechaza si la factura no existe', async () => {
    await admin.firestore().collection('users').doc('caller-9').set({ role: 'receptionist' });
    await expect(
      callRun(cancelarFactura, {
        data: { invoiceId: 'does-not-exist', motivo: 'error de datos' },
        auth: { uid: 'caller-9' },
      })
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('caso feliz: cancela una factura activa', async () => {
    await admin.firestore().collection('users').doc('caller-10').set({ role: 'receptionist' });
    await seedAccount('account-cancel-1');
    const emitted = await callRun(emitirFactura, {
      data: { referenceId: 'account-cancel-1', tipo: 'guest_account', ...clientData },
      auth: { uid: 'caller-10' },
    });

    const result = await callRun(cancelarFactura, {
      data: { invoiceId: emitted.invoiceId, motivo: 'Datos fiscales incorrectos' },
      auth: { uid: 'caller-10' },
    });

    expect(result).toEqual({ invoiceId: emitted.invoiceId, status: 'cancelled' });

    const doc = await admin.firestore().collection('invoices').doc(emitted.invoiceId).get();
    expect(doc.data()?.status).toBe('cancelled');
    expect(doc.data()?.cancelReason).toBe('Datos fiscales incorrectos');
  });

  it('rechaza cancelar una factura ya cancelada', async () => {
    await admin.firestore().collection('users').doc('caller-11').set({ role: 'receptionist' });
    await seedAccount('account-cancel-2');
    const emitted = await callRun(emitirFactura, {
      data: { referenceId: 'account-cancel-2', tipo: 'guest_account', ...clientData },
      auth: { uid: 'caller-11' },
    });
    await callRun(cancelarFactura, {
      data: { invoiceId: emitted.invoiceId, motivo: 'primera cancelación' },
      auth: { uid: 'caller-11' },
    });

    await expect(
      callRun(cancelarFactura, {
        data: { invoiceId: emitted.invoiceId, motivo: 'segunda cancelación' },
        auth: { uid: 'caller-11' },
      })
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});
