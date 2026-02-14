# Módulo Guest Accounts (Cuentas de Huéspedes) - COMPLETADO ✓

## Descripción General

El módulo **Guest Accounts** gestiona las cuentas financieras de los huéspedes durante su estadía en el hotel. Actúa como un "folio" que acumula todos los cargos (alojamiento, servicios, POS, etc.) y pagos hasta el check-out.

## Flujo de Negocio

```
1. Check-in → Crea Guest Account automáticamente
   └─ Cargo inicial: Alojamiento (noches × precio base)

2. Durante la estadía → Agregar cargos
   ├─ POS: Ventas a habitación
   ├─ Servicios: Lavandería, Spa, Room Service
   ├─ Minibar: Consumos
   └─ Otros: Cargos adicionales

3. Pagos parciales (opcional)
   └─ Registrar anticipos o pagos parciales

4. Check-out → Cerrar cuenta
   ├─ Validar saldo = 0
   ├─ Registrar pago final
   └─ Generar factura (futuro: módulo Billing)
```

## Arquitectura

### Modelos de Dominio

**GuestAccount** (`/domain/models/guest-account.model.ts`)
```typescript
{
  id: string;
  bookingId: string;
  bookingNumber: string;
  guestId: string;
  guestName: string;
  roomId: string;
  roomNumber: string;
  status: 'open' | 'closed';
  checkInDate: Date;
  checkOutDate?: Date;
  charges: Charge[];
  payments: Payment[];
  subtotal: number;
  tax: number;          // 13% IVA
  total: number;
  paid: number;
  balance: number;
  createdAt: Date;
  createdBy: string;
  closedAt?: Date;
  closedBy?: string;
}
```

**Charge** (Cargo)
```typescript
{
  id?: string;
  accountId: string;
  type: 'accommodation' | 'pos' | 'service' | 'minibar' | 'laundry' | 'spa' | 'restaurant' | 'other';
  description: string;
  amount: number;
  quantity: number;
  total: number;        // amount × quantity
  date: Date;
  reference?: string;   // ID de venta POS o servicio
  createdBy: string;
}
```

**Payment** (Pago)
```typescript
{
  id?: string;
  accountId: string;
  method: 'cash' | 'card' | 'transfer' | 'deposit';
  amount: number;
  reference?: string;
  notes?: string;
  date: Date;
  createdBy: string;
}
```

### Capa de Datos

**Repository** (`/core/repositories/guest-account-firebase.repository.ts`)
- Implementa patrón Repository
- Maneja conversión de Timestamps de Firestore
- Queries especializadas por status, booking, room

**Service** (`/core/services/guest-account.service.ts`)
- Lógica de negocio
- Validaciones (cuenta abierta, saldo, etc.)
- Cálculo automático de totales (subtotal, IVA 13%, total, balance)
- Métodos principales:
  - `createAccountFromBooking()`: Crea cuenta en check-in
  - `addCharge()`: Agrega cargo
  - `addPayment()`: Registra pago
  - `closeAccount()`: Cierra cuenta (valida saldo = 0)

### Integración con BookingService

**Modificación en `booking.service.ts`**
```typescript
async checkIn(id: string, userId: string): Promise<void> {
  // ... validaciones ...
  
  // Crear cuenta de huésped automáticamente
  const existingAccount = await firstValueFrom(
    this.guestAccountService.getByBooking(id)
  );
  if (!existingAccount) {
    await this.guestAccountService.createAccountFromBooking(booking, userId);
  }
  
  // ... cambiar estados ...
}
```

## Componentes UI

### 1. GuestAccountsComponent (Principal)
**Ruta**: `/guest-accounts`
- 2 tabs: Cuentas Abiertas | Cuentas Cerradas
- Delega a AccountsListComponent

### 2. AccountsListComponent (Lista)
**Props**: `@Input() status: 'open' | 'closed'`
- Tabla con columnas: Habitación, Huésped, Check-in, Total, Saldo, Acciones
- Click en "Ver" → navega a detalle

### 3. AccountDetailComponent (Detalle)
**Ruta**: `/guest-accounts/:id`
- **Header**: Info de cuenta (huésped, habitación, check-in, estado)
- **Summary Card**: Subtotal, IVA, Total, Pagado, Saldo (con gradiente morado)
- **Tabla de Cargos**: Fecha, Tipo, Descripción, Cantidad, Precio, Total
- **Tabla de Pagos**: Fecha, Método, Monto, Referencia
- **Acciones** (solo si status = 'open'):
  - Agregar Cargo
  - Registrar Pago
  - Cerrar Cuenta (valida saldo = 0)

### 4. AddChargeDialogComponent (Dialog)
**Campos**:
- Tipo de cargo (select)
- Descripción (text)
- Precio unitario (number)
- Cantidad (number)
- Referencia opcional (text)
- **Display**: Total calculado en tiempo real

### 5. AddPaymentDialogComponent (Dialog)
**Campos**:
- Método de pago (select)
- Monto (number, max = balance)
- Referencia opcional (text)
- Notas opcional (textarea)
- **Display**: Saldo pendiente en card con gradiente
- **Botón**: "Pagar Total" (rellena monto con balance)

## Estilos Destacados

### Summary Card (Gradiente Morado)
```scss
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
color: white;
```

### Indicadores de Saldo
- **Saldo = 0**: Verde (#4caf50)
- **Saldo > 0**: Rojo (#f44336)

## Firestore Collection

**Colección**: `guestAccounts`

**Índices Requeridos**:
```
- status + checkInDate (desc)
- bookingId
- roomNumber + checkInDate (desc)
```

**Estructura de Documento**:
```json
{
  "bookingId": "abc123",
  "bookingNumber": "BK-20260213-001",
  "guestId": "guest123",
  "guestName": "Juan Pérez",
  "roomId": "room101",
  "roomNumber": "101",
  "status": "open",
  "checkInDate": Timestamp,
  "charges": [
    {
      "type": "accommodation",
      "description": "Alojamiento - 3 noche(s)",
      "amount": 100,
      "quantity": 3,
      "total": 300,
      "date": Timestamp,
      "createdBy": "user123",
      "createdAt": Timestamp
    }
  ],
  "payments": [],
  "subtotal": 300,
  "tax": 39,
  "total": 339,
  "paid": 0,
  "balance": 339,
  "createdAt": Timestamp,
  "createdBy": "user123"
}
```

## Validaciones Implementadas

1. **Agregar Cargo**:
   - ✓ Cuenta debe estar abierta
   - ✓ Precio > 0
   - ✓ Cantidad >= 1

2. **Registrar Pago**:
   - ✓ Cuenta debe estar abierta
   - ✓ Monto > 0
   - ✓ Monto <= balance

3. **Cerrar Cuenta**:
   - ✓ Cuenta debe estar abierta
   - ✓ Balance debe ser 0

## Cálculo de Totales

```typescript
subtotal = Σ(charge.total)
tax = subtotal × 0.13  // 13% IVA
total = subtotal + tax
paid = Σ(payment.amount)
balance = total - paid
```

## Integración Futura

### Con POS Module
```typescript
// Al vender a habitación en POS
await guestAccountService.addCharge(accountId, {
  type: 'pos',
  description: 'Hamburguesa con papas',
  amount: 8.50,
  quantity: 1,
  reference: saleId  // ID de la venta en POS
}, userId);
```

### Con Services Module (Lavandería, Spa, etc.)
```typescript
// Al registrar servicio
await guestAccountService.addCharge(accountId, {
  type: 'laundry',
  description: 'Lavado de 2 camisas',
  amount: 5.00,
  quantity: 2,
  reference: serviceId
}, userId);
```

### Con Billing Module (Futuro)
```typescript
// Al cerrar cuenta, generar factura
const invoice = await billingService.generateInvoiceFromAccount(accountId);
await guestAccountService.closeAccount(accountId, userId);
```

## Rutas y Navegación

```
/guest-accounts              → Lista (tabs: abiertas/cerradas)
/guest-accounts/:id          → Detalle de cuenta
```

**Menú**:
- Nombre: "Cuentas"
- Icono: `receipt_long`
- Posición: 19.8 (después de Recepción)

## Archivos Creados

### Modelos y Repositorios
1. `/domain/models/guest-account.model.ts`
2. `/domain/repositories/guest-account.repository.ts`
3. `/core/repositories/guest-account-firebase.repository.ts`
4. `/core/services/guest-account.service.ts`

### Componentes
5. `/features/private/guest-accounts/guest-accounts.component.ts/html/scss`
6. `/features/private/guest-accounts/accounts-list/accounts-list.component.ts/html/scss`
7. `/features/private/guest-accounts/account-detail/account-detail.component.ts/html/scss`
8. `/features/private/guest-accounts/add-charge-dialog/add-charge-dialog.component.ts/html/scss`
9. `/features/private/guest-accounts/add-payment-dialog/add-payment-dialog.component.ts/html/scss`

### Módulo y Routing
10. `/features/private/guest-accounts/guest-accounts.module.ts`
11. `/features/private/guest-accounts/guest-accounts-routing.module.ts`

### Modificaciones
12. `/core/services/booking.service.ts` - Integración en checkIn()
13. `/app-routing.module.ts` - Ruta lazy loading
14. `/app.component.ts` - Item de menú

## Métricas

- **Archivos creados**: 14 nuevos
- **Archivos modificados**: 3
- **Líneas de código**: ~1,200
- **Componentes**: 5
- **Servicios**: 1
- **Repositorios**: 1
- **Modelos**: 3 interfaces principales

## Testing Manual

### Flujo Completo
1. ✓ Crear reserva y confirmarla
2. ✓ Hacer check-in → Verifica que se cree cuenta automáticamente
3. ✓ Ir a /guest-accounts → Ver cuenta en tab "Abiertas"
4. ✓ Click en cuenta → Ver detalle con cargo de alojamiento
5. ✓ Agregar cargo manual (ej: minibar)
6. ✓ Registrar pago parcial
7. ✓ Registrar pago final (balance = 0)
8. ✓ Cerrar cuenta → Verifica que pase a tab "Cerradas"

## Próximos Pasos

1. ~~**Módulo POS Enhancement**~~ ✅ COMPLETADO
   - ~~Agregar opción "Cargar a Habitación"~~ ✅
   - ~~Integrar con GuestAccountService~~ ✅

2. **Módulo Services**
   - Lavandería, Spa, Room Service
   - Integrar con GuestAccountService

3. **Módulo Billing/Invoicing**
   - Generar facturas desde Guest Account
   - Integración con sistema fiscal

4. **Reportes**
   - Reporte de cuentas por cobrar
   - Análisis de consumo por tipo de cargo

## Mejoras Implementadas Post-Lanzamiento

### 1. POS Enhancement ✅
**Fecha**: 2026-02-13

**Funcionalidad agregada:**
- Selector de tipo de venta: "Venta Directa" vs "Cargar a Habitación"
- Selector de habitaciones ocupadas (muestra: Hab. 101 - Juan Pérez)
- Integración automática con Guest Accounts
- Reducción de stock al cargar a habitación

**Flujo:**
```
1. Usuario agrega productos al carrito en POS
2. Selecciona "Cargar a Habitación"
3. Elige habitación ocupada del selector
4. Sistema crea cargo en Guest Account (tipo: 'pos')
5. Reduce stock de productos automáticamente
```

**Archivos modificados:**
- `/features/private/pos/pos.component.ts` - Lógica de carga a habitación
- `/features/private/pos/pos.component.html` - Selector de tipo de venta
- `/core/services/product.service.ts` - Método updateStock()
- `/core/services/guest-account.service.ts` - Fix campos undefined

### 2. Accesos Rápidos desde Habitaciones ✅
**Fecha**: 2026-02-13

**Funcionalidad agregada:**
- Botón "Ver Cuenta" en tarjetas de habitaciones ocupadas
- Navegación directa a `/guest-accounts/:id`
- Disponible en vista Grid y vista Lista

**Ubicación:**
- Vista Grid: Botón morado en acciones de habitación ocupada
- Vista Lista: Opción "Ver Cuenta" en menú de acciones

**Archivos modificados:**
- `/features/private/rooms/rooms-grid/rooms-grid.component.ts`
- `/features/private/rooms/rooms-grid/rooms-grid.component.html`
- `/features/private/rooms/rooms-list/rooms-list.component.ts`
- `/features/private/rooms/rooms-list/rooms-list.component.html`

### 3. Nuevo Estado de Habitación: "Sucia" ✅
**Fecha**: 2026-02-13

**Problema resuelto:**
Anteriormente, al hacer check-out la habitación pasaba directamente a "En Limpieza" sin tarea asignada.

**Solución:**
Nuevo flujo de estados:
```
available → occupied → dirty → cleaning → available
```

**Estados:**
- `available`: Disponible (verde)
- `occupied`: Ocupada (rojo)
- `dirty`: Sucia - Check-out realizado, pendiente de limpieza (naranja) 🆕
- `cleaning`: En limpieza - Con tarea asignada (azul)
- `maintenance`: En mantenimiento (morado)

**Flujo correcto:**
1. Check-out → Habitación pasa a `dirty`
2. Crear tarea de limpieza → Habitación pasa a `cleaning`
3. Completar tarea → Habitación pasa a `available`

**Archivos modificados:**
- `/core/services/booking.service.ts` - checkOut() cambia a 'dirty'
- `/core/services/parameters.service.ts` - Agregado estado 'dirty'
- `/features/private/rooms/rooms-grid/rooms-grid.component.ts` - Estilos para 'dirty'

### 4. Fix Campos Undefined en Firestore ✅
**Fecha**: 2026-02-13

**Problema:**
Error al agregar cargos: "Unsupported field value: undefined"

**Solución:**
Solo agregar campos opcionales si tienen valor:
```typescript
const charge: Charge = {
  // campos requeridos...
};

if (dto.reference) {
  charge.reference = dto.reference;
}
```

**Archivos modificados:**
- `/core/services/guest-account.service.ts` - addCharge() y addPayment()

## Notas Técnicas

- **IVA**: Configurado en 13% (hardcoded en service)
- **Moneda**: USD por defecto
- **Firestore**: Usa arrays embebidos para charges y payments (límite: 1MB por documento)
- **Validación**: Solo se puede cerrar cuenta con balance = 0
- **Seguridad**: Todas las operaciones requieren userId para auditoría

---

**Estado**: ✅ COMPLETADO Y MEJORADO
**Fecha Inicial**: 2026-02-13
**Última Actualización**: 2026-02-13
**Versión**: 1.1.0

**Mejoras v1.1.0:**
- ✅ POS Enhancement: Cargar a Habitación
- ✅ Accesos rápidos desde Habitaciones
- ✅ Nuevo estado "Sucia" para habitaciones
- ✅ Fix campos undefined en Firestore
