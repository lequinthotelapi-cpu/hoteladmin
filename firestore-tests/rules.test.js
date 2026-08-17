// Pruebas de firestore.rules para SPEC-01 (cerrar escalación de privilegios en users/{uid}).
// Corre contra el emulador de Firestore real (no mocks) vía @firebase/rules-unit-testing.
// Ejecutar con: firebase emulators:exec --only firestore "npm test" (desde este directorio).

const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
} = require('firebase/firestore');

let testEnv;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'lequinthotel-rules-test',
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
  // Seed sin pasar por las reglas: un usuario normal y un admin.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/guest1'), {
      role: 'guest',
      active: true,
      maxSessions: 1,
      activeSessionsCount: 0,
      hasActiveSession: false,
    });
    await setDoc(doc(db, 'users/admin1'), {
      role: 'admin',
      active: true,
    });
    await setDoc(doc(db, 'users/guest2'), {
      role: 'guest',
      active: true,
    });
  });
});

function asGuest() {
  return testEnv.authenticatedContext('guest1').firestore();
}

function asAdmin() {
  return testEnv.authenticatedContext('admin1').firestore();
}

function asAnon() {
  return testEnv.unauthenticatedContext().firestore();
}

// --- Escalación de privilegios: debe fallar ---

test('un usuario no-admin NO puede auto-asignarse role=admin', async () => {
  const db = asGuest();
  await assertFails(updateDoc(doc(db, 'users/guest1'), { role: 'admin' }));
});

test('un usuario no-admin NO puede reactivar su propia cuenta (active)', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/guest1'), { active: false }, { merge: true });
  });
  const db = asGuest();
  await assertFails(updateDoc(doc(db, 'users/guest1'), { active: true }));
});

test('un usuario no-admin NO puede subir su propio maxSessions', async () => {
  const db = asGuest();
  await assertFails(updateDoc(doc(db, 'users/guest1'), { maxSessions: 999 }));
});

test('un usuario no-admin NO puede tocar salary/activeUntil/document/emergencyContact propios', async () => {
  const db = asGuest();
  await assertFails(updateDoc(doc(db, 'users/guest1'), { salary: 5000 }));
  await assertFails(updateDoc(doc(db, 'users/guest1'), { activeUntil: new Date() }));
  await assertFails(updateDoc(doc(db, 'users/guest1'), { document: '999999' }));
  await assertFails(
    updateDoc(doc(db, 'users/guest1'), {
      emergencyContact: { name: 'x', phone: '123', relationship: 'y' },
    })
  );
});

test('un usuario no-admin NO puede escalar rol escondiendo el campo junto a un write de sesión legítimo', async () => {
  const db = asGuest();
  await assertFails(
    updateDoc(doc(db, 'users/guest1'), {
      activeSessionsCount: 1,
      hasActiveSession: true,
      role: 'admin',
    })
  );
});

test('un usuario no-admin NO puede escribir la sesión de OTRO usuario', async () => {
  const db = asGuest();
  await assertFails(
    updateDoc(doc(db, 'users/guest2'), { activeSessionsCount: 1, hasActiveSession: true })
  );
});

test('un usuario sin autenticar NO puede escribir ningún campo', async () => {
  const db = asAnon();
  await assertFails(updateDoc(doc(db, 'users/guest1'), { hasActiveSession: true }));
});

// --- Flujos legítimos de AuthService: deben seguir funcionando ---

test('signIn: un usuario puede crear su propia sesión (sessions/activeSessionsCount/hasActiveSession)', async () => {
  const db = asGuest();
  await assertSucceeds(
    updateDoc(doc(db, 'users/guest1'), {
      activeSessionsCount: 1,
      hasActiveSession: true,
      'sessions.sess1': {
        createdAt: serverTimestamp(),
        lastHeartbeat: serverTimestamp(),
        role: 'guest',
      },
    })
  );
});

test('startHeartbeat: un usuario puede actualizar lastHeartbeat de su propia sesión', async () => {
  const db = asGuest();
  await assertSucceeds(
    updateDoc(doc(db, 'users/guest1'), {
      'sessions.sess1.lastHeartbeat': serverTimestamp(),
    })
  );
});

test('signOut: un usuario puede cerrar su propia sesión', async () => {
  const db = asGuest();
  await assertSucceeds(
    updateDoc(doc(db, 'users/guest1'), {
      activeSessionsCount: 0,
      hasActiveSession: false,
    })
  );
});

test('saveFCMToken: un usuario puede escribir su propio fcmToken', async () => {
  const db = asGuest();
  await assertSucceeds(updateDoc(doc(db, 'users/guest1'), { fcmToken: 'abc123' }));
});

test('ensureUserDocument: un usuario puede autorepararse maxSessions=1 cuando falta', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'users/guest1'), {});
  });
  const db = asGuest();
  await assertSucceeds(updateDoc(doc(db, 'users/guest1'), { maxSessions: 1 }));
});

// --- Admin: comportamiento actual preservado ---

test('un admin SÍ puede cambiar el role de otro usuario', async () => {
  const db = asAdmin();
  await assertSucceeds(updateDoc(doc(db, 'users/guest1'), { role: 'admin' }));
});

test('un admin SÍ puede reactivar/desactivar a otro usuario', async () => {
  const db = asAdmin();
  await assertSucceeds(updateDoc(doc(db, 'users/guest1'), { active: false }));
});

test('cualquier usuario autenticado sigue pudiendo leer users/{uid}', async () => {
  const db = asGuest();
  await assertSucceeds(getDoc(doc(db, 'users/admin1')));
});
