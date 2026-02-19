# Vista de Mapa de Habitaciones - v2.0.0

## Descripción General

Sistema de visualización interactiva de habitaciones mediante mapas SVG del hotel, permitiendo ver el estado de las habitaciones en tiempo real y ejecutar acciones directamente desde el mapa. Incluye selector de piso vertical, temas claro/oscuro, y diseño responsive optimizado.

---

## Características Principales

### 1. Vista de Mapa Interactiva
- **Tercera vista** en el módulo de habitaciones (Grid, Lista, Mapa)
- **Mapas SVG** por piso del hotel (Primer Piso, Segundo Piso)
- **Selector de piso vertical**: Tabs con iconos a la izquierda para cambiar entre pisos
- **Tema claro/oscuro**: Botón flotante para alternar entre mapas light y dark
- **Colores dinámicos** según estado de habitación con 50% de opacidad
- **Interacción directa** con click sobre habitaciones
- **Integración completa** con datos en tiempo real
- **Responsive**: Se ajusta al tamaño del contenedor automáticamente
- **Optimizado para pantalla**: Ocupa todo el alto disponible (calc(100vh - 200px))

### 2. Mapeo de Habitaciones
- **Convención de IDs**: Habitaciones en SVG identificadas como `room-{número}`
  - Ejemplo: Habitación 101 → `id="room-101"` en SVG
  - Ejemplo: Habitación 205 → `id="room-205"` en SVG
- **Detección automática** de elementos con prefijo `room-`
- **Aplicación de colores** según estado actual
- **Opacidad del fill**: 50% para mejor visibilidad sobre fondos oscuros

### 3. Temas de Mapa
**Archivos SVG requeridos**:
- **Light theme**: `piso1_rotate.svg`, `piso2_rotate.svg`
- **Dark theme**: `piso1_rotate_dark.svg`, `piso2_rotate_dark.svg`

**Nota importante**: Los archivos deben estar pre-rotados 90 grados para optimizar el uso del espacio en pantalla. No se usa rotación CSS para evitar problemas de dimensionamiento.

**Botón flotante**: 
- Posicionado a la derecha, centrado verticalmente (fixed)
- Icono cambia según tema (dark_mode/light_mode)
- Tooltip descriptivo ("Modo Oscuro" / "Modo Claro")
- z-index: 10 para estar siempre visible

### 4. Selector de Piso
**Diseño vertical**:
- Tabs con iconos numéricos (looks_one, looks_two) a la izquierda del mapa
- Ocupa mínimo espacio horizontal
- Permite que el mapa use todo el ancho disponible
- Un solo piso visible a la vez (evita scroll excesivo)
- Binding bidireccional con `[(value)]="selectedFloor"`

### 5. Estados Visuales
Colores aplicados dinámicamente a los elementos SVG:

| Estado | Color Fill | Color Stroke | Descripción |
|--------|-----------|--------------|-------------|
| `available` | `#d1fae5` | `#10b981` | Verde - Disponible |
| `reserved` | `#ede9fe` | `#8b5cf6` | Morado - Reservada |
| `occupied` | `#fee2e2` | `#ef4444` | Rojo - Ocupada |
| `dirty` | `#fef3c7` | `#f59e0b` | Naranja - Sucia |
| `cleaning` | `#dbeafe` | `#3b82f6` | Azul - En Limpieza |
| `maintenance` | `#e0e7ff` | `#6366f1` | Índigo - Mantenimiento |

**Opacidad**: Todos los fills se establecen con `fill-opacity="0.5"` (50%)

### 6. Diálogo de Acciones
Modal que se abre al hacer click en una habitación:

**Información mostrada**:
- Número de habitación
- Estado actual (con badge de color)
- Tipo de habitación
- Piso
- Capacidad
- Precio base

**Acciones disponibles** (según estado):
- **Check-in** (solo si estado = `reserved`) - Abre diálogo de check-in
- **Check-out** (solo si estado = `occupied`) - Abre diálogo de check-out
- **Ver Cuenta** (solo si estado = `occupied`) - Navega a detalle de cuenta
- **Completar Limpieza** (solo si estado = `cleaning`) - Abre SweetAlert para completar tarea
- **Crear Tarea** (siempre disponible) - Abre diálogo de crear tarea
- **Editar Habitación** (siempre disponible) - Recarga habitaciones

**Lógica replicada de vista Grid**:
- Mismos servicios inyectados (BookingService, GuestAccountService, HousekeepingService)
- Mismas validaciones (busca reserva confirmada, cuenta abierta, tarea activa)
- Mismos diálogos (CheckInDialog, CheckOutDialog, TaskCreateUpdate)
- Retorna 'refresh' para recargar habitaciones después de acciones

### 7. Animación de Focos (Modo Oscuro)
**Característica especial para mapas dark**:
- Elementos con id que empiece con "focos" se animan al cargar
- Delay de 3 segundos antes de iniciar
- Transición de 3 segundos de opacidad 0 a 1
- Simula efecto de luces encendiéndose
- Quedan encendidos después de la animación

**Implementación**:
```typescript
if (this.mapTheme === 'dark') {
  const focos = svgDoc.querySelectorAll('[id^="focos"]');
  focos.forEach((foco) => {
    (foco as SVGElement).style.opacity = '0';
    (foco as SVGElement).style.animation = 'lightOn 3s ease-out 3s forwards';
  });
}
```

### 8. Tooltip con Información Básica
**Tooltip HTML personalizado al hacer hover**:
- Se muestra al pasar el mouse sobre cualquier habitación
- Sigue el cursor con offset calculado desde el `<object>` SVG
- Diseño coherente con las cards de vista Grid

**Información mostrada**:
- Número de habitación (destacado en cuadro de color 64x64px)
- Tipo de habitación
- Capacidad y piso
- Estado con badge de color
- Precio formateado

**Características técnicas**:
- `position: fixed` para posicionamiento absoluto
- `pointer-events: none` para no interferir con interacciones
- Cálculo de posición: `rect.left + e.clientX + 10` (compensa offset del SVG)
- Creado en `ngOnInit()` y eliminado en `ngOnDestroy()`
- Fondo con opacidad del color del estado
- Borde izquierdo de 4px con color del estado

**Implementación**:
```typescript
// Crear tooltip en ngOnInit
this.tooltip = document.createElement('div');
this.tooltip.style.position = 'fixed';
this.tooltip.style.pointerEvents = 'none';

// Eventos en SVG
newElement.addEventListener('mouseenter', (e: Event) => {
  this.tooltip.innerHTML = `...`;
  this.tooltip.style.display = 'block';
});

newElement.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = objectElement.getBoundingClientRect();
  this.tooltip.style.left = (rect.left + e.clientX + 10) + 'px';
  this.tooltip.style.top = (rect.top + e.clientY + 10) + 'px';
});

newElement.addEventListener('mouseleave', () => {
  this.tooltip.style.display = 'none';
});
```

**Nota**: Se intentó usar Tippy.js y Material Icons pero no funcionaron correctamente con elementos dentro de `<object>` SVG. La solución final usa tooltip HTML nativo con número de habitación destacado en lugar de iconos.

---

## Estructura de Archivos

### Archivos Modificados

#### `/workspace/src/app/features/private/rooms/rooms.component.html`
```html
<!-- Botón flotante para cambiar tema -->
<button mat-fab class="map-theme-toggle" (click)="toggleMapTheme()" 
        [matTooltip]="mapTheme === 'light' ? 'Modo Oscuro' : 'Modo Claro'">
  <mat-icon>{{ mapTheme === 'light' ? 'dark_mode' : 'light_mode' }}</mat-icon>
</button>

<!-- Selector de piso vertical -->
<mat-button-toggle-group [(value)]="selectedFloor" class="floor-selector-vertical" vertical>
  <mat-button-toggle [value]="1">
    <mat-icon>looks_one</mat-icon>
  </mat-button-toggle>
  <mat-button-toggle [value]="2">
    <mat-icon>looks_two</mat-icon>
  </mat-button-toggle>
</mat-button-toggle-group>

<!-- Contenedor del mapa con SVG condicional -->
<div class="floor-container">
  <div class="floor-map">
    <div class="svg-wrapper" *ngIf="selectedFloor === 1">
      <object id="piso1-svg" [data]="piso1Path" type="image/svg+xml" 
              class="floor-svg" (load)="onSvgLoad($event)">
      </object>
    </div>
    <div class="svg-wrapper" *ngIf="selectedFloor === 2">
      <object id="piso2-svg" [data]="piso2Path" type="image/svg+xml" 
              class="floor-svg" (load)="onSvgLoad($event)">
      </object>
    </div>
  </div>
</div>
```

#### `/workspace/src/app/features/private/rooms/rooms.component.ts`
**Nuevas propiedades**:
```typescript
private tooltip!: HTMLDivElement;  // Elemento tooltip (no usado finalmente)
mapTheme: 'light' | 'dark' = 'light';  // Tema actual del mapa
selectedFloor: number = 1;  // Piso seleccionado
piso1Path: SafeResourceUrl;  // URL sanitizada para piso 1
piso2Path: SafeResourceUrl;  // URL sanitizada para piso 2
```

**Nuevos métodos**:
```typescript
// Maneja la carga del SVG y aplica interactividad
onSvgLoad(event: Event): void

// Extrae lógica de interactividad para reutilizar
private applySvgInteractivity(svgDoc: Document): void

// Aplica colores según estado de habitación (con opacidad 50%)
applyRoomColor(element: Element, status: string): void

// Abre diálogo con acciones de habitación
handleRoomClick(room: RoomWithStatus): void

// Carga parámetros de forma asíncrona
async loadParameters(): Promise<void>

// Alterna entre tema light y dark
toggleMapTheme(): void

// Actualiza las rutas de los SVG según el tema
private updateMapPaths(): void
```

**Dependencias agregadas**:
```typescript
import { NgZone } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

constructor(
  // ... otros servicios
  private ngZone: NgZone,  // ⭐ Crítico para detección de cambios
  private sanitizer: DomSanitizer  // ⭐ Para URLs seguras
) {
  this.updateMapPaths();  // Inicializar rutas en constructor
}
```

#### `/workspace/src/app/features/private/rooms/rooms.component.scss`
Estilos para la vista de mapa:
```scss
.map-view {
  display: flex;
  gap: 16px;
  position: relative;
  height: calc(100vh - 200px);  // Ocupa alto de pantalla
}

.map-theme-toggle {
  position: fixed;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.floor-selector-vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.floor-container {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  overflow: hidden;
}

.floor-map {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  width: 100%;
  height: 100%;
}

.svg-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.floor-svg {
  width: 100%;
  height: 100%;
  display: block;
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

#### `/workspace/src/assets/img/hotel-map/`
Carpeta para almacenar archivos SVG de los mapas del hotel:
- `piso1_rotate.svg` - Mapa del primer piso (light, rotado 90°)
- `piso2_rotate.svg` - Mapa del segundo piso (light, rotado 90°)
- `piso1_rotate_dark.svg` - Mapa del primer piso (dark, rotado 90°)
- `piso2_rotate_dark.svg` - Mapa del segundo piso (dark, rotado 90°)

**Nota**: Los archivos deben estar pre-rotados 90 grados para optimizar el uso del espacio.

---

## Implementación Técnica

### 1. Carga y Manipulación de SVG

```typescript
onSvgLoad(event: Event): void {
  const objectElement = event.target as HTMLObjectElement;
  const svgDoc = objectElement.contentDocument;
  if (svgDoc) {
    this.applySvgInteractivity(svgDoc);
  }
}

private applySvgInteractivity(svgDoc: Document): void {
  const roomElements = svgDoc.querySelectorAll('[id^="room-"]');
  
  roomElements.forEach((roomElement) => {
    const roomId = roomElement.id;
    const roomNumber = roomId.replace('room-', '');
    const room = this.rooms.find(r => r.roomNumber === roomNumber);
    
    if (room) {
      this.applyRoomColor(roomElement, room.displayStatus);
      
      roomElement.addEventListener('click', () => {
        this.ngZone.run(() => this.handleRoomClick(room));
      });
      
      (roomElement as SVGElement).style.cursor = 'pointer';
    }
  });
  
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
      path.setAttribute('fill-opacity', '0.5');  // ⭐ 50% opacidad
    }
    if (path.hasAttribute('stroke')) {
      path.setAttribute('stroke', colors.stroke);
    }
  });
}
```

**Nota importante**: Se establece `fill-opacity` a `0.5` (50%) para que los colores sean visibles sobre fondos oscuros del mapa.

### 3. Cambio de Tema y Actualización de Rutas

**Problema**: `SafeResourceUrl` cambia la referencia en cada detección de cambios, causando recargas infinitas.

**Solución**: Cachear las URLs y actualizarlas solo al cambiar el tema.

```typescript
// Propiedades cacheadas
piso1Path: SafeResourceUrl;
piso2Path: SafeResourceUrl;

// Inicializar en constructor
constructor(private sanitizer: DomSanitizer) {
  this.updateMapPaths();
}

// Actualizar solo al cambiar tema
toggleMapTheme(): void {
  this.mapTheme = this.mapTheme === 'light' ? 'dark' : 'light';
  this.updateMapPaths();
  // Reaplicar interactividad después de recargar SVG
  setTimeout(() => {
    const piso1 = document.getElementById('piso1-svg') as HTMLObjectElement;
    const piso2 = document.getElementById('piso2-svg') as HTMLObjectElement;
    if (piso1?.contentDocument) this.applySvgInteractivity(piso1.contentDocument);
    if (piso2?.contentDocument) this.applySvgInteractivity(piso2.contentDocument);
  }, 100);
}

private updateMapPaths(): void {
  const theme = this.mapTheme === 'dark' ? '_rotate_dark' : '_rotate';
  this.piso1Path = this.sanitizer.bypassSecurityTrustResourceUrl(
    `assets/img/hotel-map/piso1${theme}.svg`
  );
  this.piso2Path = this.sanitizer.bypassSecurityTrustResourceUrl(
    `assets/img/hotel-map/piso2${theme}.svg`
  );
}
```

### 4. Layout Responsive con Selector Vertical

**Decisión de diseño**: Usar tabs verticales en lugar de horizontales para maximizar el espacio del mapa.

**Ventajas**:
- Mapa usa todo el ancho disponible
- Selector ocupa mínimo espacio (solo iconos)
- Un solo piso visible a la vez (evita scroll excesivo)
- Se ajusta automáticamente al alto de la pantalla

```html
<!-- Tabs verticales con iconos -->
<mat-button-toggle-group [(value)]="selectedFloor" 
                         class="floor-selector-vertical" 
                         vertical>
  <mat-button-toggle [value]="1">
    <mat-icon>looks_one</mat-icon>
  </mat-button-toggle>
  <mat-button-toggle [value]="2">
    <mat-icon>looks_two</mat-icon>
  </mat-button-toggle>
</mat-button-toggle-group>
```

---

## Requisitos del SVG

### Estructura Requerida

Para que el sistema funcione correctamente, los archivos SVG deben cumplir:

1. **IDs de habitaciones**: Elementos con `id="room-{número}"`
   ```xml
   <g id="room-101">
     <path fill="#FFFFFF" fill-opacity="0.07" stroke="#DADADA" d="..."/>
   </g>
   ```

2. **Atributos fill y stroke**: Los elementos `<path>` deben tener estos atributos
   ```xml
   <path fill="#FFFFFF" fill-opacity="0.05" stroke="#DADADA" d="..."/>
   ```
   **Nota**: El sistema sobrescribe `fill-opacity` a `0.5` (50%) automáticamente.

3. **Agrupación**: Preferiblemente agrupar elementos de cada habitación en un `<g>`

4. **Rotación**: Los archivos deben estar pre-rotados 90 grados para optimizar el uso del espacio en pantalla

### Convención de Nombres

Archivos requeridos en `/workspace/src/assets/img/hotel-map/`:
- `piso1_rotate.svg` - Primer piso, tema claro, rotado 90°
- `piso2_rotate.svg` - Segundo piso, tema claro, rotado 90°
- `piso1_rotate_dark.svg` - Primer piso, tema oscuro, rotado 90°
- `piso2_rotate_dark.svg` - Segundo piso, tema oscuro, rotado 90°

---

## Flujo de Usuario

1. **Acceder a vista de mapa**:
   - Usuario navega a `/rooms`
   - Selecciona toggle "Vista Mapa"

2. **Seleccionar piso**:
   - Usa tabs verticales a la izquierda (iconos 1 y 2)
   - Mapa cambia instantáneamente

3. **Cambiar tema**:
   - Click en botón flotante a la derecha
   - Mapa cambia entre light y dark
   - Colores de habitaciones se mantienen

4. **Visualizar estados**:
   - Sistema carga SVG del piso seleccionado
   - Aplica colores según estado de cada habitación
   - Muestra efecto hover al pasar mouse

5. **Interactuar con habitación**:
   - Usuario hace click en habitación del mapa
   - Se abre diálogo con información completa
   - Diálogo muestra acciones disponibles según estado

6. **Ejecutar acción**:
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

### 5. Recargas infinitas de SVG
**Síntoma**: Mapas aparecían y desaparecían en ciclo infinito
**Causa**: `SafeResourceUrl` creaba nueva referencia en cada detección de cambios
**Solución**: Cachear URLs en propiedades y actualizar solo al cambiar tema

### 6. SVG rotado no se ajustaba al contenedor
**Síntoma**: Al rotar con CSS, el SVG se veía cortado o muy grande
**Causa**: Dimensiones se intercambian al rotar, cálculos complejos
**Decisión**: Usar archivos SVG pre-rotados en lugar de rotación CSS
**Resultado**: Ajuste perfecto al contenedor sin cálculos adicionales

### 7. Fill no visible en mapas oscuros
**Síntoma**: Colores de estado no se veían en habitaciones
**Causa**: `fill-opacity` muy bajo (0.05-0.07) en SVG original
**Solución**: Establecer `fill-opacity` a `0.5` (50%) al aplicar colores
**Resultado**: Colores visibles manteniendo transparencia sobre fondo

### 8. Diálogos duplicados al hacer click
**Síntoma**: Modal se abre dos veces o aparece otro modal al cerrar
**Causa**: Event listeners se acumulaban en cada recarga del SVG
**Solución**: Clonar elemento antes de agregar listener para eliminar listeners anteriores
**Código**:
```typescript
// Remover listeners anteriores clonando el elemento
const newElement = roomElement.cloneNode(true);
roomElement.parentNode?.replaceChild(newElement, roomElement);
// Agregar evento al nuevo elemento
newElement.addEventListener('click', () => {
  this.ngZone.run(() => this.handleRoomClick(room));
});
```

### 9. Tooltip no sigue correctamente el cursor
**Síntoma**: Tooltip aparece muy lejos del cursor o en posición incorrecta
**Causa**: Coordenadas `e.clientX/Y` son relativas al SVG dentro del `<object>`, no a la ventana
**Solución**: Calcular posición del `<object>` y sumar coordenadas del mouse
**Código**:
```typescript
const objectElement = (e.target as Element).ownerDocument?.defaultView?.frameElement as HTMLElement;
if (objectElement) {
  const rect = objectElement.getBoundingClientRect();
  this.tooltip.style.left = (rect.left + e.clientX + 10) + 'px';
  this.tooltip.style.top = (rect.top + e.clientY + 10) + 'px';
}
```

---

## Mejoras Futuras

### Funcionalidades
- [ ] Zoom y pan en mapas grandes
- [ ] Filtros de estado en vista de mapa
- [ ] Leyenda de colores visible
- [ ] Animación de cambio de estado en tiempo real
- [ ] Búsqueda de habitación con highlight en mapa
- [ ] Soporte para más de 2 pisos

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

## Versión y Changelog

**Versión**: 2.0.0  
**Fecha**: 2024-02-16

### v2.0.0 - Mejoras de UX y Temas
- ✅ Selector de piso vertical con iconos
- ✅ Tema claro/oscuro con botón flotante
- ✅ SVG pre-rotados para mejor ajuste
- ✅ Opacidad de fill al 50%
- ✅ Layout responsive optimizado
- ✅ Cache de URLs para evitar recargas
- ✅ Un solo piso visible a la vez
- ✅ Lógica de acciones replicada de vista Grid
- ✅ Animación de focos en modo oscuro
- ✅ Tooltip HTML personalizado con hover
- ✅ Fix: Diálogos duplicados (clonación de elementos)
- ✅ Fix: Posicionamiento correcto de tooltip en SVG

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

**Autor**: Amazon Q Developer  
**Última Actualización**: 2024-02-16
