# 📅 CALENDARIO PARA GESTIÓN DE RESERVAS - Análisis y Recomendaciones

## 🎯 Requisitos del Calendario para PMS

### Funcionalidades Necesarias
1. **Vista de disponibilidad de habitaciones** (timeline por habitación)
2. **Prevención de conflictos de fechas** (validación de solapamiento)
3. **Drag & drop de reservas** (reasignar habitaciones)
4. **Múltiples vistas** (día, semana, mes)
5. **Eventos de múltiples días** (check-in a check-out)
6. **Colores por estado** (pending, confirmed, checked-in, etc.)
7. **Click para crear reserva**
8. **Editar reserva existente**
9. **Vista de horarios de empleados** (opcional, para housekeeping)

---

## ✅ OPCIÓN 1: Angular Calendar (YA INSTALADO) ⭐ RECOMENDADO

### Estado Actual
- ✅ **YA está instalado** en el proyecto (`angular-calendar` v0.29.0)
- ✅ **YA hay un módulo de ejemplo** en `/src/app/examples/apps/calendar`
- ✅ Usa **Moment.js** para manejo de fechas
- ✅ Tiene estilos configurados en `_angular-calendar.scss`

### Ventajas
- ✅ **Gratis y Open Source**
- ✅ **Muy popular** (2.7k+ estrellas en GitHub)
- ✅ **Bien mantenido** (actualizaciones regulares)
- ✅ **Integración perfecta con Angular Material**
- ✅ **Drag & drop nativo**
- ✅ **Eventos de múltiples días**
- ✅ **Responsive**
- ✅ **Customizable** (colores, templates, acciones)
- ✅ **TypeScript completo**

### Vistas Disponibles
- ✅ Month View (vista mensual)
- ✅ Week View (vista semanal)
- ✅ Day View (vista diaria)
- ❌ Timeline View (NO nativa, pero se puede implementar)

### Ejemplo de Uso (Ya en el proyecto)
```typescript
events: CalendarEvent[] = [{
  start: new Date(),
  end: addDays(new Date(), 3),
  title: 'Reserva Habitación 101',
  color: { primary: '#009688', secondary: '#80CBC4' },
  draggable: true,
  resizable: { beforeStart: true, afterEnd: true }
}];
```

### Para PMS de Hotel
**Perfecto para**:
- ✅ Vista mensual de reservas
- ✅ Vista semanal de llegadas/salidas
- ✅ Calendario de horarios de empleados
- ✅ Eventos de housekeeping

**Limitaciones**:
- ❌ No tiene vista de timeline nativa (habitación × fecha)
- ⚠️ Necesitarías crear una vista custom para "room timeline"

### Documentación
- Oficial: https://mattlewis92.github.io/angular-calendar/
- GitHub: https://github.com/mattlewis92/angular-calendar
- Demos: https://mattlewis92.github.io/angular-calendar/demos/

---

## 🔥 OPCIÓN 2: FullCalendar (Más Potente)

### Descripción
La librería de calendarios más completa y profesional del mercado.

### Ventajas
- ✅ **Vista Timeline** nativa (perfecta para habitaciones × fechas)
- ✅ **Resource Timeline** (múltiples recursos/habitaciones)
- ✅ **Scheduler** (gestión de recursos)
- ✅ **Drag & drop avanzado**
- ✅ **Eventos de múltiples días**
- ✅ **Muy customizable**
- ✅ **Documentación excelente**
- ✅ **Usado por empresas grandes**

### Desventajas
- ❌ **Licencia comercial** para Timeline/Scheduler ($299-$599/año)
- ❌ Versión gratuita NO incluye timeline
- ⚠️ Más complejo de configurar
- ⚠️ Bundle más pesado

### Instalación
```bash
npm install @fullcalendar/angular @fullcalendar/core
npm install @fullcalendar/daygrid @fullcalendar/timegrid
npm install @fullcalendar/resource-timeline  # PREMIUM
```

### Ejemplo de Timeline (PREMIUM)
```typescript
resources: [
  { id: '101', title: 'Habitación 101' },
  { id: '102', title: 'Habitación 102' }
],
events: [
  { 
    resourceId: '101',
    start: '2024-01-15',
    end: '2024-01-18',
    title: 'Juan Pérez'
  }
]
```

### Para PMS de Hotel
**Perfecto para**:
- ✅ Vista timeline de habitaciones (PREMIUM)
- ✅ Gestión de múltiples recursos
- ✅ Drag & drop entre habitaciones
- ✅ Vista profesional tipo Gantt

**Limitaciones**:
- ❌ Costo de licencia
- ❌ Overkill si solo necesitas vistas básicas

### Documentación
- Oficial: https://fullcalendar.io/
- Angular: https://fullcalendar.io/docs/angular
- Pricing: https://fullcalendar.io/pricing

---

## 🎨 OPCIÓN 3: Custom Timeline con Angular Material

### Descripción
Crear una vista timeline personalizada usando Angular Material y lógica custom.

### Ventajas
- ✅ **100% gratis**
- ✅ **Control total** del diseño
- ✅ **Integración perfecta** con Material Design
- ✅ **Ligero** (sin dependencias extra)
- ✅ **Exactamente lo que necesitas**

### Desventajas
- ❌ **Más tiempo de desarrollo** (2-3 días)
- ❌ Necesitas implementar drag & drop manualmente
- ❌ Más código de mantenimiento

### Componentes a Usar
- `mat-table` para la estructura
- `mat-card` para las reservas
- `@angular/cdk/drag-drop` para drag & drop
- CSS Grid para el layout

### Ejemplo de Estructura
```html
<table mat-table>
  <tr>
    <th>Habitación</th>
    <th *ngFor="let day of days">{{ day }}</th>
  </tr>
  <tr *ngFor="let room of rooms">
    <td>{{ room.number }}</td>
    <td *ngFor="let day of days" [class.occupied]="hasBooking(room, day)">
      <div class="booking-block" *ngIf="getBooking(room, day)">
        {{ booking.guestName }}
      </div>
    </td>
  </tr>
</table>
```

### Para PMS de Hotel
**Perfecto para**:
- ✅ Vista timeline exacta a tus necesidades
- ✅ Diseño único y personalizado
- ✅ Sin costos de licencia

**Limitaciones**:
- ❌ Más tiempo de desarrollo
- ❌ Necesitas implementar todo desde cero

---

## 🏆 RECOMENDACIÓN FINAL

### Para tu PMS, te recomiendo un **ENFOQUE HÍBRIDO**:

### 1️⃣ **Angular Calendar** (Ya instalado) para:
- ✅ Vista mensual de reservas
- ✅ Vista semanal de llegadas/salidas
- ✅ Calendario de horarios de empleados
- ✅ Selección de fechas en formularios

### 2️⃣ **Custom Timeline** para:
- ✅ Vista de disponibilidad de habitaciones (Room × Date)
- ✅ Prevención de conflictos
- ✅ Drag & drop de reservas entre habitaciones

### 3️⃣ **Lógica de Validación** en el Service:
```typescript
async checkAvailability(
  roomId: string, 
  checkIn: Date, 
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  // Query Firestore para buscar reservas que se solapen
  const overlapping = await this.getOverlappingBookings(
    roomId, checkIn, checkOut, excludeBookingId
  );
  return overlapping.length === 0;
}

private getOverlappingBookings(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeId?: string
): Promise<Booking[]> {
  // Buscar reservas donde:
  // (checkIn < booking.checkOut) AND (checkOut > booking.checkIn)
  return this.firestore
    .collection('bookings')
    .where('roomId', '==', roomId)
    .where('status', 'in', ['confirmed', 'checked-in'])
    .where('checkInDate', '<', checkOut)
    .where('checkOutDate', '>', checkIn)
    .get()
    .then(snap => snap.docs.map(d => d.data()));
}
```

---

## 📋 PLAN DE IMPLEMENTACIÓN

### Fase 1: Módulo de Reservas con Angular Calendar (2-3 horas)
1. Crear modelo Booking
2. Implementar lógica de validación de disponibilidad
3. Formulario de crear reserva con date pickers
4. Lista de reservas con filtros
5. Vista de calendario mensual (usando angular-calendar)

### Fase 2: Vista Timeline Custom (2-3 horas)
1. Componente de timeline (habitaciones × fechas)
2. Visualización de reservas como bloques
3. Colores por estado
4. Click para ver detalles
5. (Opcional) Drag & drop para reasignar

### Fase 3: Integraciones (1-2 horas)
1. Check-in desde calendario
2. Check-out desde calendario
3. Crear tarea de housekeeping al checkout
4. Actualizar estados de habitaciones

---

## 🎯 DECISIÓN

**¿Qué prefieres?**

### Opción A: Empezar con Angular Calendar (RÁPIDO)
- Usar el calendario ya instalado
- Implementar reservas con validación de fechas
- Vista mensual/semanal
- Timeline custom después (opcional)

### Opción B: FullCalendar Premium (PROFESIONAL)
- Comprar licencia ($299)
- Vista timeline nativa
- Más tiempo de configuración
- Resultado más profesional

### Opción C: Todo Custom (CONTROL TOTAL)
- Sin dependencias extra
- Más tiempo de desarrollo
- Diseño único

---

## 💡 MI RECOMENDACIÓN

**Opción A** - Empezar con Angular Calendar porque:
1. ✅ Ya está instalado y configurado
2. ✅ Suficiente para un MVP funcional
3. ✅ Puedes agregar timeline custom después
4. ✅ Gratis y open source
5. ✅ Menos tiempo de desarrollo

**Flujo sugerido**:
1. Crear módulo de Reservas con validación de fechas
2. Usar Angular Calendar para vista mensual
3. Implementar búsqueda de disponibilidad
4. (Después) Agregar timeline custom si es necesario

---

¿Quieres que empecemos con **Reservas usando Angular Calendar**? 🚀
