# 🔐 Tópico: Guards y Autorización - Documentación Completa

## 📋 Resumen Ejecutivo

Se reestructuró completamente el proyecto implementando una arquitectura modular con separación clara entre áreas públicas y privadas, sistema de guards para autenticación y autorización basada en roles específicos para un **PMS (Property Management System) de hotel**.

---

## 🏨 Contexto: PMS Hotel

### Roles del Sistema

| Rol | Código | Nivel | Permisos |
|-----|--------|-------|----------|
| **Admin** | `admin` | 5 | Acceso total al sistema |
| **Manager** | `manager` | 4 | Gestión operativa completa |
| **Receptionist** | `receptionist` | 3 | Check-in/out, reservas, huéspedes |
| **Housekeeper** | `housekeeper` | 2 | Limpieza, mantenimiento de habitaciones |
| **Guest** | `guest` | 1 | Portal limitado para huéspedes |

---

## 📁 Nueva Estructura del Proyecto

```
/src/app/
│
├── core/                           ← Servicios singleton, guards, interceptors
│   ├── guards/
│   │   ├── auth.guard.ts          (autenticación)
│   │   ├── login.guard.ts         (redirigir si ya autenticado)
│   │   └── role.guard.ts          (autorización por rol)
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── notification.service.ts
│   │   └── messaging.service.ts
│   │
│   ├── models/
│   │   └── user-role.enum.ts      (enum de roles)
│   │
│   └── core.module.ts             (importar solo en AppModule)
│
├── shared/                         ← Componentes/directives reutilizables
│   ├── directives/
│   │   └── has-role.directive.ts  (*hasRole="'admin'")
│   │
│   └── shared.module.ts
│
├── features/                       ← Funcionalidades de la app
│   ├── public/                    ← Sin autenticación
│   │   └── login/
│   │
│   └── private/                   ← Con autenticación
│       └── dashboard/
│
├── examples/                       ← Componentes de plantilla (temporal)
│   ├── components/
│   ├── forms/
│   └── apps/
│
├── layout/                         ← Layouts
├── domain/                         ← Domain layer
├── infrastructure/                 ← Infrastructure
│
└── app-routing.module.ts
```

---

## 🔐 Implementación de Guards

### 1. AuthGuard (Autenticación)

**Ubicación**: `/workspace/src/app/core/guards/auth.guard.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService, 
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  canActivate() {
    return this.authService.user$.pipe(
      map(user => {
        if (user) {
          return true;
        } else {
          this.snackBar.open('Debes iniciar sesión', 'OK', { duration: 3000 });
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}
```

**Uso en rutas**:
```typescript
{
  path: '',
  component: LayoutComponent,
  canActivate: [AuthGuard],  // ← Protege todas las rutas hijas
  children: [...]
}
```

---

### 2. LoginGuard (Redirigir si autenticado)

**Ubicación**: `/workspace/src/app/core/guards/login.guard.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class LoginGuard implements CanActivate {
  
  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  canActivate() {
    return this.authService.user$.pipe(
      map(user => {
        if (user) {
          this.router.navigate(['/dashboard']);
          return false;  // No permitir acceso a login
        } else {
          return true;   // Permitir acceso a login
        }
      })
    );
  }
}
```

**Uso en rutas**:
```typescript
{
  path: 'login',
  loadChildren: () => import('./features/public/login/login.module'),
  canActivate: [LoginGuard]  // ← Redirige a dashboard si ya está logueado
}
```

---

### 3. RoleGuard (Autorización por Rol)

**Ubicación**: `/workspace/src/app/core/guards/role.guard.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private userRepository: UserRepository,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const requiredRoles = route.data['roles'] as UserRole[];

    return this.authService.user$.pipe(
      take(1),
      map(firebaseUser => {
        if (!firebaseUser) {
          this.router.navigate(['/login']);
          return false;
        }

        // Verificar rol en Firestore
        this.userRepository.getById(firebaseUser.uid).pipe(
          take(1)
        ).subscribe(user => {
          if (!user || !requiredRoles.includes(user.role as UserRole)) {
            this.router.navigate(['/unauthorized']);
            return false;
          }
        });

        return true;
      })
    );
  }
}
```

**Uso en rutas**:
```typescript
{
  path: 'admin',
  loadChildren: () => import('./features/private/admin/admin.module'),
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: [UserRole.ADMIN] }  // ← Solo admin
},
{
  path: 'reception',
  loadChildren: () => import('./features/private/reception/reception.module'),
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST] }
}
```

---

## 🎯 Directiva HasRole

**Ubicación**: `/workspace/src/app/shared/directives/has-role.directive.ts`

### Implementación

```typescript
@Directive({ selector: '[hasRole]' })
export class HasRoleDirective implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  private requiredRoles: UserRole[] = [];

  @Input() set hasRole(roles: UserRole | UserRole[]) {
    this.requiredRoles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService,
    private userRepository: UserRepository
  ) {}

  ngOnInit() {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(firebaseUser => {
        if (firebaseUser) {
          this.checkUserRole(firebaseUser.uid);
        } else {
          this.viewContainer.clear();
        }
      });
  }

  private checkUserRole(uid: string) {
    this.userRepository.getById(uid)
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user && this.requiredRoles.includes(user.role as UserRole)) {
          this.viewContainer.createEmbeddedView(this.templateRef);
        } else {
          this.viewContainer.clear();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### Uso en Templates

```html
<!-- Mostrar solo para admin -->
<button *hasRole="'admin'" mat-raised-button>
  Configuración del Sistema
</button>

<!-- Mostrar para admin o manager -->
<div *hasRole="['admin', 'manager']">
  <h3>Panel de Gestión</h3>
  <p>Contenido solo para administradores y gerentes</p>
</div>

<!-- Mostrar para recepcionista -->
<mat-card *hasRole="'receptionist'">
  <mat-card-title>Check-in / Check-out</mat-card-title>
  <mat-card-content>
    Funcionalidades de recepción
  </mat-card-content>
</mat-card>

<!-- Mostrar para ama de llaves -->
<section *hasRole="'housekeeper'">
  <h2>Estado de Habitaciones</h2>
  <!-- Lista de habitaciones para limpieza -->
</section>
```

---

## 🏗️ CoreModule (Singleton)

**Ubicación**: `/workspace/src/app/core/core.module.ts`

```typescript
@NgModule({
  imports: [CommonModule],
  providers: [
    // Guards
    AuthGuard,
    LoginGuard,
    RoleGuard,
    
    // Services
    AuthService,
    NotificationService,
    MessagingService
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error(
        'CoreModule is already loaded. Import it in the AppModule only'
      );
    }
  }
}
```

**Características**:
- ✅ Singleton pattern (solo se importa en AppModule)
- ✅ Previene múltiples instancias
- ✅ Centraliza servicios core

---

## 📦 SharedModule (Reutilizable)

**Ubicación**: `/workspace/src/app/shared/shared.module.ts`

```typescript
@NgModule({
  declarations: [
    HasRoleDirective
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ...MATERIAL_MODULES
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ...MATERIAL_MODULES,
    HasRoleDirective  // ← Exportar para usar en otros módulos
  ]
})
export class SharedModule {}
```

**Uso**:
```typescript
// En cualquier feature module
@NgModule({
  imports: [
    SharedModule  // ← Importar para usar HasRoleDirective y Material
  ]
})
export class DashboardModule {}
```

---

## 🎯 Enum de Roles

**Ubicación**: `/workspace/src/app/core/models/user-role.enum.ts`

```typescript
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  RECEPTIONIST = 'receptionist',
  HOUSEKEEPER = 'housekeeper',
  GUEST = 'guest'
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 5,
  [UserRole.MANAGER]: 4,
  [UserRole.RECEPTIONIST]: 3,
  [UserRole.HOUSEKEEPER]: 2,
  [UserRole.GUEST]: 1
};
```

**Uso**:
```typescript
// Verificar jerarquía
if (ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[UserRole.MANAGER]) {
  // Usuario tiene permisos de manager o superior
}
```

---

## 🔄 Flujo de Autenticación y Autorización

```
Usuario accede a /dashboard
         ↓
AuthGuard.canActivate()
         ↓
¿Usuario autenticado? (Firebase Auth)
         ↓
    NO → Redirigir a /login
         ↓
    SÍ → RoleGuard.canActivate()
         ↓
¿Usuario tiene rol requerido? (Firestore)
         ↓
    NO → Redirigir a /unauthorized
         ↓
    SÍ → Permitir acceso
         ↓
Renderizar componente
         ↓
*hasRole directive evalúa elementos
         ↓
Mostrar/ocultar según rol del usuario
```

---

## 📊 Ejemplos de Rutas Protegidas

### Rutas Públicas
```typescript
{
  path: 'login',
  loadChildren: () => import('./features/public/login/login.module'),
  canActivate: [LoginGuard]
},
{
  path: 'register',
  loadChildren: () => import('./features/public/register/register.module')
}
```

### Rutas Privadas (Solo Autenticados)
```typescript
{
  path: '',
  component: LayoutComponent,
  canActivate: [AuthGuard],
  children: [
    {
      path: 'dashboard',
      loadChildren: () => import('./features/private/dashboard/dashboard.module')
    }
  ]
}
```

### Rutas con Roles Específicos
```typescript
{
  path: 'admin',
  loadChildren: () => import('./features/private/admin/admin.module'),
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: [UserRole.ADMIN] }
},
{
  path: 'reception',
  loadChildren: () => import('./features/private/reception/reception.module'),
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.RECEPTIONIST] }
},
{
  path: 'housekeeping',
  loadChildren: () => import('./features/private/housekeeping/housekeeping.module'),
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.HOUSEKEEPER] }
}
```

---

## 🎓 Conceptos Técnicos Aplicados

### 1. Guards de Angular
- ✅ `CanActivate` interface
- ✅ Route protection
- ✅ Observable-based guards
- ✅ Route data para configuración

### 2. Structural Directives
- ✅ `TemplateRef` y `ViewContainerRef`
- ✅ Dynamic content rendering
- ✅ Input properties
- ✅ Lifecycle hooks

### 3. RxJS
- ✅ `Observable` streams
- ✅ `pipe()` y operators
- ✅ `map()`, `take()`, `takeUntil()`
- ✅ Memory leak prevention

### 4. Dependency Injection
- ✅ `@Injectable({ providedIn: 'root' })`
- ✅ Constructor injection
- ✅ Singleton services
- ✅ Module providers

### 5. TypeScript
- ✅ Enums
- ✅ Union types
- ✅ Type guards
- ✅ Generics

### 6. Arquitectura Modular
- ✅ Core module (singleton)
- ✅ Shared module (reutilizable)
- ✅ Feature modules (lazy loading)
- ✅ Separation of concerns

---

## 📚 Guía de Uso

### Proteger una Ruta

```typescript
// 1. Solo autenticación
{
  path: 'profile',
  component: ProfileComponent,
  canActivate: [AuthGuard]
}

// 2. Autenticación + Rol específico
{
  path: 'admin-panel',
  component: AdminPanelComponent,
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: [UserRole.ADMIN] }
}

// 3. Múltiples roles permitidos
{
  path: 'reports',
  component: ReportsComponent,
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: [UserRole.ADMIN, UserRole.MANAGER] }
}
```

### Usar Directiva en Template

```html
<!-- Botón solo para admin -->
<button *hasRole="'admin'">Admin Action</button>

<!-- Sección para múltiples roles -->
<div *hasRole="['admin', 'manager']">
  Management Content
</div>

<!-- Combinar con otras directivas -->
<mat-card *ngIf="showCard" *hasRole="'receptionist'">
  Reception Tools
</mat-card>
```

### Verificar Rol en Componente

```typescript
export class DashboardComponent implements OnInit {
  userRole: UserRole;

  constructor(
    private authService: AuthService,
    private userRepository: UserRepository
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe(firebaseUser => {
      if (firebaseUser) {
        this.userRepository.getById(firebaseUser.uid).subscribe(user => {
          this.userRole = user.role as UserRole;
        });
      }
    });
  }

  isAdmin(): boolean {
    return this.userRole === UserRole.ADMIN;
  }

  canAccessReports(): boolean {
    return [UserRole.ADMIN, UserRole.MANAGER].includes(this.userRole);
  }
}
```

---

## ✅ Verificación

### Estructura Creada
- ✅ `/core/` - Guards, services, models
- ✅ `/shared/` - Directivas reutilizables
- ✅ `/features/public/` - Login
- ✅ `/features/private/` - Dashboard
- ✅ `/examples/` - Componentes de plantilla

### Archivos Movidos
- ✅ `auth.guard.ts` → `core/guards/`
- ✅ `login.guard.ts` → `core/guards/`
- ✅ `auth.service.ts` → `core/services/`
- ✅ `notification.service.ts` → `core/services/`
- ✅ `login/` → `features/public/`
- ✅ `dashboard/` → `features/private/`
- ✅ `pages/` → `examples/`

### Archivos Creados
- ✅ `user-role.enum.ts`
- ✅ `role.guard.ts`
- ✅ `has-role.directive.ts`
- ✅ `core.module.ts`
- ✅ `shared.module.ts`

---

## 🚀 Próximos Pasos

1. **Crear módulos por rol**:
   - `features/private/admin/`
   - `features/private/reception/`
   - `features/private/housekeeping/`

2. **Implementar funcionalidades PMS**:
   - Gestión de reservas
   - Check-in / Check-out
   - Estado de habitaciones
   - Reportes

3. **Mejorar guards**:
   - Agregar logging
   - Mejorar manejo de errores
   - Implementar refresh token

4. **Testing**:
   - Unit tests para guards
   - Tests para directiva HasRole
   - E2E tests de flujos de autorización

---

**Fecha**: 2026-02-07  
**Tópico**: Guards y Autorización  
**Estado**: ✅ COMPLETADO (estructura base)  
**Contexto**: PMS Hotel
