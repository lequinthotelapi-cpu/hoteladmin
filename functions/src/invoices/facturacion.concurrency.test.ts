// Test de concurrencia REAL de emitirFactura (criterio de aceptación explícito
// de SPEC-10: "dos emisiones simultáneas de factura no colisionan en número").
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

admin.initializeApp({ projectId: 'lequinthotel-facturacion-concurrency-test' });

import { emitirFactura } from './facturacion';

afterAll(async () => {
  await Promise.all(admin.apps.map((app) => app?.delete()));
});

function callRun(request: any) {
  return (emitirFactura as any).run(request);
}

describe('emitirFactura — concurrencia real (Firestore emulator)', () => {
  it('10 facturas simultáneas de 10 cuentas distintas: 10 números únicos y consecutivos', async () => {
    await admin.firestore().collection('users').doc('caller-concurrent').set({ role: 'receptionist' });

    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        admin
          .firestore()
          .collection('guestAccounts')
          .doc(`account-concurrent-${i}`)
          .set({
            status: 'closed',
            balance: 0,
            subtotal: 100,
            tax: 13,
            total: 113,
            charges: [{ description: 'x', quantity: 1, amount: 100, total: 100 }],
          })
      )
    );

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        callRun({
          data: {
            referenceId: `account-concurrent-${i}`,
            tipo: 'guest_account',
            clientName: 'Cliente Test',
            clientTaxId: '001-0001',
          },
          auth: { uid: 'caller-concurrent' },
        })
      )
    );

    const invoiceNumbers = new Set(results.map((r) => r.invoiceNumber));
    expect(invoiceNumbers.size).toBe(10);
    for (const r of results) {
      expect(r.invoiceNumber).toMatch(/^FAC-\d{6}-\d{4}$/);
    }
  });

  it('dos emisiones simultáneas para la MISMA referencia: solo una tiene éxito', async () => {
    await admin.firestore().collection('users').doc('caller-dup').set({ role: 'receptionist' });
    await admin.firestore().collection('guestAccounts').doc('account-dup-concurrent').set({
      status: 'closed',
      balance: 0,
      subtotal: 100,
      tax: 13,
      total: 113,
      charges: [{ description: 'x', quantity: 1, amount: 100, total: 100 }],
    });

    const results = await Promise.allSettled([
      callRun({
        data: { referenceId: 'account-dup-concurrent', tipo: 'guest_account', clientName: 'A', clientTaxId: '1' },
        auth: { uid: 'caller-dup' },
      }),
      callRun({
        data: { referenceId: 'account-dup-concurrent', tipo: 'guest_account', clientName: 'B', clientTaxId: '2' },
        auth: { uid: 'caller-dup' },
      }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);

    const invoicesSnap = await admin
      .firestore()
      .collection('invoices')
      .where('referenceId', '==', 'account-dup-concurrent')
      .get();
    expect(invoicesSnap.size).toBe(1);
  });
});
