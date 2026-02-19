# Vista de Mapa de Habitaciones - v1.0.0

## Descripción General

Sistema de visualización interactiva de habitaciones mediante mapas SVG del hotel, permitiendo ver el estado de las habitaciones en tiempo real y ejecutar acciones directamente desde el mapa.

---

## Características Principales

### 1. Vista de Mapa Interactiva
- **Tercera vista** en el módulo de habitaciones (Grid, Lista, Mapa)
- **Mapas SVG** por piso del hotel (Primer Piso, Segundo Piso)
- **Colores dinámicos** según estado de habitación
- **Interacción directa** con click sobre habitaciones
- **Integración completa** con datos en tiempo real

### 2. Mapeo de Habitaciones
- **Convención de IDs**: Habitaciones en SVG identificadas como `room-{número}`
  - Ejemplo: Habitación 101 → `id="room-101"` en SVG
  - Ejemplo: Habitación 205 → `id="room-205"` en SVG
- **Detección automática** de elementos con prefijo `room-`
- **Aplicación de colores** según estado actual

### 3. Estados Visuales
Colores aplicados dinámicamente a los elementos SVG:

| Estado | Color Fill | Color Stroke | Descripción |
|--------|-----------|--------------|-------------|
| `available` | `#d1fae5` | `#10b981` | Verde - Disponible |
| `reserved` | `#ede9fe` | `#8b5cf6` | Morado - Reservada |
| `occupied` | `#fee2e2` | `#ef4444` | Rojo - Ocupada |
| `dirty` | `#fef3c7` | `#f59e0b` | Naranja - Sucia |
| `cleaning` | `#dbeafe` | `#3b82f6` | Azul - En Limpieza |
| `maintenance` | `#e0e7ff` | `#6366f1` | Índigo - Mantenimiento |

### 4. Diálogo de Acciones
Modal que se abre al hacer click en una habitación:

**Información mostrada**:
- Número de habitación
- Estado actual (con badge de color)
- Tipo de habitación
- Piso
- Capacidad
- Precio base

**Acciones disponibles** (según estado):
- **Check-in** (solo si estado = `reserved`)
- **Check-out** (solo si estado = `occupied`)
- **Ver Cuenta** (solo si estado = `occupied`)
- **Completar Limpieza** (solo si estado = `cleaning`)
- **Crear Tarea** (siempre disponible)
- **Editar Habitación** (siempre disponible)

---

## Estructura de Archivos

### Archivos Modificados

#### `/workspace/src/app/features/private/rooms/rooms.component.html`
```html
<!-- Agregado botón toggle para vista de mapa -->
<mat-button-toggle value="map">
  <mat-icon>map</mat-icon>
  Vista Mapa
</mat-button-toggle>

<!-- Sección de vista de mapa con dos pisos -->
<div *ngIf="viewMode === 'map'" class="map-view">
  <div class="floor-container">
    <h3 class="floor-title">Primer Piso</h3>
    <div class="floor-map">
      <object id="piso1-svg" data="assets/img/hotel-map/piso1.svg" 
              type="image/svg+xml" class="floor-svg"
              (load)="onSvgLoad($event)">
      </object>
    </div>
  </div>
  
  <div class="floor-container">
    <h3 class="floor-title">Segundo Piso</h3>
    <div class="floor-map">
      <object id="piso2-svg" data="assets/img/hotel-map/piso2.svg" 
              type="image/svg+xml" class="floor-svg"
              (load)="onSvgLoad($event)">
      </object>
    </div>
  </div>
</div>
```

#### `/workspace/src/app/features/private/rooms/rooms.component.ts`
**Nuevas propiedades**:
```typescript
private tooltip!: HTMLDivElement;  // Elemento tooltip (no usado finalmente)
```

**Nuevos métodos**:
```typescript
// Maneja la carga del SVG y aplica interactividad
onSvgLoad(event: Event): void

// Aplica colores según estado de habitación
applyRoomColor(element: Element, status: string): void

// Abre diálogo con acciones de habitación
handleRoomClick(room: RoomWithStatus): void

// Carga parámetros de forma asíncrona
async loadParameters(): Promise<void>
```

**Dependencias agregadas**:
```typescript
import { NgZone } from '@angular/core';

constructor(
  // ... otros servicios
  private ngZone: NgZone  // ⭐ Crítico para detección de cambios
) { }
```

#### `/workspace/src/app/features/private/rooms/rooms.component.scss`
Estilos para la vista de mapa:
```scss
.map-view {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
}

.floor-container {
  flex: 1;
  min-width: 400px;
  max-width: 600px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.floor-svg {
  width: 100%;
  height: auto;
  pointer-events: all;  // ⭐ Permite interacción con SVG
}
```

### Archivos Nuevos

#### `/workspace/src/app/features/private/rooms/room-map-actions-dialog/`
Componente de diálogo para acciones de habitación desde el mapa.

**room-map-actions-dialog.component.ts**:
```typescript
export class RoomMapActionsDialogComponent implements AfterViewInit {
  constructor(
    public dialogRef: MatDialogRef<RoomMapActionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      room: RoomWithStatus, 
      roomStatuses: any[], 
      roomTypes: any[] 
    },
    private cdr: ChangeDetectorRef  // ⭐ Fuerza detección de cambios
  ) {}

  ngAfterViewInit(): void {
    this.cdr.detectChanges();  // ⭐ Necesario para renderizado inicial
  }

  getRoomStatusLabel(value: string): string
  getRoomTypeLabel(value: string): string
  getStatusColor(status: string): string
  onAction(action: string): void
  close(): void
}
```

**room-map-actions-dialog.component.html**:
- Título con número de habitación
- Información detallada de la habitación
- Botones de acción condicionales según estado
- Botón cerrar

**room-map-actions-dialog.component.scss**:
- Estilos para información de habitación
- Estilos para botones de acción
- Badge de estado con color dinámico

#### `/workspace/src/assets/img/hotel-map/`
Carpeta para almacenar archivos SVG de los mapas del hotel:
- `piso1.svg` - Mapa del primer piso
- `piso2.svg` - Mapa del segundo piso

---

## Implementación Técnica

### 1. Carga y Manipulación de SVG

```typescript
onSvgLoad(event: Event): void {
  const objectElement = event.target as HTMLObjectElement;
  const svgDoc = objectElement.contentDocument;
  
  if (svgDoc) {
    // 1. Buscar todos los elementos con id que empiecen con "room-"
    const roomElements = svgDoc.querySelectorAll('[id^="room-"]');
    
    roomElements.forEach((roomElement) => {
      const roomId = roomElement.id;  // ej: "room-101"
      const roomNumber = roomId.replace('room-', '');  // ej: "101"
      
      // 2. Buscar habitación en datos
      const room = this.rooms.find(r => r.roomNumber === roomNumber);
      
      if (room) {
        // 3. Aplicar color según estado
        this.applyRoomColor(roomElement, room.displayStatus);
        
        // 4. Agregar evento de click (dentro de NgZone)
        roomElement.addEventListener('click', () => {
          this.ngZone.run(() => this.handleRoomClick(room));
        });
        
        // 5. Cambiar cursor a pointer
        (roomElement as SVGElement).style.cursor = 'pointer';
      }
    });
    
    // 6. Agregar estilos de hover
    const style = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      [id^="room-"] {
        transition: opacity 0.2s;
      }
      [id^="room-"]:hover path {
        opacity: 0.8;
      }
    `;
    svgDoc.documentElement.appendChild(style);
  }
}
```

### 2. Aplicación de Colores

```typescript
applyRoomColor(element: Element, status: string): void {
  const paths = element.querySelectorAll('path');
  
  const colorMap: { [key: string]: { fill: string, stroke: string } } = {
    'available': { fill: '#d1fae5', stroke: '#10b981' },
    'reserved': { fill: '#ede9fe', stroke: '#8b5cf6' },
    'occupied': { fill: '#fee2e2', stroke: '#ef4444' },
    'dirty': { fill: '#fef3c7', stroke: '#f59e0b' },
    'cleaning': { fill: '#dbeafe', stroke: '#3b82f6' },
    'maintenance': { fill: '#e0e7ff', stroke: '#6366f1' }
  };
  
  const colors = colorMap[status] || { fill: '#f3f4f6', stroke: '#9ca3af' };
  
  paths.forEach((path) => {
    if (path.hasAttribute('fill')) {
      path.setAttribute('fill', colors.fill);
    }
    if (path.hasAttribute('stroke')) {
      path.setAttribute('stroke', colors.stroke);
    }
  });
}
```

### 3. Manejo de Click con NgZone

**Problema identificado**: 
- Los eventos del SVG ocurren fuera de la zona de detección de cambios de Angular
- El diálogo se abría pero no se renderizaba hasta hacer click adicional

**Solución**:
```typescript
// ❌ MAL - No funciona correctamente
roomElement.addEventListener('click', () => this.handleRoomClick(room));

// ✅ BIEN - Ejecuta dentro de la zona de Angular
roomElement.addEventListener('click', () => {
  this.ngZone.run(() => this.handleRoomClick(room));
});
```

### 4. Carga Asíncrona de Parámetros

**Problema identificado**:
- `roomStatuses` y `roomTypes` estaban vacíos al abrir el diálogo
- `getOptions()` se llamaba antes de que los parámetros se cargaran de Firestore

**Solución**:
```typescript
async loadParameters(): Promise<void> {
  // Esperar a que los parámetros se carguen
  if (!this.parametersService.isLoaded()) {
    await this.parametersService.loadAllParameters();
  }
  
  // Ahora sí obtener las opciones
  this.roomStatuses = this.parametersService.getOptions('roomStatuses');
  this.roomTypes = this.parametersService.getOptions('roomTypes');
}
```

### 5. Detección de Cambios en Diálogo

**Problema identificado**:
- El contenido del diálogo no se renderizaba hasta hacer click

**Solución**:
```typescript
export class RoomMapActionsDialogComponent implements AfterViewInit {
  constructor(
    // ...
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.cdr.detectChanges();  // Fuerza renderizado después de la vista
  }
}
```

---

## Requisitos del SVG

### Estructura Requerida

Para que el sistema funcione correctamente, los archivos SVG deben cumplir:

1. **IDs de habitaciones**: Elementos con `id="room-{número}"`
   ```xml
   <g id="room-101">
     <path fill="#FFFFFF" stroke="#DADADA" d="..."/>
   </g>
   ```

2. **Atributos fill y stroke**: Los elementos `<path>` deben tener estos atributos
   ```xml
   <path fill="#FFFFFF" stroke="#DADADA" d="..."/>
   ```

3. **Agrupación**: Preferiblemente agrupar elementos de cada habitación en un `<g>`

### Ejemplo de Estructura SVG

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800">
  <!-- Habitación 101 -->
  <g id="room-101">
    <path fill="#FFFFFF" stroke="#DADADA" d="M 10 10 L 100 10 L 100 100 L 10 100 Z"/>
    <text x="55" y="55">101</text>
  </g>
  
  <!-- Habitación 102 -->
  <g id="room-102">
    <path fill="#FFFFFF" stroke="#DADADA" d="M 110 10 L 200 10 L 200 100 L 110 100 Z"/>
    <text x="155" y="55">102</text>
  </g>
  
  <!-- Más habitaciones... -->
</svg>
```

---

## Integración con Otros Módulos

### RoomStatusService
- Proporciona `displayStatus` calculado dinámicamente
- Combina estado físico con reservas del día
- Usado para determinar color en el mapa

### ParametersService
- Proporciona labels traducidos para estados y tipos
- Cargado de forma asíncrona antes de abrir diálogo

### RoomMapActionsDialogComponent
- Recibe datos completos: `room`, `roomStatuses`, `roomTypes`
- Muestra acciones contextuales según estado
- Cierra y retorna acción seleccionada

---

## Flujo de Usuario

1. **Acceder a vista de mapa**:
   - Usuario navega a `/rooms`
   - Selecciona toggle "Vista Mapa"

2. **Visualizar estados**:
   - Sistema carga SVGs de ambos pisos
   - Aplica colores según estado de cada habitación
   - Muestra efecto hover al pasar mouse

3. **Interactuar con habitación**:
   - Usuario hace click en habitación del mapa
   - Se abre diálogo con información completa
   - Diálogo muestra acciones disponibles según estado

4. **Ejecutar acción**:
   - Usuario selecciona acción (check-in, check-out, etc.)
   - Diálogo se cierra y retorna acción
   - Sistema ejecuta acción correspondiente

---

## Problemas Resueltos

### 1. Diálogo no renderizaba contenido inicial
**Síntoma**: Modal se abría vacío, contenido aparecía solo al hacer click
**Causa**: Evento de click del SVG fuera de zona de Angular
**Solución**: Usar `NgZone.run()` para ejecutar dentro de la zona

### 2. Arrays de parámetros vacíos
**Síntoma**: `roomStatuses` y `roomTypes` eran arrays vacíos `[]`
**Causa**: `getOptions()` llamado antes de cargar parámetros de Firestore
**Solución**: Hacer `loadParameters()` asíncrono con `await`

### 3. Error "Should be run in update mode"
**Síntoma**: Error al llamar `detectChanges()` en constructor
**Causa**: No se puede forzar detección de cambios durante construcción
**Solución**: Mover `detectChanges()` a `ngAfterViewInit()`

### 4. Tooltip no funcionaba correctamente
**Síntoma**: Tooltip aparecía muy abajo, no seguía el mouse
**Decisión**: Eliminar tooltip, usar solo diálogo con click
**Resultado**: Mejor UX con información completa en modal

---

## Mejoras Futuras

### Funcionalidades
- [ ] Zoom y pan en mapas grandes
- [ ] Filtros de estado en vista de mapa
- [ ] Leyenda de colores visible
- [ ] Animación de cambio de estado en tiempo real
- [ ] Vista de múltiples pisos en tabs
- [ ] Búsqueda de habitación con highlight en mapa

### Optimizaciones
- [ ] Cache de SVG parseado
- [ ] Lazy loading de mapas por piso
- [ ] Virtualización para hoteles grandes
- [ ] Preload de SVGs en background

### UX
- [ ] Tooltip con información básica (sin click)
- [ ] Indicador de habitaciones con alertas
- [ ] Animación de "pulso" para habitaciones que requieren atención
- [ ] Modo fullscreen para vista de mapa

---

## Configuración y Uso

### 1. Preparar Archivos SVG

Crear mapas del hotel en formato SVG con IDs de habitaciones:
```bash
# Ubicación de archivos
/workspace/src/assets/img/hotel-map/
├── piso1.svg
└── piso2.svg
```

### 2. Convención de Nombres

Asegurar que los IDs en SVG coincidan con números de habitación:
- Habitación 101 → `id="room-101"`
- Habitación 205 → `id="room-205"`
- Habitación 1A → `id="room-1A"`

### 3. Verificar Módulo

El componente de diálogo debe estar declarado en el módulo:
```typescript
// rooms.module.ts
import { RoomMapActionsDialogComponent } from './room-map-actions-dialog/room-map-actions-dialog.component';

@NgModule({
  declarations: [
    // ...
    RoomMapActionsDialogComponent
  ]
})
```

### 4. Probar Funcionalidad

1. Navegar a `/rooms`
2. Seleccionar "Vista Mapa"
3. Verificar que habitaciones tengan colores correctos
4. Hacer click en habitación
5. Verificar que diálogo muestre información completa
6. Probar acciones disponibles

---

## Documentación Relacionada

- `/workspace/CONTEXTO.md` - Contexto general del proyecto
- `/workspace/RESERVED_ROOM_STATUS_V2.md` - Estados de habitación
- `/workspace/HOUSEKEEPING_MODULE.md` - Integración con limpieza
- `/workspace/GUEST_ACCOUNTS_MODULE_COMPLETE.md` - Integración con cuentas

---

## Versión y Changelog

**Versión**: 1.0.0  
**Fecha**: 2024-02-16

### v1.0.0 - Implementación Inicial
- ✅ Vista de mapa con SVG por piso
- ✅ Colores dinámicos según estado
- ✅ Diálogo de acciones interactivo
- ✅ Integración con RoomStatusService
- ✅ Carga asíncrona de parámetros
- ✅ Detección de cambios con NgZone
- ✅ Hover effects en habitaciones
- ✅ Acciones contextuales según estado

---

## Notas Técnicas

### NgZone y Detección de Cambios
Los eventos del DOM del SVG ocurren fuera de la zona de Angular. Es **crítico** usar `NgZone.run()` para que Angular detecte los cambios y actualice la UI correctamente.

### ChangeDetectorRef
El diálogo requiere `detectChanges()` en `ngAfterViewInit()` para forzar el renderizado inicial del contenido.

### Carga Asíncrona
Los parámetros deben cargarse de forma asíncrona antes de abrir el diálogo para evitar arrays vacíos.

### Estructura SVG
La calidad de la experiencia depende directamente de la estructura del SVG. IDs consistentes y atributos fill/stroke son esenciales.

---

**Autor**: Amazon Q Developer  
**Última Actualización**: 2024-02-16
