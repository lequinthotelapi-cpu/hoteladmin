# CONTEXTO DEL PROYECTO - Fury Hotel Management

## Última Actualización: 2024-02-16

---

## ⚠️ REGLAS CRÍTICAS DE DESARROLLO

### 🚫 NUNCA usar `.toPromise()` - SIEMPRE usar `firstValueFrom()`

**Problema identificado**:
- El método `.toPromise()` de RxJS está **DEPRECATED** desde RxJS 7
- Causa fallos silenciosos que no se capturan en try-catch
- Los métodos async que lo usan simplemente se detienen sin mostrar errores

**Solución obligatoria**:
```typescript
// ❌ MAL - NO USAR NUNCA
const data = await observable$.toPromise();

// ✅ BIEN - USAR SIEMPRE
import { firstValueFrom } from 'rxjs';
const data = await firstValueFrom(observable$);
```

**Archivos corregidos**:
- `/workspace/src/app/core/services/housekeeping.service.ts`
- `/workspace/src/app/core/services/financial-reports.service.ts`

**Impacto**: Todos los servicios async ahora funcionan correctamente sin fallos silenciosos.

---

## Stack Tecnológico

- **Framework**: Angular 16+
- **Template**: Fury Material Design Admin Template
- **Backend**: Firebase (Auth + Firestore)
- **Idioma UI**: Español
- **Estilo**: Material Design

---

## Módulos Implementados

### 1. Sistema de Notificaciones en Tiempo Real - v1.0.0 ✅
Sistema completo de notificaciones con Firestore y alertas visuales.

**Componentes**:
- `/workspace/src/app/layout/toolbar/toolbar-notifications/` - Componente de notificaciones en toolbar
- `/workspace/src/app/features/private/notifications/` - Módulo de gestión de notificaciones
- `/workspace/src/app/core/services/notification.service.ts` - Servicio de notificaciones
- `/workspace/src/app/infrastructure/repositories/notification-firebase.repository.ts` - Repositorio Firebase

**Características**:
- **Notificaciones en tiempo real** con listeners de Firestore (onSnapshot)
- **Badge con contador** de notificaciones no leídas
- **Tipos de notificación**: check-in, check-out, housekeeping, booking, payment, inventory, system
- **Prioridades**: low, medium, high
- **Alertas visuales**:
  - Prioridad ALTA: SweetAlert2 con icono de advertencia
  - Prioridad MEDIA/BAJA: Material SnackBar
- **Gestión manual**: Módulo `/notifications` para enviar notificaciones a demanda
- **Botón de prueba**: Icono de bug en toolbar para testing

**Triggers Automáticos**:
1. **Housekeeping**: Al asignar tarea a empleado
2. **Bookings**: Al crear nueva reserva (notifica a todos los recepcionistas)

**Acciones**:
- Marcar como leída (individual)
- Marcar todas como leídas
- Eliminar notificación
- Navegar a URL de acción

**Firestore Índices**:
```json
[
  {
    "collectionGroup": "notifications",
    "fields": [
      { "fieldPath": "userId", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "notifications",
    "fields": [
      { "fieldPath": "userId", "order": "ASCENDING" },
      { "fieldPath": "read", "order": "ASCENDING" }
    ]
  }
]
```

**Firestore Rules**:
```javascript
match /notifications/{notificationId} {
  allow read, update, delete: if isAuthenticated() && 
    resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated();
}
```

**Integración UI**:
- Toolbar: Icono de campana con badge de contador
- Sidenav: Icono "send" para acceso rápido a `/notifications`
- Menú lateral: Item "Notificaciones" en sección ADMINISTRACIÓN

**Módulo de Gestión** (`/notifications`):
- Formulario para enviar notificaciones individuales
- Selector de usuario, tipo, prioridad
- Botón "Enviar a Todos" para broadcast
- Validaciones de campos requeridos

**Documentación**: `/workspace/NOTIFICACIONES.md`

---

### 2. Sistema de Permisos por Rol (RBAC) - v1.0.0 ✅
Control de acceso basado en roles con gestión dinámica.

**Componentes**:
- `/workspace/src/app/domain/models/role-permission.model.ts` - Modelo y permisos por defecto
- `/workspace/src/app/core/services/permission.service.ts` - Servicio de permisos
- `/workspace/src/app/core/guards/permission.guard.ts` - Guard para proteger rutas
- `/workspace/src/app/features/private/permissions/` - Módulo de administración

**Roles Predefinidos**:
- **superadmin**: Acceso total (`*`)
- **admin**: Todas las rutas excepto ejemplos
- **receptionist**: Dashboard, Recepción, Habitaciones, Reservas, Calendario, Huéspedes, Cuentas, POS, Facturas
- **housekeeper**: Dashboard, Housekeeping, Habitaciones
- **manager**: Dashboard, Reportes, Reservas, Habitaciones, Cuentas, Facturas, Caja, Movimientos, Empleados

**Características**:
- Almacenamiento en Firestore (`rolePermissions` collection)
- Inicialización automática al login
- Interfaz de administración con checkboxes agrupados
- Protección de rutas con `PermissionGuard`
- Ocultación de iconos del sidenav según permisos
- Cambios en tiempo real

**Módulo de Administración** (`/permissions`):
- Lista de roles disponibles
- Selector de rol
- Checkboxes agrupados por sección (OPERACIONES, FINANZAS, INVENTARIO, ADMINISTRACIÓN)
- Botón guardar cambios
- Superadmin no editable (acceso total por defecto)

**Firestore Rules**:
```javascript
match /rolePermissions/{roleId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}
```

**Uso**:
```typescript
// Verificar acceso en código
this.permissionService.hasRouteAccess('/reports').subscribe(hasAccess => {
  if (hasAccess) { /* mostrar contenido */ }
});

// Proteger ruta
{
  path: 'reports',
  canActivate: [AuthGuard, PermissionGuard]
}
```

**Documentación**: `/workspace/PERMISSIONS_SYSTEM.md`

---

### 3. Profile y Help - v1.0.0 ✅
Páginas de perfil de usuario y ayuda con documentación dinámica.

**Profile** (`/profile`):
- Información completa del usuario actual
- Avatar, nombre, email, documento, teléfono, cargo, departamento
- Badge con rol traducido
- Estado activo/inactivo

**Help** (`/help`):
- **Documentación dinámica por rol**
- Muestra solo módulos accesibles según permisos
- Grid de tarjetas con icono, nombre y descripción
- Información general del sistema
- Características principales

**Ejemplos por Rol**:
- **Superadmin**: 20 módulos
- **Admin**: 18 módulos
- **Receptionist**: 9 módulos
- **Housekeeper**: 3 módulos
- **Manager**: 9 módulos

**Toolbar User Menu**:
- **Profile**: Navega a `/profile`
- **Settings**: Navega a `/parameters`
- **Help**: Navega a `/help`
- **Logout**: Cierra sesión

---

### 4. Dashboard Financiero - v1.0.0 ✅
Dashboard con métricas financieras y KPIs hoteleros.

**Componentes**:
- `/workspace/src/app/features/private/reports/financial-dashboard/`
- Servicio: `FinancialReportsService`

**KPIs Mostrados**:
1. **Ingresos Totales**: Suma de Guest Accounts cerradas + POS directo
2. **Ocupación**: Porcentaje de habitaciones ocupadas vs disponibles
3. **RevPAR** (Revenue Per Available Room): Ingreso por habitación disponible
4. **ADR** (Average Daily Rate): Tarifa promedio diaria
5. **Por Cobrar**: Balance pendiente de cuentas abiertas
6. **Efectivo en Caja**: Desglosado por método de pago (Efectivo, Tarjeta, Transferencia, etc.)

**Gráficos**:
- Ingresos por Día (Line Chart)
- Ingresos por Fuente (Pie Chart): Alojamiento, Servicios, POS Directo, Otros

**Cálculo de Métricas**:
- **RevPAR**: Ingresos totales / (Habitaciones disponibles * Días)
- **ADR**: Ingresos totales / Noches vendidas
- **Ocupación**: (Noches vendidas / Noches disponibles) * 100
- **Efectivo en Caja**: Calculado desde transacciones reales de cajas abiertas
  - Monto inicial + Ventas + Pagos + Depósitos - Gastos - Retiros - Reembolsos
  - Desglosado por método de pago (cash, card, transfer, check, other)

**Filtros**:
- Filtros rápidos: Hoy, Semana, Mes, Año
- Rango de fechas personalizado

**Integración**:
- `GuestAccountService`: Cuentas cerradas para ingresos
- `POSService`: Ventas directas
- `BookingService`: Reservas para ocupación
- `RoomService`: Habitaciones disponibles
- `CashRegisterService`: Efectivo en caja con transacciones

**Documentación**: Este archivo (sección Dashboard Financiero)

---

### 5. Housekeeping (Limpieza) - v2.0.0 ✅
Sistema completo de gestión de tareas de limpieza y mantenimiento.

**Componentes**:
- Dashboard de housekeeping con estadísticas
- Lista de tareas con filtros
- Creación/edición de tareas
- Completar tareas desde múltiples ubicaciones

**Flujo de Tareas**:
1. **Crear Tarea**: Asignar a empleado, tipo, prioridad
2. **Completar Tarea**: 
   - Desde listado de tareas (botón "Completar")
   - Desde listado de habitaciones (botón "Completar Limpieza")
   - Desde vista grid de habitaciones (botón verde con check)
   - Si tarea está pendiente, se inicia automáticamente antes de completar
   - Requiere duración real, notas opcionales
   - Opción de marcar si requiere mantenimiento

**Tipos de Tarea**:
- `cleaning`: Limpieza regular
- `deep-cleaning`: Limpieza profunda
- `maintenance`: Mantenimiento
- `inspection`: Inspección

**Estados**:
- `pending`: Pendiente (asignada pero no iniciada)
- `in-progress`: En progreso
- `completed`: Completada
- `cancelled`: Cancelada

**Prioridades**: low, normal, high, urgent

**Integración con Habitaciones**:
- Crear tarea cambia estado de habitación a "cleaning" o "maintenance"
- Completar tarea cambia habitación a "available" (o "maintenance" si se marcó)
- Botón "Completar Limpieza" visible en habitaciones con estado "cleaning"

**Validaciones**:
- Tarea debe estar asignada a empleado para iniciar/completar
- Solo tareas pendientes pueden iniciarse
- Solo tareas en progreso pueden completarse
- Duración real debe ser mayor a 0

**Firestore Índices Requeridos**:
```json
{
  "collectionGroup": "housekeepingTasks",
  "fields": [
    { "fieldPath": "roomId", "order": "ASCENDING" },
    { "fieldPath": "scheduledDate", "order": "ASCENDING" }
  ]
}
```

**Documentación**: `/workspace/HOUSEKEEPING_MODULE.md`, `/workspace/HOUSEKEEPING_COMPLETION.md`

---

### 6. Menú Lateral Reorganizado - v1.1.0 ✅
Menú lateral con grupos lógicos, botón de configuración en footer y accesos rápidos.

**Grupos**:
1. **OPERACIONES** (Día a día del hotel)
   - Dashboard, Recepción, Habitaciones, Reservas, Calendario, Housekeeping

2. **FINANZAS** (Gestión financiera)
   - Cuentas, POS, Caja, Movimientos, Facturas, Reportes

3. **INVENTARIO** (Gestión de productos)
   - Productos, Inventario

4. **ADMINISTRACIÓN** (Configuración y usuarios)
   - Huéspedes, Usuarios, Parámetros, **Notificaciones** ⭐, **Permisos** 🔒

5. **EXAMPLES** (Ejemplos del template)
   - Todos los componentes de ejemplo del template Fury

**Botón de Configuración**:
- Ubicado en footer del sidenav
- Icono: engranaje (settings)
- Texto: "Configuración"
- Abre panel lateral derecho con opciones de tema
- Botón flotante original ocultado

**Accesos Rápidos en Sidenav User**:
- **Icono 1** (send): Enviar notificaciones → `/notifications`
- **Icono 2** (calendar_month): Calendario → `/calendar`
- **Icono 3** (exit_to_app): Cerrar sesión

**Implementación**:
- `/workspace/src/app/app.component.ts`: Definición de items del menú
- `/workspace/src/app/layout/sidenav/`: Componente del sidenav con footer y accesos rápidos
- `/workspace/src/app/layout/layout.component.html`: Botón flotante comentado

---

### 7. Invoices (Facturación) - v2.1.3 ✅
Sistema completo de facturación formal con generación de PDF.

**Componentes**:
- Lista de facturas con filtros y búsqueda
- Detalle de factura con impresión directa
- Diálogo para generar factura desde Guest Account
- Servicio de generación de PDF (jsPDF)

**Características**:
- Numeración consecutiva automática (FAC-YYYYMM-XXXX)
- Captura de datos fiscales del cliente
- Solo facturable si cuenta cerrada y balance = 0
- Estados: active, cancelled
- Validación de factura única por cuenta
- Generación de PDF A4 profesional
- Generación de ticket térmico 80mm
- Impresión directa sin descargar
- Descarga de PDF opcional

**Integración Guest Accounts**:
- Botón "Generar Factura" en cuentas cerradas
- Indicador "Facturada" si ya existe factura
- Conversión automática de cargos a items de factura

**Generación de PDF**:
- jsPDF + jsPDF-AutoTable
- PDF A4 para impresoras láser/oficina
- Ticket 80mm para impresoras térmicas POS
- Impresión directa con window.print()
- Sin archivos descargados (opcional)

**Documentación**: `/workspace/INVOICING_MODULE_README.md`

---

### 8. Guest Accounts (Cuentas de Huéspedes) - v1.1.0
Sistema completo de gestión de folios que acumulan cargos durante la estadía.

**Componentes**:
- Lista con tabs (abiertas/cerradas)
- Detalle con cargos/pagos
- Dialogs para agregar cargos/pagos
- Integración automática con check-in

**Características**:
- IVA configurado en 13%
- Tipos de cargo: accommodation, pos, service, minibar, laundry, spa, restaurant, other
- Métodos de pago: cash, card, transfer, deposit
- Estados: open, closed
- Validación: solo se cierra si balance = 0

**Integración POS**:
- Selector de tipo de venta (Directa/Habitación)
- Cargar a habitación crea cargo automáticamente
- Reduce stock sin requerir caja abierta

**Accesos Rápidos**:
- Botón "Ver Cuenta" (morado) en tarjetas de habitaciones ocupadas
- Disponible en vista Grid y Lista

**Documentación**: `/workspace/GUEST_ACCOUNTS_MODULE_COMPLETE.md`

---

### 9. Estados de Habitación

#### Estado "Dirty" (Sucia)
Estado intermedio post check-out antes de limpieza.

**Flujo**: `available → reserved → occupied → dirty → cleaning → available`

**Características**:
- Color: Naranja (#f59e0b)
- Icono: warning
- Check-out cambia habitación a 'dirty' automáticamente

#### Estado "Reserved" (Reservada) - v2.0.0
Estado visual calculado dinámicamente en tiempo real.

**Lógica**:
- Habitación solo muestra "reserved" si tiene check-in programado para **HOY**
- Habitaciones con reservas futuras muestran "available"
- No se guarda en BD, se calcula con `RoomStatusService`

**Implementación**:
```typescript
// RoomStatusService combina habitaciones + reservas
getRoomsWithStatus(rooms$, bookings$): Observable<RoomWithStatus[]>
// Si room.status === 'available' Y tiene reserva HOY → displayStatus = 'reserved'
// Si room.status !== 'available' → displayStatus = room.status
```

**Características**:
- Color: Morado (#8b5cf6)
- Icono: event (calendario)
- Botón check-in visible solo en habitaciones 'reserved'
- No requiere actualizar BD al crear/cancelar reservas

**Estados en BD**: `available`, `occupied`, `dirty`, `cleaning`, `maintenance`, `blocked`
**Estados visuales**: Los anteriores + `reserved` (calculado)

**Documentación**: `/workspace/RESERVED_ROOM_STATUS_V2.md`

---

### 10. Confirmar Reservas
Funcionalidad para confirmar/cancelar reservas pendientes.

**Ubicación**: Bookings (Lista) y Calendar (Dialog)
**Comportamiento**: 
- Botón "Confirmar" visible solo si status === 'pending'
- Recarga automática de lista después de confirmar/cancelar

**Documentación**: `/workspace/BOOKING_CONFIRMATION_COMPLETE.md`

---

## Autenticación y Sesiones - v2.0.0 ✅

### AuthService
Manejo completo de autenticación con Firebase Auth y control de sesiones concurrentes.

**Características**:
- **Control de sesiones activas por usuario**
- **Límite de sesiones configurables** (maxSessions)
- **Heartbeat cada 5 minutos** para mantener sesión viva
- **Limpieza automática** de sesiones inactivas (>15 min sin heartbeat)
- **Superadmin sin límite de sesiones**
- **Transacciones atómicas** para garantizar consistencia

**Flujo de Login**:
1. Autentica con Firebase Auth
2. **Limpia sesiones inactivas** dentro de transacción atómica
3. Verifica límite de sesiones (después de limpieza)
4. Crea nueva sesión con timestamp
5. Inicia heartbeat automático
6. Guarda estado en localStorage

**Flujo de Logout**:
1. Detiene heartbeat
2. Elimina sesión actual de Firestore
3. Decrementa contador `activeSessionsCount`
4. Actualiza `hasActiveSession`
5. Limpia localStorage
6. Cierra sesión de Firebase Auth

**Estructura de Sesión en Firestore**:
```typescript
sessions: {
  "[sessionId]": {
    createdAt: Timestamp,
    lastHeartbeat: Timestamp,
    role: UserRole
  }
}
```

**Métodos principales**:
- `signIn()`: Inicia sesión, limpia sesiones inactivas y crea nueva sesión
- `signOut()`: Cierra sesión y limpia Firestore correctamente
- `getUserData()`: Obtiene datos completos del usuario
- `resetUserSessions()`: Elimina todas las sesiones (botón en perfil)
- `cleanupInactiveSessions()`: Limpia sesiones sin heartbeat reciente

**Optimización de Costos**:
- Heartbeat cada 5 minutos = ~96 escrituras/día por usuario
- Limpieza solo al login (no continua)
- Soporta hasta 200 usuarios activos en capa gratuita de Firebase

**Botón de Emergencia**:
- Ubicado en `/profile` → Tab Seguridad
- "Cerrar Todas las Sesiones"
- Resetea contador a 0 y elimina todas las sesiones
- Útil para resolver problemas de sesiones zombie

### Logout Implementado
**Ubicaciones**:
1. Sidenav - Botón logout en sección de usuario
2. Toolbar - Opción logout en dropdown de usuario

Ambos llaman `authService.signOut()` correctamente y limpian la sesión en Firestore.

---

## Manejo de Errores

### ErrorHandler - `/workspace/src/app/core/utils/error-handler.ts`

Catálogo centralizado de errores con códigos LH-XXXX.

**Categorías**:
- **LH-0001 a LH-0099**: Errores de autenticación
- **LH-0100 a LH-0199**: Errores de sesión
- **LH-0200 a LH-0299**: Errores de permisos
- **LH-0300 a LH-0399**: Errores de validación
- **LH-0400 a LH-0499**: Errores de negocio
- **LH-9999**: Error genérico

**Ejemplo**:
```typescript
// auth/invalid-credential → LH-0001
{
  code: 'LH-0001',
  title: 'Credenciales Incorrectas',
  message: 'El correo electrónico o la contraseña que ingresaste son incorrectos...',
  technicalMessage: 'Firebase: Error (auth/invalid-credential)'
}
```

**Uso en Login**:
```typescript
const errorDetail = ErrorHandler.getErrorDetail(error);
this.alertService.error(
  `${errorDetail.message}\n\nCódigo de error: ${errorDetail.code}`,
  errorDetail.title
);
```

---

## UI/UX Ajustes

### Vista Grid de Habitaciones
**Ajustes aplicados**:
- Removidas amenidades para garantizar homogeneidad
- Reducido padding/margin (gap 20px, padding 20px)
- Status badge fijo en parte inferior con `margin-top: auto`
- Cards más compactas y uniformes

### Sidenav - Información de Usuario
**Datos mostrados**:
- Avatar: `userData.avatarUrl` o default
- Nombre: `userData.firstName` (primera línea)
- Apellidos: `userData.lastName` (segunda línea)
- Rol: Traducido al español (tercera línea)

**Roles traducidos**:
- superadmin → Super Administrador
- admin → Administrador
- receptionist → Recepcionista
- housekeeper → Camarera
- manager → Gerente
- guest → Invitado

**Espaciado**:
- `line-height: 1.2` en todos los textos
- Mínimo margin entre elementos
- Avatar con margin-bottom: 8px

### Toolbar - Información de Usuario
**Datos mostrados**:
- Avatar: `userData.avatarUrl` o default
- Email: `userData.email` en lugar de nombre

---

## Servicios Clave

### RoomStatusService
Calcula estado visual de habitaciones dinámicamente.

```typescript
getRoomsWithStatus(rooms$, bookings$): Observable<RoomWithStatus[]>
// Combina habitaciones y reservas
// Retorna RoomWithStatus con displayStatus calculado
```

### BookingService
Gestión completa de reservas.

**Métodos importantes**:
- `createBooking()`: NO cambia estado de habitación
- `cancelBooking()`: NO cambia estado de habitación
- `checkIn()`: Cambia habitación a 'occupied', crea Guest Account
- `checkOut()`: Cambia habitación a 'dirty'
- `checkRoomAvailability()`: Valida solapamiento de fechas

### GuestAccountService
Gestión de cuentas de huéspedes.

**Métodos importantes**:
- `createAccountFromBooking()`: Crea cuenta en check-in con cargo de alojamiento
- `addCharge()`: Valida cuenta abierta, calcula IVA 13%
- `addPayment()`: Valida monto <= balance
- `closeAccount()`: Valida balance = 0

### ParametersService
Gestión de parámetros del sistema.

**Parámetros clave**:
- `roomStatuses`: Estados de habitación (incluye 'dirty' y 'reserved')
- `reservationStatuses`: Estados de reserva
- `paymentMethods`: Métodos de pago
- `productCategories`: Categorías de productos

**Recrear parámetros**:
1. Eliminar colección `parameters` en Firestore
2. Cerrar sesión
3. Iniciar sesión de nuevo
4. Sistema recrea parámetros automáticamente

---

## Reglas de Negocio

### Reservas
- Solo habitaciones activas pueden reservarse
- No se permiten fechas solapadas para misma habitación
- Capacidad debe ser suficiente para número de huéspedes
- Crear/cancelar reserva NO cambia estado físico de habitación
- Estado "reserved" es visual, calculado en tiempo real

### Check-in
- Solo reservas 'confirmed' pueden hacer check-in
- Habitación debe estar en estado 'available' (muestra 'reserved' visualmente)
- Crea Guest Account automáticamente con cargo de alojamiento
- Habitación cambia a 'occupied'

### Check-out
- Solo reservas 'checked-in' pueden hacer check-out
- Habitación cambia a 'dirty' (no 'cleaning')
- Guest Account permanece abierta hasta cerrar manualmente
- Debe tener balance = 0 para cerrar cuenta

### Guest Accounts
- Solo cuentas 'open' pueden recibir cargos
- IVA 13% aplicado a todos los cargos
- Pagos no pueden exceder balance pendiente
- Solo se puede cerrar si balance = 0

---

## Firestore Collections

### users
```typescript
{
  uid: string,
  firstName: string,
  lastName: string,
  email: string,
  role: UserRole,
  avatarUrl?: string,
  active: boolean,
  maxSessions: number,
  activeSessionsCount: number,
  sessions: { [sessionId]: SessionData }
}
```

### rooms
```typescript
{
  roomNumber: string,
  floor: number,
  roomType: string,
  status: 'available' | 'occupied' | 'dirty' | 'cleaning' | 'maintenance' | 'blocked',
  capacity: number,
  basePrice: number,
  isActive: boolean
}
```

### bookings
```typescript
{
  bookingNumber: string,
  guestId: string,
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  status: 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled' | 'no-show',
  totalPrice: number
}
```

### guestAccounts
```typescript
{
  bookingId: string,
  roomId: string,
  guestName: string,
  status: 'open' | 'closed',
  charges: Charge[],
  payments: Payment[],
  subtotal: number,
  tax: number,
  total: number,
  balance: number
}
```

### rolePermissions
```typescript
{
  role: string,              // 'superadmin', 'admin', 'receptionist', etc.
  displayName: string,       // 'Super Administrador', 'Recepcionista', etc.
  routes: string[],          // ['/dashboard', '/bookings', ...] o ['*']
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### notifications
```typescript
{
  id?: string,
  userId: string,
  type: 'check-in' | 'check-out' | 'housekeeping' | 'booking' | 'payment' | 'inventory' | 'system',
  title: string,
  message: string,
  read: boolean,
  createdAt: Date,
  actionUrl?: string,
  priority: 'low' | 'medium' | 'high',
  metadata?: {
    bookingId?: string,
    taskId?: string,
    roomId?: string,
    productId?: string
  }
}
```

### invoices
```typescript
{
  invoiceNumber: string,        // FAC-202402-0001
  type: 'guest_account' | 'pos',
  referenceId: string,          // ID de Guest Account o Sale
  clientName: string,
  clientTaxId: string,          // NIT/RFC
  clientAddress?: string,
  clientEmail?: string,
  clientPhone?: string,
  items: InvoiceItem[],
  subtotal: number,
  tax: number,
  total: number,
  status: 'active' | 'cancelled',
  issuedAt: Date,
  issuedBy: string,
  issuedByName: string,
  cancelledAt?: Date,
  cancelledBy?: string,
  cancelReason?: string,
  notes?: string
}
```

---

## Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'superadmin'];
    }

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }

    match /rooms/{roomId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /bookings/{bookingId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    match /guestAccounts/{accountId} {
      allow read, create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    match /parameters/{paramId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /rolePermissions/{roleId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /notifications/{notificationId} {
      allow read, update, delete: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated();
    }

    match /invoices/{invoiceId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }
  }
}
```

---

## Comandos Útiles

### Desarrollo
```bash
npm start                    # Inicia servidor de desarrollo
ng serve                     # Alternativa
ng build                     # Build de producción
ng test                      # Ejecuta tests
```

### Firebase
```bash
firebase deploy              # Despliega a Firebase
firebase deploy --only hosting  # Solo hosting
firebase deploy --only firestore:rules  # Solo reglas
```

---

## Problemas Conocidos y Soluciones

### 1. Error "Missing or insufficient permissions" al hacer logout
**Causa**: Componentes intentan cargar datos después del logout
**Solución**: Implementar `ngOnDestroy` con `takeUntil` en componentes que suscriben a observables

```typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(...);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 2. Estado "dirty" no aparece en formulario de edición
**Causa**: Parámetros en Firestore desactualizados
**Solución**: Eliminar colección `parameters` y reiniciar sesión

### 3. Avatar no se muestra
**Causa**: Campo incorrecto (usar `avatarUrl` no `photoURL`)
**Solución**: Verificar que el campo en User model sea `avatarUrl`

---

## Próximas Mejoras Sugeridas

### Reportes Financieros (Prioridad ALTA) ⭐
- [ ] Dashboard con métricas de ocupación y RevPAR
- [ ] Reporte de ingresos consolidados (Guest Accounts + POS)
- [ ] Flujo de caja real
- [ ] Cuentas por cobrar
- [ ] Análisis de rentabilidad
- [ ] Exportar reportes a Excel/PDF

### Módulo de Facturación - Fase 2
- [ ] Agregar logo del hotel en PDF
- [ ] Marca de agua "PAGADO" en facturas
- [ ] Código QR con datos de factura
- [ ] Envío automático por email
- [ ] Guardar PDF en Firebase Storage
- [ ] Notas de crédito
- [ ] Factura electrónica (integración fiscal)
- [ ] Facturación desde POS directo

### Funcionalidades Operativas
- [ ] Notificaciones automáticas de llegadas/salidas
- [ ] Check-in online para huéspedes
- [ ] Gestión de inventario avanzada (minibar, amenidades)
- [ ] CRM básico (historial de huéspedes, preferencias)
- [ ] Sistema de calificaciones y reviews

### Optimizaciones
- [ ] Cache de parámetros en localStorage
- [ ] Paginación en listas grandes
- [ ] Búsqueda avanzada con filtros múltiples

---

## Documentación Disponible

### Módulos Principales
1. `/workspace/PERMISSIONS_SYSTEM.md` - Sistema de Permisos por Rol (RBAC) 🔒
2. `/workspace/NOTIFICACIONES.md` - Sistema de Notificaciones (completo) ⭐
3. `/workspace/INVOICING_MODULE_README.md` - Módulo de Facturación (completo)
4. `/workspace/GUEST_ACCOUNTS_MODULE_COMPLETE.md` - Módulo de Cuentas
5. `/workspace/CASH_REGISTER_POS_SYSTEM.md` - Sistema de Caja y POS
6. `/workspace/HOUSEKEEPING_MODULE.md` - Módulo de Housekeeping (completo)
7. `/workspace/HOUSEKEEPING_COMPLETION.md` - Housekeeping - Fixes y completitud
8. `/workspace/BOOKING_CONFIRMATION_COMPLETE.md` - Confirmar reservas
9. `/workspace/RESERVED_ROOM_STATUS_V2.md` - Estado "Reservada" dinámico

### Facturación (Detalles)
10. `/workspace/BILLING_FINANCIAL_MODULE_PROPOSAL.md` - Propuesta completa (Fases 1-4)
11. `/workspace/INVOICING_MODULE_PHASE1_COMPLETE.md` - Implementación Fase 1
12. `/workspace/INVOICING_FIXES.md` - Correcciones aplicadas
13. `/workspace/PDF_GENERATION_RECOMMENDATIONS.md` - Análisis de librerías PDF
14. `/workspace/PDF_GENERATION_IMPLEMENTATION.md` - Implementación de PDF
15. `/workspace/DIRECT_PRINT_IMPLEMENTATION.md` - Impresión directa

### General
16. `/workspace/README.md` - Documentación general del template Fury
17. `/workspace/CONTEXTO.md` - Este archivo
18. `/workspace/PATRON_REPOSITORY.md` - Patrón Repository

---

## Notas Importantes

### Para el Desarrollador
- Usuario trabaja en dev container
- Requiere documentación exhaustiva para mantener contexto entre sesiones
- Preferencia por código mínimo sin verbosidad
- UI en español, código en inglés

### Convenciones
- Nombres de archivos: kebab-case
- Componentes: PascalCase
- Servicios: camelCase con sufijo Service
- Interfaces: PascalCase
- Constantes: UPPER_SNAKE_CASE

### Firebase
- No usar valores `undefined` en Firestore
- Solo agregar campos opcionales si tienen valor
- Usar `serverTimestamp()` para fechas del servidor
- Convertir Timestamps a Date en repositories

---

## Estado Actual del Proyecto

✅ **Funcional y Estable**

**Módulos Completos**:
- Sistema de Permisos por Rol (RBAC) con gestión dinámica ✅
- Profile y Help con documentación adaptada por rol ✅
- Sistema de Notificaciones en tiempo real con Firestore ✅
- Guest Accounts con POS integration
- Estados de habitación (available, reserved, occupied, dirty, cleaning, maintenance, blocked)
- Flujo completo de reservas con prevención de overbooking
- Autenticación con control de sesiones
- Manejo de errores centralizado
- UI actualizada con datos reales de usuario

**Última Implementación**: 
- Sistema de Permisos por Rol (RBAC) v1.0 ✅
- Profile y Help con documentación dinámica por rol ✅
- Sistema de Notificaciones v1.0 con listeners en tiempo real ✅
- SweetAlert2 para notificaciones de alta prioridad ✅
- Módulo de gestión de notificaciones (/notifications) ✅
- Triggers automáticos en Housekeeping y Bookings ✅
- Accesos rápidos en sidenav (notificaciones, calendario) ✅
- Dashboard Financiero con KPIs hoteleros (RevPAR, ADR, Ocupación) ✅
- Efectivo en caja desglosado por método de pago ✅
- Housekeeping v2.0 con completar tareas desde múltiples ubicaciones ✅
- Menú lateral reorganizado en grupos lógicos ✅
- Botón de configuración movido a footer del sidenav ✅
- Corrección crítica: Reemplazo de .toPromise() por firstValueFrom() ✅

**Versión**: 2.4.0
**Última Actualización**: 2024-02-16
