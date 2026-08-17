// SPEC-12 — verifica que la escritura directa de cliente a las colecciones
// ya centralizadas en Cloud Functions (bookings, guestAccounts, sales,
// invoices) queda rechazada por firestore.rules, mientras que la lectura
// sigue funcionando con normalidad.
//
// Correr con: firebase emulators:exec --only firestore "npm test" (desde
// firestore-tests/).

const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, deleteDoc, getDoc } = require('firebase/firestore');

let testEnv;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'lequinthotel-spec12-test',
    firestore: {
      rules: readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

test.after(async () => {
  await testEnv.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/user1'), { role: 'receptionist' });
    await setDoc(doc(db, 'bookings/booking1'), { status: 'pending', roomId: 'room-1' });
    await setDoc(doc(db, 'guestAccounts/account1'), { status: 'open', charges: [], payments: [] });
    await setDoc(doc(db, 'sales/sale1'), { total: 100 });
    await setDoc(doc(db, 'invoices/invoice1'), { status: 'active' });
  });
});

function asUser() {
  return testEnv.authenticatedContext('user1').firestore();
}

test('bookings: create/update/delete directos quedan rechazados, read sigue funcionando', async () => {
  const db = asUser();
  await assertFails(setDoc(doc(db, 'bookings/new1'), { status: 'pending' }));
  await assertFails(updateDoc(doc(db, 'bookings/booking1'), { status: 'confirmed' }));
  await assertFails(deleteDoc(doc(db, 'bookings/booking1')));
  await assertSucceeds(getDoc(doc(db, 'bookings/booking1')));
});

test('guestAccounts: create/update/delete directos quedan rechazados, read sigue funcionando', async () => {
  const db = asUser();
  await assertFails(setDoc(doc(db, 'guestAccounts/new1'), { status: 'open' }));
  await assertFails(updateDoc(doc(db, 'guestAccounts/account1'), { balance: 0 }));
  await assertFails(deleteDoc(doc(db, 'guestAccounts/account1')));
  await assertSucceeds(getDoc(doc(db, 'guestAccounts/account1')));
});

test('sales: create/update directos quedan rechazados, read sigue funcionando', async () => {
  const db = asUser();
  await assertFails(setDoc(doc(db, 'sales/new1'), { total: 50 }));
  await assertFails(updateDoc(doc(db, 'sales/sale1'), { total: 999 }));
  await assertSucceeds(getDoc(doc(db, 'sales/sale1')));
});

test('invoices: create/update directos quedan rechazados, read sigue funcionando', async () => {
  const db = asUser();
  await assertFails(setDoc(doc(db, 'invoices/new1'), { status: 'active' }));
  await assertFails(updateDoc(doc(db, 'invoices/invoice1'), { total: 999 }));
  await assertSucceeds(getDoc(doc(db, 'invoices/invoice1')));
});

test('colecciones NO endurecidas (products, rooms) siguen permitiendo escritura directa — fuera de alcance de SPEC-12 por ahora', async () => {
  const db = asUser();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'rooms/room-1'), { roomNumber: '101', isActive: true });
  });
  await assertSucceeds(setDoc(doc(db, 'products/new1'), { name: 'x', isActive: true }));
  await assertSucceeds(updateDoc(doc(db, 'rooms/room-1'), { status: 'dirty' }));
});
