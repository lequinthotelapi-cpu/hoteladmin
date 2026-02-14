# Estado "Reservada" para Habitaciones

## Versión: 1.0.0
## Fecha: 2024

---

## Descripción General

Implementación del estado intermedio **"reserved"** (Reservada) para habitaciones con reservas pendientes o confirmadas pero sin check-in realizado. Esto evita overbooking y proporciona visibilidad clara del estado de las habitaciones.

---

## Flujo de Estados de Habitación

### Nuevo Flujo Completo

```
available (Disponible)
    ↓ [Crear Reserva]
reserved (Reservada)
    ↓ [Check-in]
occupied (Ocupada)
    ↓ [Check-out]
dirty (Sucia)
    ↓ [Iniciar Limpieza]
cleaning (En Limpieza)
    ↓ [Completar Limpieza]
available (Disponible)
```

### Transiciones Especiales

- **Cancelar Reserva**: `reserved` → `available`
- **Mantenimiento**: Cualquier estado → `maintenance`
- **Bloquear**: Cualquier estado → `blocked`

---

## Cambios Implementados

### 1. Parámetros de Sistema

**Archivo**: `parameters.service.ts`

```typescript
roomStatuses: [
  { value: 'available', label: 'Disponible', active: true, order: 0 },
  { value: 'reserved', label: 'Reservada', active: true, order: 1 },  // NUEVO
  { value: 'occupied', label: 'Ocupada', active: true, order: 2 },
  { value: 'dirty', label: 'Sucia', active: true, order: 3 },
  { value: 'cleaning', label: 'En Limpieza', active: true, order: 4 },
  { value: 'maintenance', label: 'Mantenimiento', active: true, order: 5 },
  { value: 'blocked', label: 'Bloqueada', active: true, order: 6 }
]
```

### 2. Servicio de Reservas

**Archivo**: `booking.service.ts`

#### Crear Reserva
```typescript
async createBooking(dto: CreateBookingDto, userId: string): Promise<string> {
  // ... validaciones ...
  
  const bookingId = await this.repository.create(booking);
  
  // Cambiar habitación a reserved
  await this.roomService.changeRoomStatus(dto.roomId, 'reserved', userId);
  
  return bookingId;
}
```

#### Cancelar Reserva
```typescript
async cancelBooking(id: string, userId: string): Promise<void> {
  const booking = await firstValueFrom(this.repository.getById(id));
  
  if (booking.status === 'checked-in') {
    throw new Error('No se puede cancelar una reserva con check-in realizado');
  }

  // Cambiar habitación a available
  await this.roomService.changeRoomStatus(booking.roomId, 'available', userId);

  await this.repository.update(id, { 
    status: 'cancelled',
    updatedBy: userId
  });
}
```

#### Check-in
```typescript
async checkIn(id: string, userId: string): Promise<void> {
  // ... validaciones y creación de cuenta ...
  
  // Cambiar estado de la habitación a occupied
  await this.roomService.changeRoomStatus(booking.roomId, 'occupied', userId);
  
  // Cambiar estado de la reserva
  await this.repository.update(id, { 
    status: 'checked-in',
    updatedBy: userId
  });
}
```

#### Búsqueda de Disponibilidad
```typescript
async searchAvailableRooms(criteria: BookingSearchCriteria): Promise<AvailableRoom[]> {
  // Incluir habitaciones 'available' y 'reserved' en búsqueda
  const activeRooms = allRooms.filter(r => 
    r.isActive && (r.status === 'available' || r.status === 'reserved')
  );
  
  // ... resto de lógica de filtrado y validación de disponibilidad ...
}
```

### 3. Vista Grid de Habitaciones

**Archivo**: `rooms-grid.component.ts`

#### Colores y Estilos
```typescript
getStatusColor(status: string): string {
  const colorMap: { [key: string]: string } = {
    'available': '#10b981',   // Verde
    'reserved': '#8b5cf6',    // Morado - NUEVO
    'occupied': '#ef4444',    // Rojo
    'dirty': '#f59e0b',       // Naranja
    'cleaning': '#3b82f6',    // Azul
    'maintenance': '#6366f1'  // Índigo
  };
  return colorMap[status] || '#6366f1';
}

getStatusIcon(status: string): string {
  const iconMap: { [key: string]: string } = {
    'available': 'check_circle',
    'reserved': 'event',              // NUEVO
    'occupied': 'hotel',
    'dirty': 'warning',
    'cleaning': 'cleaning_services',
    'maintenance': 'build'
  };
  return iconMap[status] || 'info';
}
```

#### Botón Check-in
```html
<button mat-mini-fab 
        style="background-color: #10b981; color: white;" 
        (click)="checkInRoom(room)" 
        matTooltip="Check-in"
        *ngIf="room.status === 'reserved'">  <!-- Cambio: era 'available' -->
  <mat-icon>login</mat-icon>
</button>
```

### 4. Vista Lista de Habitaciones

**Archivo**: `rooms-list.component.ts`

#### Badge de Estado
```typescript
getStatusBadgeClass(status: string): string {
  const statusMap: { [key: string]: string } = {
    'available': 'badge-success',
    'reserved': 'badge-info',      // NUEVO
    'occupied': 'badge-danger',
    'dirty': 'badge-warning',
    'cleaning': 'badge-primary',
    'maintenance': 'badge-secondary'
  };
  return statusMap[status] || 'badge-secondary';
}
```

#### Menú de Acciones
```html
<button mat-menu-item (click)="checkInRoom(room)" 
        *ngIf="room.status === 'reserved'">  <!-- Cambio: era 'available' -->
  <mat-icon style="color: #10b981;">login</mat-icon>
  <span>Check-in</span>
</button>
```

---

## Comportamiento del Sistema

### Al Crear una Reserva

1. Usuario crea reserva desde Bookings o Calendar
2. Sistema valida disponibilidad de habitación
3. Sistema crea registro de reserva con status `pending`
4. **Sistema cambia habitación a estado `reserved`**
5. Habitación ya NO aparece como disponible visualmente

### Al Confirmar una Reserva

1. Usuario confirma reserva desde Bookings
2. Sistema cambia status de reserva a `confirmed`
3. **Habitación permanece en estado `reserved`**
4. Reserva aparece en Front Desk (Llegadas)

### Al Hacer Check-in

1. Usuario hace check-in desde Front Desk o vista de Habitaciones
2. Sistema valida que reserva esté confirmada
3. Sistema crea Guest Account automáticamente
4. **Sistema cambia habitación de `reserved` a `occupied`**
5. Sistema cambia reserva a `checked-in`

### Al Cancelar una Reserva

1. Usuario cancela reserva desde Bookings
2. Sistema valida que no tenga check-in realizado
3. **Sistema cambia habitación de `reserved` a `available`**
4. Sistema cambia reserva a `cancelled`
5. Habitación vuelve a estar disponible para nuevas reservas

---

## Identificación Visual

### Estado "Reservada"

- **Color Principal**: Morado (`#8b5cf6`)
- **Color Fondo**: Morado claro (`rgba(139, 92, 246, 0.08)`)
- **Color Icono Fondo**: Morado muy claro (`#ede9fe`)
- **Icono**: `event` (calendario)
- **Badge**: `badge-info` (azul claro)

### Comparación de Estados

| Estado | Color | Icono | Significado |
|--------|-------|-------|-------------|
| Disponible | Verde | check_circle | Sin reservas, lista para reservar |
| **Reservada** | **Morado** | **event** | **Con reserva, esperando check-in** |
| Ocupada | Rojo | hotel | Con huésped activo |
| Sucia | Naranja | warning | Post check-out, requiere limpieza |
| En Limpieza | Azul | cleaning_services | Siendo limpiada |
| Mantenimiento | Índigo | build | En reparación |

---

## Impacto en Otros Módulos

### Búsqueda de Disponibilidad

- Habitaciones `reserved` se incluyen en búsqueda
- Sistema valida solapamiento de fechas
- Si fechas no se solapan, habitación puede reservarse nuevamente

### Front Desk

- Check-in solo disponible para habitaciones `reserved`
- Llegadas muestran habitaciones con estado `reserved`

### Housekeeping

- Tareas de limpieza NO se crean para habitaciones `reserved`
- Solo aplica para estados `dirty` y `cleaning`

### Guest Accounts

- Cuentas solo se crean al hacer check-in
- Habitación debe estar en `occupied` para tener cuenta activa

---

## Validaciones Implementadas

### Crear Reserva
- ✅ Habitación debe existir y estar activa
- ✅ Fechas no deben solaparse con otras reservas
- ✅ Capacidad debe ser suficiente
- ✅ Habitación cambia a `reserved` automáticamente

### Check-in
- ✅ Reserva debe estar en estado `confirmed`
- ✅ Habitación debe estar en estado `reserved`
- ✅ Fecha de check-in debe ser hoy
- ✅ Crea Guest Account automáticamente

### Cancelar Reserva
- ✅ No se puede cancelar si ya tiene check-in
- ✅ Habitación vuelve a `available` automáticamente
- ✅ Libera disponibilidad para nuevas reservas

---

## Casos de Uso

### Caso 1: Reserva Normal
```
1. Cliente reserva habitación 101 para mañana
   → Habitación 101: available → reserved
2. Mañana, cliente llega y hace check-in
   → Habitación 101: reserved → occupied
3. Cliente hace check-out
   → Habitación 101: occupied → dirty
4. Housekeeping limpia
   → Habitación 101: dirty → cleaning → available
```

### Caso 2: Cancelación
```
1. Cliente reserva habitación 102
   → Habitación 102: available → reserved
2. Cliente cancela reserva
   → Habitación 102: reserved → available
3. Habitación disponible para nueva reserva
```

### Caso 3: Múltiples Reservas
```
1. Cliente A reserva habitación 103 del 1-5 de enero
   → Habitación 103: available → reserved
2. Cliente B intenta reservar habitación 103 del 3-7 de enero
   → Sistema rechaza: fechas se solapan
3. Cliente B reserva habitación 103 del 6-10 de enero
   → Sistema acepta: fechas no se solapan
   → Habitación 103 permanece en reserved
```

---

## Notas Técnicas

### Migración de Datos Existentes

Si hay habitaciones con reservas activas en estado `available`:

```typescript
// Script de migración (ejecutar una vez)
async function migrateRoomStatuses() {
  const bookings = await getActiveBookings(); // pending o confirmed
  
  for (const booking of bookings) {
    if (booking.status !== 'checked-in' && booking.status !== 'checked-out') {
      await roomService.changeRoomStatus(booking.roomId, 'reserved', 'system');
    }
  }
}
```

### Firestore Rules

No requiere cambios en reglas de seguridad. El nuevo estado se maneja igual que los existentes.

### Performance

- Sin impacto en performance
- Mismas queries que antes
- Solo agrega validación de estado adicional

---

## Testing

### Escenarios a Probar

1. ✅ Crear reserva cambia habitación a `reserved`
2. ✅ Cancelar reserva cambia habitación a `available`
3. ✅ Check-in cambia habitación de `reserved` a `occupied`
4. ✅ Habitación `reserved` muestra color morado e icono calendario
5. ✅ Botón check-in solo visible en habitaciones `reserved`
6. ✅ Búsqueda de disponibilidad incluye habitaciones `reserved`
7. ✅ No se puede reservar habitación con fechas solapadas

---

## Beneficios

### Para el Hotel

- ✅ **Evita overbooking**: Habitaciones reservadas no aparecen como disponibles
- ✅ **Visibilidad clara**: Estado visual diferencia disponible vs reservada
- ✅ **Control de inventario**: Saber exactamente qué habitaciones están comprometidas

### Para el Personal

- ✅ **Menos errores**: No se puede asignar habitación ya reservada
- ✅ **Mejor planificación**: Ver qué habitaciones tendrán llegadas
- ✅ **Flujo claro**: Check-in solo en habitaciones reservadas

### Para los Huéspedes

- ✅ **Confirmación garantizada**: Su reserva bloquea la habitación
- ✅ **Sin sorpresas**: No hay riesgo de que su habitación se asigne a otro
- ✅ **Proceso fluido**: Check-in más rápido y confiable

---

## Conclusión

El estado "Reservada" es una mejora crítica que alinea el sistema con las mejores prácticas hoteleras estándar. Proporciona control de inventario adecuado, evita overbooking y mejora la experiencia tanto del personal como de los huéspedes.

**Estado**: ✅ Implementado y Funcional
**Versión**: 1.0.0
**Última Actualización**: 2024
