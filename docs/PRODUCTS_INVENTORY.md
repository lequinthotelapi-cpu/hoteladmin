# Módulo de Inventario de Productos

## Objetivo
Implementar un sistema completo de gestión de inventario de productos para el hotel, incluyendo bebidas, alimentos y productos de aseo. El módulo permite controlar stock, precios, categorías y alertas de stock bajo.

## Características Implementadas

### 1. Modelo de Datos (Product)
**Archivo**: `/workspace/src/app/domain/models/product.model.ts`

```typescript
interface Product {
  id: string;
  code: string;                 // Código único del producto (SKU)
  name: string;                 // Nombre del producto
  description?: string;         // Descripción opcional
  category: string;             // Categoría (bebidas, alimentos, aseo)
  measurementUnit: string;      // Unidad de medida (unidad, caja, litro, kg)
  currentStock: number;         // Stock actual
  minStock: number;             // Stock mínimo (alerta)
  cost: number;                 // Costo del producto
  price: number;                // Precio de venta
  photoUrl?: string;            // URL de la foto
  isActive: boolean;            // Estado activo/inactivo
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```

**Campos Requeridos**: code, name, category, measurementUnit, currentStock, minStock, cost, price, isActive

**Campos Opcionales**: description, photoUrl

### 2. Repository Pattern
**Interfaz**: `/workspace/src/app/core/repositories/product.repository.ts`
- `getAll()`: Obtener todos los productos
- `getById(id)`: Obtener producto por ID
- `create(data)`: Crear nuevo producto
- `update(id, data)`: Actualizar producto
- `delete(id)`: Eliminar producto
- `searchByCode(code)`: Buscar por código
- `getLowStockProducts()`: Productos con stock bajo

**Implementación Firebase**: `/workspace/src/app/core/repositories/product-firebase.repository.ts`
- Conversión automática de Timestamps a Date
- Colección: `products`
- Filtrado de productos con stock <= minStock

### 3. Service Layer con Validaciones
**Archivo**: `/workspace/src/app/core/services/product.service.ts`

**Validaciones Implementadas**:
- ✅ Código único (no duplicados)
- ✅ Stock actual >= 0
- ✅ Stock mínimo >= 0
- ✅ Costo >= 0
- ✅ Precio >= 0
- ✅ Precio >= Costo (margen de ganancia)

**Métodos Adicionales**:
- `adjustStock(id, quantity, userId)`: Ajustar stock (entrada/salida)
  - Valida stock suficiente para salidas
  - Actualiza currentStock

### 4. Nuevos Parámetros del Sistema
**Archivo**: `/workspace/src/app/core/services/parameters.service.ts`

**productCategories**:
- Bebidas
- Alimentos
- Productos de Aseo
- Amenidades
- Otros

**measurementUnits**:
- Unidad
- Caja
- Litro
- Kilogramo
- Gramo
- Paquete

### 5. Gestión de Fotos
**Archivo**: `/workspace/src/app/core/services/storage.service.ts`

**Métodos Agregados**:
- `uploadProductPhoto(file)`: Sube foto a `products/photos/`
- `deleteProductPhoto(photoUrl)`: Elimina foto del storage

**Ruta de Storage**: `products/photos/product_{timestamp}.{ext}`

### 6. UI - Lista de Productos
**Componente**: `/workspace/src/app/features/private/products/products-list/`

**Características**:
- ✅ Tabla con fury-list
- ✅ Columnas: Código, Nombre, Categoría, Stock, Precio, Estado, Acciones
- ✅ Badge de alerta en stock bajo (stock <= minStock)
- ✅ Filtro de búsqueda
- ✅ Paginación (5, 10, 20, 50)
- ✅ Ordenamiento por columnas
- ✅ Chips de estado (Activo/Inactivo)
- ✅ Botones de acción (Editar, Eliminar)

**Badge de Stock Bajo**:
```html
<span [matBadge]="isLowStock(row) ? '!' : ''" 
      [matBadgeColor]="isLowStock(row) ? 'warn' : ''">
  {{ row.currentStock }} {{ row.measurementUnit }}
</span>
```

### 7. UI - Formulario de Producto
**Componente**: `/workspace/src/app/features/private/products/product-create-update/`

**Stepper Horizontal (3 Pasos)**:

**Paso 1: Información Básica**
- Código (requerido, max 50 caracteres)
- Nombre (requerido, max 200 caracteres)
- Categoría (select, requerido)
- Unidad de Medida (select, requerido)
- Descripción (opcional, max 500 caracteres)

**Paso 2: Precios y Stock**
- Costo (requerido, >= 0)
- Precio de Venta (requerido, >= 0)
- Stock Actual (requerido, >= 0)
- Stock Mínimo (requerido, >= 0, con hint de alerta)
- Estado Activo (toggle)

**Paso 3: Foto del Producto**
- Preview de imagen (300x300px)
- Upload de foto
- Botón para cambiar/remover foto
- Placeholder cuando no hay foto

### 8. Routing y Navegación
**Ruta**: `/products`

**Menú Lateral**:
- Nombre: "Productos"
- Icono: `inventory_2`
- Posición: 14

### 9. Reglas de Seguridad

**Firestore** (`/workspace/firestore.rules`):
```javascript
match /products/{productId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAuthenticated();
  allow delete: if isAdmin();
}
```

**Storage** (`/workspace/storage.rules`):
```javascript
match /products/photos/{fileName} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

## Archivos Creados

### Domain Layer
- `/workspace/src/app/domain/models/product.model.ts`

### Infrastructure Layer
- `/workspace/src/app/core/repositories/product.repository.ts`
- `/workspace/src/app/core/repositories/product-firebase.repository.ts`
- `/workspace/src/app/core/services/product.service.ts`

### Feature Layer
- `/workspace/src/app/features/private/products/products.module.ts`
- `/workspace/src/app/features/private/products/products-list/products-list.component.ts`
- `/workspace/src/app/features/private/products/products-list/products-list.component.html`
- `/workspace/src/app/features/private/products/products-list/products-list.component.scss`
- `/workspace/src/app/features/private/products/product-create-update/product-create-update.component.ts`
- `/workspace/src/app/features/private/products/product-create-update/product-create-update.component.html`
- `/workspace/src/app/features/private/products/product-create-update/product-create-update.component.scss`

## Archivos Modificados

- `/workspace/src/app/core/services/storage.service.ts` - Agregados métodos para fotos de productos
- `/workspace/src/app/core/services/parameters.service.ts` - Agregadas categorías productCategories y measurementUnits
- `/workspace/src/app/domain/models/parameter.model.ts` - Agregados tipos productCategories y measurementUnits
- `/workspace/src/app/app-routing.module.ts` - Agregada ruta /products
- `/workspace/src/app/app.component.ts` - Agregado item de menú "Productos"
- `/workspace/firestore.rules` - Agregadas reglas para colección products
- `/workspace/storage.rules` - Agregadas reglas para products/photos/

## Flujo de Uso

### Crear Producto
1. Click en botón FAB "+" en lista de productos
2. **Paso 1**: Ingresar código, nombre, categoría, unidad de medida, descripción
3. **Paso 2**: Ingresar costo, precio, stock actual, stock mínimo, estado
4. **Paso 3**: Subir foto del producto (opcional)
5. Click en "Crear"
6. Validaciones automáticas (código único, precio >= costo, stocks >= 0)

### Editar Producto
1. Click en botón "Editar" en la fila del producto
2. Modificar campos necesarios en el stepper
3. Click en "Actualizar"
4. Validaciones automáticas

### Eliminar Producto
1. Click en botón "Eliminar" en la fila del producto
2. Confirmar eliminación en diálogo
3. Solo administradores pueden eliminar

### Alertas de Stock Bajo
- Badge rojo "!" aparece automáticamente cuando `currentStock <= minStock`
- Visible en columna de Stock en la tabla

### Ajustar Stock
```typescript
// Entrada de stock (+10 unidades)
await productService.adjustStock(productId, 10, userId);

// Salida de stock (-5 unidades)
await productService.adjustStock(productId, -5, userId);
```

## Conceptos Técnicos Aplicados

### 1. Repository Pattern
Abstracción de la capa de datos con interfaz y múltiples implementaciones posibles (Firebase, REST API, etc.)

### 2. Service Layer
Lógica de negocio centralizada con validaciones antes de persistir datos

### 3. Reactive Forms
Formularios reactivos con validaciones síncronas y asíncronas

### 4. Material Stepper
Formulario multi-paso con navegación horizontal y validación por paso

### 5. Material Badges
Indicadores visuales para alertas de stock bajo

### 6. Firebase Storage
Almacenamiento de imágenes con URLs públicas

### 7. Timestamp Conversion
Conversión automática de Firebase Timestamp a Date en repositorio

### 8. Dependency Injection
Inyección de repositorios y servicios en módulo feature

### 9. Observable Pattern
Uso de RxJS para datos reactivos y actualizaciones en tiempo real

### 10. Material Dialog
Diálogos modales para crear/editar productos

## Ventajas del Diseño

1. **Escalabilidad**: Fácil agregar nuevas categorías o unidades de medida
2. **Validación Robusta**: Previene datos inconsistentes (precio < costo, stock negativo)
3. **Alertas Automáticas**: Badge visual para stock bajo sin configuración adicional
4. **Reutilización**: Método `adjustStock()` para movimientos de inventario
5. **Seguridad**: Reglas de Firestore y Storage protegen datos
6. **UX Intuitiva**: Stepper guía al usuario paso a paso
7. **Búsqueda Eficiente**: Filtro en tiempo real por cualquier campo
8. **Auditoría**: Campos createdBy/updatedBy rastrean cambios

## Próximos Pasos Sugeridos

1. **Movimientos de Inventario**: Módulo para registrar entradas/salidas con historial
2. **Proveedores**: Relacionar productos con proveedores
3. **Punto de Venta**: Usar productos en ventas y facturación
4. **Reportes**: Dashboard de productos más vendidos, stock bajo, margen de ganancia
5. **Códigos de Barras**: Escaneo de códigos para búsqueda rápida
6. **Lotes y Vencimientos**: Control de fechas de vencimiento para alimentos
7. **Precios por Temporada**: Tarifas especiales en fechas específicas
8. **Descuentos**: Sistema de descuentos por cantidad o promociones
