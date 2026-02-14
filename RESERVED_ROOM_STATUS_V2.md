# Estado "Reservada" - Implementación Dinámica

## Versión: 2.0.0 (Implementación Correcta)
## Fecha: 2024

---

## Resumen Ejecutivo

Implementación de estado visual "Reservada" calculado dinámicamente en tiempo real. Una habitación solo muestra estado "reserved" si tiene check-in programado para **HOY**, no para fechas futuras. Esto permite que habitaciones con reservas futuras permanezcan disponibles para otras fechas.

---

## Problema Identificado

### ❌ Enfoque Inicial (Incorrecto)
- Estado "reserved" se guardaba en BD al crear reserva
- Habitación permanecía "reservada" desde creación hasta check-in
- **Problema crítico**: Habitación con reserva en 1 mes aparecía como "reservada" hoy
- Bloqueaba disponibilidad visual innecesariamente

### ✅ Solución Implementada (Correcta)
- Estado físico en BD: `available`, `occupied`, `dirty`, `cleaning`, `maintenance`, `blocked`
- Estado visual calculado en tiempo real: `reserved` solo si check-in es HOY
- Habitaciones con reservas futuras muestran `available`
- No requiere actualizar BD al crear/cancelar reservas

---

## Arquitectura de la Solución

### 1. RoomStatusService (NUEVO)

**Archivo**: `/workspace/src/app/core/services/room-status.service.ts`

Servicio que combina habitaciones y reservas para calcular estado visual dinámicamente.

```typescript
export interface RoomWithStatus extends Room {
  displayStatus: string;      // Estado visual calculado
  activeBooking?: Booking;     // Reserva activa si existe
}

@Injectable({ providedIn: 'root' })
export class RoomStatusService {
  
  getRoomsWithStatus(
    rooms$: Observable<Room[]>, 
    bookings$: Observable<Booking[]>
  ): Observable<RoomWithStatus[]> {
    return combineLatest([rooms$, bookings$]).pipe(
      map(([rooms, bookings]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return rooms.map(room => {
          // Si NO está disponible, usar estado real
          if (room.status !== 'available') {
            return { ...room, displayStatus: room.status };
          }
          
          // Si está disponible, verificar reserva activa HOY
          const activeBooking = bookings.find(b => {
            if (b.roomId !== room.id) return false;
            if (!['pending', 'confirmed'].includes(b.status)) return false;
            
            const checkIn = new Date(b.checkInDate);
            checkIn.setHours(0, 0, 0, 0);
            
            return checkIn.getTime() === today.getTime();
          });
          
          return {
            ...room,
            displayStatus: activeBooking ? 'reserved' : 'available',
            activeBooking
          };
        });
      })
    );
  }
}
```

**Lógica clave**:
1. Combina streams de habitaciones y reservas con `combineLatest`
2. Para cada habitación:
   - Si estado ≠ `available` → usa estado real (occupied, dirty, cleaning, etc.)
   - Si estado = `available` → busca reserva con check-in HOY
   - Si encuentra reserva HOY → `displayStatus = 'reserved'`
   - Si no encuentra → `displayStatus = 'available'`

---

### 2. Integración en Componentes

**Archivo**: `/workspace/src/app/features/private/rooms/rooms-grid/rooms-grid.component.ts`

```typescript
export class RoomsGridComponent implements OnInit {
  rooms: RoomWithStatus[] = [];  // Tipo cambiado de Room[] a RoomWithStatus[]

  constructor(
    private roomService: RoomService,
    private bookingService: BookingService,
    private roomStatusService: RoomStatusService,  // Inyectado
    // ...
  ) {}

  loadRooms(): void {
    const rooms$ = this.roomService.getAllRooms();
    const bookings$ = this.bookingService.getAllBookings();
    
    // Combina y calcula estados
    this.roomStatusService.getRoomsWithStatus(rooms$, bookings$).subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.extractFloors();
        // ...
      }
    });
  }
}
```

**Template HTML**:
```html
<!-- Usar displayStatus en lugar de status -->
<div [style.--status-color]="getStatusColor(room.displayStatus)">
  <span>{{ getRoomStatusLabel(room.displayStatus) }}</span>
  <button *ngIf="room.displayStatus === 'reserved'">Check-in</button>
  <button *ngIf="room.displayStatus === 'occupied'">Check-out</button>
</div>
```

---

### 3. BookingService (Simplificado)

**Archivo**: `/workspace/src/app/core/services/booking.service.ts`

```typescript
// REMOVIDO: No cambia estado de habitación
async createBooking(dto: CreateBookingDto, userId: string): Promise<string> {
  // ... validaciones ...
  const bookingId = await this.repository.create(booking);
  // ❌ REMOVIDO: await this.roomService.changeRoomStatus(dto.roomId, 'reserved', userId);
  return bookingId;
}

async cancelBooking(id: string, userId: string): Promise<void> {
  // ... validaciones ...
  await this.repository.update(id, { status: 'cancelled', updatedBy: userId });
  // ❌ REMOVIDO: await this.roomService.changeRoomStatus(booking.roomId, 'available', userId);
}

// Check-in SÍ cambia estado físico
async checkIn(id: string, userId: string): Promise<void> {
  // ...
  await this.roomService.changeRoomStatus(booking.roomId, 'occupied', userId);
  // ...
}

// Check-out SÍ cambia estado físico
async checkOut(id: string, userId: string): Promise<void> {
  // ...
  await this.roomService.changeRoomStatus(booking.roomId, 'dirty', userId);
  // ...
}
```

---

## Flujo Completo con Ejemplos

### Escenario 1: Reserva con 1 Mes de Anticipación

```
Día 1 (15 enero) - Crear Reserva:
  Usuario: Reserva habitación 101 para 15 febrero
  Sistema: Crea registro en bookings
  BD rooms: status = 'available' ✅
  Vista: displayStatus = 'available' ✅
  Resultado: Habitación disponible para otras fechas

Día 31 (14 febrero) - Día Antes:
  BD rooms: status = 'available' ✅
  Vista: displayStatus = 'available' ✅
  Resultado: Aún disponible visualmente

Día 32 (15 febrero) - Día del Check-in:
  BD rooms: status = 'available' ✅
  Vista: displayStatus = 'reserved' ✅ (calculado)
  Resultado: Botón check-in visible
  
Después del Check-in:
  BD rooms: status = 'occupied' ✅
  Vista: displayStatus = 'occupied' ✅
  Resultado: Botones check-out y ver cuenta visibles
```

### Escenario 2: Múltiples Reservas No Solapadas

```
Reservas:
  - Reserva A: 10-15 enero (habitación 101)
  - Reserva B: 20-25 enero (habitación 101)

Día 5 enero:
  Vista: available ✅

Día 10 enero (check-in A):
  Vista: reserved → occupied (después de check-in)

Día 15 enero (check-out A):
  Vista: occupied → dirty → cleaning → available

Día 18 enero:
  Vista: available ✅ (Reserva B aún no es HOY)

Día 20 enero (check-in B):
  Vista: reserved ✅ → occupied (después de check-in)
```

### Escenario 3: Cancelación de Reserva

```
Día 1: Crear reserva para día 10
  BD: status = 'available'
  Vista: displayStatus = 'available'

Día 5: Cancelar reserva
  BD: status = 'available' (sin cambios)
  Vista: displayStatus = 'available'
  Resultado: No requiere actualizar estado físico

Día 10: (fecha original de check-in)
  Vista: displayStatus = 'available' ✅
  Resultado: Habitación disponible automáticamente
```

---

## Estados en Base de Datos

### Tabla: rooms

| Campo | Valores Posibles | Descripción |
|-------|------------------|-------------|
| status | `available` | Disponible físicamente |
| | `occupied` | Con huésped activo |
| | `dirty` | Post check-out, requiere limpieza |
| | `cleaning` | En proceso de limpieza |
| | `maintenance` | En mantenimiento |
| | `blocked` | Bloqueada manualmente |

**NO incluye** `reserved` - este es solo visual calculado

### Tabla: bookings

| Campo | Valores | Descripción |
|-------|---------|-------------|
| status | `pending` | Reserva sin confirmar |
| | `confirmed` | Reserva confirmada |
| | `checked-in` | Huésped en habitación |
| | `checked-out` | Huésped salió |
| | `cancelled` | Reserva cancelada |
| | `no-show` | No se presentó |

---

## Validación de Disponibilidad

### checkRoomAvailability()

```typescript
async checkRoomAvailability(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const overlapping = await this.repository.getOverlappingBookings(
    roomId, checkIn, checkOut, excludeBookingId
  );
  return overlapping.length === 0;
}
```

### getOverlappingBookings()

```typescript
// Busca reservas activas (confirmed o checked-in) que se solapen
// Dos reservas se solapan si:
// (checkIn < booking.checkOut) AND (checkOut > booking.checkIn)
```

**Importante**: Valida solapamiento de fechas, no estado visual de habitación.

---

## Beneficios de la Implementación

### Técnicos
✅ **Sin writes innecesarios**: No actualiza BD al crear/cancelar reservas
✅ **Cálculo en memoria**: Performance óptimo con RxJS
✅ **Reactivo**: Actualización automática cuando cambian habitaciones o reservas
✅ **Single source of truth**: Reservas son la única fuente de verdad

### Funcionales
✅ **Precisión temporal**: Estado refleja realidad actual, no futura
✅ **Flexibilidad**: Habitación disponible para fechas no reservadas
✅ **Prevención de overbooking**: Valida solapamiento de fechas
✅ **UX mejorada**: Usuario ve disponibilidad real

### Operacionales
✅ **Menos errores**: No hay estados desincronizados
✅ **Mantenimiento simple**: Lógica centralizada en un servicio
✅ **Escalable**: Funciona con múltiples reservas por habitación

---

## Migración desde Versión Anterior

Si implementaste la versión incorrecta (estado en BD):

### 1. Revertir Cambios en BookingService
```typescript
// REMOVER estas líneas:
await this.roomService.changeRoomStatus(dto.roomId, 'reserved', userId);
await this.roomService.changeRoomStatus(booking.roomId, 'available', userId);
```

### 2. Agregar RoomStatusService
- Crear archivo `room-status.service.ts`
- Copiar código del servicio

### 3. Actualizar Componentes
```typescript
// Cambiar tipo
rooms: RoomWithStatus[] = [];

// Inyectar servicio
constructor(private roomStatusService: RoomStatusService) {}

// Usar en loadRooms()
this.roomStatusService.getRoomsWithStatus(rooms$, bookings$).subscribe(...)
```

### 4. Actualizar Templates
```html
<!-- Cambiar room.status por room.displayStatus -->
{{ room.displayStatus }}
*ngIf="room.displayStatus === 'reserved'"
```

### 5. Limpiar Datos
```sql
-- Habitaciones con status 'reserved' cambiar a 'available'
UPDATE rooms SET status = 'available' WHERE status = 'reserved';
```

---

## Actualización de Parámetros

### Problema
Estado "dirty" no aparece en formulario de edición.

### Solución Rápida
1. Ir a Firebase Console → Firestore
2. Eliminar colección completa `parameters`
3. Cerrar sesión en la app
4. Iniciar sesión de nuevo
5. Sistema recreará parámetros con código actualizado

### Estados Actualizados
```typescript
roomStatuses: [
  { value: 'available', label: 'Disponible', active: true, order: 0 },
  { value: 'reserved', label: 'Reservada', active: true, order: 1 },
  { value: 'occupied', label: 'Ocupada', active: true, order: 2 },
  { value: 'dirty', label: 'Sucia', active: true, order: 3 },
  { value: 'cleaning', label: 'En Limpieza', active: true, order: 4 },
  { value: 'maintenance', label: 'Mantenimiento', active: true, order: 5 },
  { value: 'blocked', label: 'Bloqueada', active: true, order: 6 }
]
```

---

## Testing

### Casos de Prueba Críticos

1. ✅ Habitación con reserva futura muestra 'available'
2. ✅ Habitación con reserva HOY muestra 'reserved'
3. ✅ Habitación ocupada muestra 'occupied'
4. ✅ Habitación sucia muestra 'dirty'
5. ✅ Cancelar reserva no cambia estado físico
6. ✅ Crear reserva no cambia estado físico
7. ✅ Check-in cambia estado a 'occupied'
8. ✅ Check-out cambia estado a 'dirty'
9. ✅ Múltiples reservas no solapadas funcionan
10. ✅ RoomStatusService no afecta estados dirty/cleaning/maintenance

### Validaciones de Negocio

```typescript
// Reserva solo si no hay solapamiento
const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut);

// Check-in solo si reserva confirmada y check-in es HOY
const canCheckIn = booking.status === 'confirmed' && isToday(booking.checkInDate);

// Check-out solo si reserva checked-in
const canCheckOut = booking.status === 'checked-in';
```

---

## Archivos Modificados

### Nuevos
- `/workspace/src/app/core/services/room-status.service.ts`

### Modificados
- `/workspace/src/app/core/services/booking.service.ts`
  - Agregado import `map` de rxjs/operators
  - Removido cambio de estado en createBooking()
  - Removido cambio de estado en cancelBooking()
  
- `/workspace/src/app/features/private/rooms/rooms-grid/rooms-grid.component.ts`
  - Tipo cambiado a `RoomWithStatus[]`
  - Inyectado `RoomStatusService`
  - Método `loadRooms()` usa `getRoomsWithStatus()`
  
- `/workspace/src/app/features/private/rooms/rooms-grid/rooms-grid.component.html`
  - Cambiado `room.status` por `room.displayStatus`

- `/workspace/src/app/core/services/parameters.service.ts`
  - Agregado estado 'dirty' en roomStatuses

---

## Conclusión

La implementación dinámica mediante `RoomStatusService` es la solución correcta para sistemas hoteleros. El estado "reservada" es una **vista calculada en tiempo real** basada en reservas activas para el día actual, no un estado persistente en base de datos.

**Ventajas principales**:
- Habitaciones con reservas futuras permanecen disponibles
- No requiere actualizar BD constantemente
- Cálculo reactivo y automático
- Previene overbooking mediante validación de fechas

**Estado**: ✅ Implementado y Funcional
**Versión**: 2.0.0
**Última Actualización**: 2024
