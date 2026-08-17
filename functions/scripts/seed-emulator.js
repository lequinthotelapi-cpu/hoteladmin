// Siembra datos mínimos en los emuladores locales (Firestore + Auth) para poder
// probar la app manualmente contra ellos. Solo toca el emulador (usa
// FIRESTORE_EMULATOR_HOST/FIREBASE_AUTH_EMULATOR_HOST) — nunca produce.
//
// Uso: con los emuladores corriendo (firebase emulators:start --only firestore,functions,auth),
// desde functions/: node scripts/seed-emulator.js

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'lequinthotel-ca6ef' });

const DEFAULT_ROLE_PERMISSIONS = {
  superadmin: { role: 'superadmin', displayName: 'Super Administrador', routes: ['*'] },
  admin: {
    role: 'admin',
    displayName: 'Administrador',
    routes: [
      '/dashboard', '/front-desk', '/rooms', '/bookings', '/calendar', '/housekeeping',
      '/guest-accounts', '/pos', '/cash-register', '/transactions', '/invoices', '/reports',
      '/products', '/inventory', '/guests', '/employees', '/parameters', '/notifications',
    ],
  },
  receptionist: {
    role: 'receptionist',
    displayName: 'Recepcionista',
    routes: ['/dashboard', '/front-desk', '/rooms', '/bookings', '/calendar', '/guests', '/guest-accounts', '/pos', '/invoices'],
  },
  housekeeper: { role: 'housekeeper', displayName: 'Camarera', routes: ['/dashboard', '/housekeeping', '/rooms'] },
  manager: {
    role: 'manager',
    displayName: 'Gerente',
    routes: ['/dashboard', '/reports', '/bookings', '/rooms', '/guest-accounts', '/invoices', '/cash-register', '/transactions', '/employees'],
  },
};

async function main() {
  const email = 'test.receptionist@lequinthotel.test';
  const password = 'TestPass123!';

  let user;
  try {
    user = await admin.auth().createUser({ email, password, displayName: 'Test Receptionist' });
  } catch (e) {
    user = await admin.auth().getUserByEmail(email);
  }

  await admin.firestore().collection('users').doc(user.uid).set({
    uid: user.uid,
    firstName: 'Test',
    lastName: 'Receptionist',
    email,
    document: '000000',
    gender: 'masculino',
    role: 'receptionist',
    active: true,
    createdAt: new Date(),
    maxSessions: 5,
    activeSessionsCount: 0,
    hasActiveSession: false,
  });

  await admin.firestore().collection('rooms').doc('seed-room-1').set({
    roomNumber: '101',
    floor: 1,
    roomType: 'standard',
    bedType: 'queen',
    capacity: 2,
    amenities: [],
    status: 'available',
    isActive: true,
    basePrice: 120,
  });

  await admin.firestore().collection('guests').doc('seed-guest-1').set({
    id: 'seed-guest-1',
    firstName: 'Carlos',
    lastName: 'Mendoza',
    email: 'carlos.mendoza@example.com',
    phone: '555-1234',
    documentType: 'cedula',
    documentNumber: '001-0001',
    guestType: 'individual',
    status: 'active',
    vip: false,
  });

  await Promise.all(
    Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, perm]) =>
      admin.firestore().collection('rolePermissions').doc(role).set({ ...perm, createdAt: new Date(), updatedAt: new Date() })
    )
  );

  await admin.firestore().collection('parameters').doc('reservationSources').set({
    id: 'reservationSources',
    name: 'Fuentes de reserva',
    description: 'Origen de la reserva',
    options: [
      { value: 'direct', label: 'Directo', active: true, order: 0 },
      { value: 'website', label: 'Sitio Web', active: true, order: 1 },
      { value: 'booking', label: 'Booking.com', active: true, order: 2 },
    ],
    updatedAt: new Date(),
    updatedBy: 'seed-script',
  });

  console.log('Listo. Login en http://localhost:4200 con:');
  console.log('  email:', email);
  console.log('  password:', password);
  console.log('Habitación sembrada: 101 (standard, capacidad 2, $120/noche, activa)');
  console.log('Huésped sembrado: Carlos Mendoza');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
