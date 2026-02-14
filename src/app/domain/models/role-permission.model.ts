export interface RolePermission {
  role: string;
  displayName: string;
  routes: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export const DEFAULT_ROLE_PERMISSIONS: { [key: string]: RolePermission } = {
  superadmin: {
    role: 'superadmin',
    displayName: 'Super Administrador',
    routes: ['*'] // Acceso a todas las rutas
  },
  admin: {
    role: 'admin',
    displayName: 'Administrador',
    routes: [
      '/dashboard',
      '/front-desk',
      '/rooms',
      '/bookings',
      '/calendar',
      '/housekeeping',
      '/guest-accounts',
      '/pos',
      '/cash-register',
      '/transactions',
      '/invoices',
      '/reports',
      '/products',
      '/inventory',
      '/guests',
      '/employees',
      '/parameters',
      '/notifications'
    ]
  },
  receptionist: {
    role: 'receptionist',
    displayName: 'Recepcionista',
    routes: [
      '/dashboard',
      '/front-desk',
      '/rooms',
      '/bookings',
      '/calendar',
      '/guests',
      '/guest-accounts',
      '/pos',
      '/invoices'
    ]
  },
  housekeeper: {
    role: 'housekeeper',
    displayName: 'Camarera',
    routes: [
      '/dashboard',
      '/housekeeping',
      '/rooms'
    ]
  },
  manager: {
    role: 'manager',
    displayName: 'Gerente',
    routes: [
      '/dashboard',
      '/reports',
      '/bookings',
      '/rooms',
      '/guest-accounts',
      '/invoices',
      '/cash-register',
      '/transactions',
      '/employees'
    ]
  }
};
