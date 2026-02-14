# Tópico 8: Gestión de Parámetros del Sistema

## Fecha: 2026-02-10

## Resumen
Sistema centralizado de gestión de parámetros paramétricos del PMS, permitiendo configurar valores desde la interfaz web sin necesidad de redesplegar la aplicación.

---

## Arquitectura Implementada

### Estructura en Firestore
```
/parameters (collection)
  /documentTypes (document)
    - id: 'documentTypes'
    - name: 'Tipos de Documento'
    - description: 'Tipos de documentos de identidad'
    - options: ParameterOption[]
    - updatedAt: timestamp
    - updatedBy: uid
  
  /guestTypes (document)
  /roomTypes (document)
  ... (12 categorías en total)
```

### Categorías Implementadas

1. **documentTypes** - Tipos de Documento
2. **guestTypes** - Tipos de Huésped
3. **guestStatuses** - Estados de Huésped
4. **roomTypes** - Tipos de Habitación
5. **roomStatuses** - Estados de Habitación
6. **bedTypes** - Tipos de Cama
7. **amenities** - Amenidades
8. **countries** - Países
9. **currencies** - Monedas
10. **paymentMethods** - Métodos de Pago
11. **reservationSources** - Fuentes de Reserva
12. **reservationStatuses** - Estados de Reserva

---

## Archivos Creados

### Modelos
1. `/workspace/src/app/domain/models/parameter.model.ts`
   - `ParameterOption`: Opción individual
   - `ParameterCategory`: Categoría completa
   - `ParameterCategoryId`: Tipo de categorías
   - `PARAMETER_CATEGORIES`: Definiciones de categorías

### Servicios
2. `/workspace/src/app/core/services/parameters.service.ts`
   - `loadAllParameters()`: Carga inicial
   - `getCategory()`: Obtener categoría
   - `getOptions()`: Obtener opciones activas
   - `updateCategory()`: Actualizar categoría
   - `initializeDefaultParameters()`: Inicialización

### Componentes
3. `/workspace/src/app/features/private/parameters/parameters-list/`
   - `parameters-list.component.ts`
   - `parameters-list.component.html`
   - `parameters-list.component.scss`

4. `/workspace/src/app/features/private/parameters/parameter-edit/`
   - `parameter-edit.component.ts`
   - `parameter-edit.component.html`
   - `parameter-edit.component.scss`

### Módulos y Routing
5. `/workspace/src/app/features/private/parameters/parameters-routing.module.ts`
6. `/workspace/src/app/features/private/parameters/parameters.module.ts`

### Configuración
7. `/workspace/src/app/app-routing.module.ts` (modificado)
8. `/workspace/src/app/app.component.ts` (modificado)

---

## Funcionalidades Implementadas

### 1. Lista de Categorías
- ✅ Vista de todas las categorías de parámetros
- ✅ Íconos personalizados por categoría
- ✅ Contador de opciones activas
- ✅ Fecha de última actualización
- ✅ Click en fila para editar

### 2. Editor de Parámetros
- ✅ Agregar nuevas opciones (value + label)
- ✅ Drag & Drop para reordenar (CDK Drag Drop)
- ✅ Toggle para activar/desactivar opciones
- ✅ Eliminar opciones
- ✅ Guardar cambios con confirmación
- ✅ Auditoría (updatedBy, updatedAt)

### 3. Carga Inicial
- ✅ Parámetros se cargan al iniciar la app
- ✅ Inicialización automática si no existen
- ✅ Caché en memoria (Map)
- ✅ Observable para saber cuándo están cargados

### 4. Valores por Defecto
Cada categoría tiene valores iniciales predefinidos:
- Tipos de documento: Pasaporte, Cédula, Licencia, Otro
- Tipos de huésped: Individual, Corporativo, Grupo
- Estados de habitación: Disponible, Ocupada, Limpieza, Mantenimiento, Bloqueada
- Y más...

---

## Modelo de Datos

### ParameterOption
```typescript
{
  value: string;        // ID único (ej: 'standard')
  label: string;        // Etiqueta visible (ej: 'Estándar')
  active: boolean;      // Activo/Inactivo
  order: number;        // Orden de visualización
  metadata?: object;    // Datos adicionales (ej: dialCode para países)
}
```

### ParameterCategory
```typescript
{
  id: string;                    // ID de la categoría
  name: string;                  // Nombre visible
  description: string;           // Descripción
  options: ParameterOption[];    // Lista de opciones
  updatedAt: Date;               // Última actualización
  updatedBy?: string;            // UID del usuario
}
```

---

## Uso del Servicio

### En cualquier componente:
```typescript
constructor(private parametersService: ParametersService) {}

ngOnInit() {
  // Obtener opciones de una categoría
  const roomTypes = this.parametersService.getOptions('roomTypes');
  // Resultado: [{ value: 'standard', label: 'Estándar', ... }, ...]
  
  // Obtener categoría completa
  const category = this.parametersService.getCategory('documentTypes');
}
```

### Esperar a que se carguen:
```typescript
this.parametersService.loaded$.subscribe(loaded => {
  if (loaded) {
    // Parámetros listos para usar
  }
});
```

---

## Características Técnicas

### Drag & Drop
- Usa `@angular/cdk/drag-drop`
- Reordenamiento visual intuitivo
- Actualización automática del campo `order`

### Caché en Memoria
- `Map<ParameterCategoryId, ParameterCategory>`
- Una sola lectura de Firestore al inicio
- Actualizaciones locales después de guardar

### Validaciones
- No permite valores duplicados
- Campos requeridos (value, label)
- Confirmación antes de guardar

### UI/UX
- Estilo consistente con módulo de usuarios
- Breadcrumbs para navegación
- Íconos Material Design
- Estados visuales (activo/inactivo)
- Empty state cuando no hay opciones

---

## Rutas

- `/parameters` - Lista de categorías
- `/parameters/:id` - Editor de categoría específica

Ejemplos:
- `/parameters/documentTypes`
- `/parameters/roomTypes`
- `/parameters/currencies`

---

## Menú de Navegación

Agregado en posición 12:
```typescript
{
  name: 'Parámetros',
  routeOrFunction: '/parameters',
  icon: 'settings',
  position: 12
}
```

---

## Estadísticas del Build

**Build exitoso:**
- Hash: `2497099728f9c777`
- Tiempo: 37 segundos
- Fecha: 2026-02-10T03:01:24.050Z

**Módulo de parámetros:**
- Chunk principal: 50.42 kB (raw) / 12.02 kB (comprimido)
- Chunk secundario: 13.10 kB (raw) / 3.65 kB (comprimido)
- Total: ~63.5 kB / ~15.7 kB comprimido

---

## Ventajas del Sistema

1. **Sin Redespliegue**: Cambios en tiempo real desde la web
2. **Centralizado**: Un solo lugar para todos los parámetros
3. **Escalable**: Fácil agregar nuevas categorías
4. **Auditable**: Registro de quién y cuándo modificó
5. **Intuitivo**: UI drag & drop para reordenar
6. **Performante**: Caché en memoria, una sola lectura
7. **Consistente**: Mismos valores en toda la aplicación
8. **Flexible**: Metadata adicional por opción

---

## Próximos Pasos Sugeridos

- [ ] Agregar búsqueda/filtro en lista de categorías
- [ ] Exportar/Importar parámetros (JSON)
- [ ] Historial de cambios por categoría
- [ ] Validaciones personalizadas por categoría
- [ ] Traducción de labels (i18n)
- [ ] Permisos granulares por categoría
- [ ] Bulk edit (editar múltiples opciones)
- [ ] Preview de cambios antes de guardar

---

## Uso en Módulo de Huéspedes

Ahora que tenemos los parámetros, el módulo de huéspedes podrá usar:

```typescript
// En guest-create-update.component.ts
documentTypes$ = this.parametersService.getOptions('documentTypes');
guestTypes$ = this.parametersService.getOptions('guestTypes');
countries$ = this.parametersService.getOptions('countries');

// En el template
<mat-select formControlName="documentType">
  <mat-option *ngFor="let type of documentTypes$" [value]="type.value">
    {{type.label}}
  </mat-option>
</mat-select>
```

---

**Tópico completado exitosamente** ✅

**Siguiente paso**: Implementar módulo de Huéspedes usando estos parámetros
