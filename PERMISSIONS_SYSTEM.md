# Sistema de Permisos por Rol - Documentación

## Descripción General

Sistema de control de acceso basado en roles (RBAC) que gestiona qué rutas puede acceder cada rol de usuario.

## Arquitectura

### 1. Modelo de Datos

**Colección Firestore**: `rolePermissions`

```typescript
{
  role: string,              // 'superadmin', 'admin', 'receptionist', etc.
  displayName: string,       // 'Super Administrador', 'Recepcionista', etc.
  routes: string[],          // ['/dashboard', '/bookings', ...]
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. Roles Predefinidos

#### Superadmin
- **Acceso**: Todas las rutas (`*`)
- **Descripción**: Acceso total sin restricciones

#### Admin
- **Acceso**: Todas las rutas excepto ejemplos
- **Rutas**: Dashboard, Recepción, Habitaciones, Reservas, Calendario, Housekeeping, Cuentas, POS, Caja, Movimientos, Facturas, Reportes, Productos, Inventario, Huéspedes, Empleados, Parámetros, Notificaciones

#### Receptionist
- **Acceso**: Operaciones y finanzas básicas
- **Rutas**: Dashboard, Recepción, Habitaciones, Reservas, Calendario, Huéspedes, Cuentas, POS, Facturas

#### Housekeeper
- **Acceso**: Limpieza y habitaciones
- **Rutas**: Dashboard, Housekeeping, Habitaciones

#### Manager
- **Acceso**: Reportes y gestión
- **Rutas**: Dashboard, Reportes, Reservas, Habitaciones, Cuentas, Facturas, Caja, Movimientos, Empleados

## Componentes

### 1. PermissionService

**Ubicación**: `/workspace/src/app/core/services/permission.service.ts`

**Métodos**:
```typescript
// Inicializa permisos por defecto
initializeDefaultPermissions(): Promise<void>

// Verifica si usuario tiene acceso a ruta
hasRouteAccess(route: string): Observable<boolean>

// Obtiene permisos de un rol
getRolePermissions(role: string): Observable<RolePermission | null>

// Obtiene todos los roles
getAllRolePermissions(): Observable<RolePermission[]>

// Actualiza permisos de un rol
updateRolePermissions(role: string, routes: string[]): Promise<void>
```

### 2. PermissionGuard

**Ubicación**: `/workspace/src/app/core/guards/permission.guard.ts`

**Uso en rutas**:
```typescript
{
  path: 'reports',
  loadChildren: () => import('./reports/reports.module'),
  canActivate: [AuthGuard, PermissionGuard]  // ← Agregar guard
}
```

### 3. Módulo de Administración

**Ruta**: `/permissions`

**Funcionalidades**:
- Lista de roles disponibles
- Selector de rol
- Checkboxes agrupados por sección (OPERACIONES, FINANZAS, etc.)
- Guardar cambios
- Indicador para Superadmin (no editable)

## Uso

### Inicialización Automática

Los permisos se inicializan automáticamente al iniciar sesión:

```typescript
// app.component.ts
this.authService.user$.subscribe(user => {
  if (user) {
    this.permissionService.initializeDefaultPermissions();
  }
});
```

### Verificar Acceso en Código

```typescript
// En un componente
this.permissionService.hasRouteAccess('/reports').subscribe(hasAccess => {
  if (hasAccess) {
    // Mostrar contenido
  }
});
```

### Filtrar Menú por Permisos

```typescript
// sidenav.component.ts
items$ = this.sidenavService.items$.pipe(
  switchMap(items => 
    this.filterItemsByPermissions(items)
  )
);
```

## Firestore Rules

```javascript
match /rolePermissions/{roleId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}
```

## Administración

### Acceso al Módulo
1. Iniciar sesión como admin o superadmin
2. Ir a **Administración → Permisos**
3. Seleccionar rol a editar
4. Marcar/desmarcar rutas permitidas
5. Guardar cambios

### Restricciones
- **Superadmin**: No se puede editar (acceso total por defecto)
- **Solo admins**: Pueden modificar permisos
- **Cambios inmediatos**: Afectan a todos los usuarios del rol

## Estructura de Archivos

```
src/app/
├── domain/
│   ├── models/
│   │   └── role-permission.model.ts
│   └── repositories/
│       └── role-permission.repository.ts
├── infrastructure/
│   └── repositories/
│       └── role-permission-firebase.repository.ts
├── core/
│   ├── services/
│   │   └── permission.service.ts
│   └── guards/
│       └── permission.guard.ts
└── features/
    └── private/
        └── permissions/
            ├── permissions.component.ts
            ├── permissions.component.html
            ├── permissions.component.scss
            ├── permissions.module.ts
            └── permissions-routing.module.ts
```

## Próximas Mejoras

### Fase 2: Permisos por Usuario
- Campo `customRoutes` en User model
- Campo `blockedRoutes` en User model
- Override de permisos del rol
- Tab adicional en módulo de administración

### Fase 3: Permisos Granulares
- Permisos por acción (read, create, update, delete)
- Permisos por módulo
- Permisos condicionales (ej: solo sus propios registros)

## Troubleshooting

### Permisos no se aplican
1. Verificar que usuario tenga rol asignado
2. Verificar que rolePermissions exista en Firestore
3. Reiniciar sesión para recargar permisos

### Error "Unauthorized"
1. Verificar que ruta esté en lista de permisos del rol
2. Verificar que PermissionGuard esté en la ruta
3. Verificar Firestore Rules

### Cambios no se guardan
1. Verificar que usuario sea admin
2. Verificar conexión a Firestore
3. Revisar consola del navegador

## Deployment

```bash
# Desplegar reglas de Firestore
firebase deploy --only firestore:rules

# Verificar en Firebase Console
# https://console.firebase.google.com/project/lequinthotel-ca6ef/firestore/rules
```

## Versión
- **v1.0.0** - Sistema básico por roles
- **Fecha**: 2024-02-15
