# Módulo de Gestión de Gastos e Inventario

## Objetivo
Implementar un sistema completo para rastrear movimientos de inventario (entradas/salidas de productos) y registrar gastos operativos del hotel, proporcionando control financiero y trazabilidad de stock.

## Características Implementadas

### 1. Modelos de Datos

#### InventoryMovement
**Archivo**: `/workspace/src/app/domain/models/inventory-movement.model.ts`

```typescript
interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: 'entry' | 'exit' | 'adjustment';
  reason: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  previousStock: number;
  newStock: number;
  supplierId?: string;
  invoiceNumber?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
}
```

**Campos Requeridos**: productId, type, reason, quantity, createdBy

**Tipos de Movimiento**:
- `entry`: Entrada (compras, devoluciones)
- `exit`: Salida (ventas, consumo)
- `adjustment`: Ajuste de inventario

#### Expense
**Archivo**: `/workspace/src/app/domain/models/expense.model.ts`

```typescript
interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  paymentMethod: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  createdByName: string;
}
```

**Campos Requeridos**: category, description, amount, date, paymentMethod, createdBy

### 2. Nuevos Parámetros del Sistema

**expenseCategories** (7 categorías):
- Servicios Públicos (utilities)
- Mantenimiento (maintenance)
- Limpieza (cleaning)
- Salarios (salaries)
- Suministros (supplies)
- Marketing (marketing)
- Otros (other)

**movementReasons** (6 motivos):
- Compra (purchase)
- Venta (sale)
- Merma (waste)
- Ajuste (adjustment)
- Consumo Interno (internal)
- Devolución (return)

### 3. Repository Pattern

#### InventoryMovementRepository
**Interfaz**: `/workspace/src/app/core/repositories/inventory-movement.repository.ts`
- `getAll()`: Todos los movimientos ordenados por fecha desc
- `getById(id)`: Movimiento por ID
- `getByProduct(productId)`: Historial de movimientos por producto
- `create(data)`: Crear movimiento
- `update(id, data)`: Actualizar notas
- `delete(id)`: Eliminar (no permitido)

**Implementación Firebase**: `/workspace/src/app/core/repositories/inventory-movement-firebase.repository.ts`
- Conversión automática de Timestamps
- Query con orderBy('createdAt', 'desc')
- Colección: `inventoryMovements`

#### ExpenseRepository
**Interfaz**: `/workspace/src/app/core/repositories/expense.repository.ts`
- `getAll()`: Todos los gastos ordenados por fecha desc
- `getById(id)`: Gasto por ID
- `getByDateRange(start, end)`: Gastos en rango de fechas
- `create(data)`: Crear gasto
- `update(id, data)`: Actualizar gasto
- `delete(id)`: Eliminar gasto

**Implementación Firebase**: `/workspace/src/app/core/repositories/expense-firebase.repository.ts`
- Conversión automática de Timestamps (date, createdAt, updatedAt)
- Query con where para rango de fechas
- Colección: `expenses`

### 4. Service Layer con Validaciones

#### InventoryMovementService
**Archivo**: `/workspace/src/app/core/services/inventory-movement.service.ts`

**Lógica de Negocio**:
- ✅ Valida que el producto exista
- ✅ Calcula cambio de stock según tipo:
  - Entry: +quantity
  - Exit: -quantity (valida stock suficiente)
  - Adjustment: +/- quantity
- ✅ Valida que stock no sea negativo
- ✅ Calcula totalCost = unitCost * quantity
- ✅ Actualiza automáticamente el stock del producto
- ✅ Registra stock anterior y nuevo
- ✅ No permite eliminar movimientos (integridad de datos)

**Flujo de Creación**:
1. Obtiene producto de la BD
2. Valida stock suficiente (si es salida)
3. Calcula nuevo stock
4. Crea movimiento con datos completos
5. Actualiza stock del producto

#### ExpenseService
**Archivo**: `/workspace/src/app/core/services/expense.service.ts`

**Validaciones**:
- ✅ Monto > 0
- ✅ Campos requeridos completos

**Métodos**:
- `getByDateRange()`: Para reportes por período
- `create()`: Registra gasto con validaciones
- `update()`: Actualiza gasto
- `delete()`: Elimina gasto (solo admin)

### 5. Gestión de Archivos

**StorageService** - Métodos agregados:
- `uploadExpenseReceipt(file)`: Sube comprobante a `expenses/receipts/`
- `deleteExpenseReceipt(url)`: Elimina comprobante

**Ruta de Storage**: `expenses/receipts/receipt_{timestamp}.{ext}`

### 6. UI Components

#### InventoryDashboardComponent
**Ruta**: `/inventory`
**Archivo**: `/workspace/src/app/features/private/inventory/inventory-dashboard/`

**Características**:
- Layout con tabs de Material
- Tab 1: Movimientos de Inventario
- Tab 2: Gastos Operativos

#### MovementsListComponent
**Archivo**: `/workspace/src/app/features/private/inventory/movements-list/`

**Características**:
- ✅ Tabla con fury-list
- ✅ Columnas: Fecha, Producto (nombre + código), Tipo, Motivo, Cantidad, Stock Anterior, Stock Nuevo, Usuario
- ✅ Chips de colores por tipo:
  - Entry: primary (azul)
  - Exit: warn (rojo)
  - Adjustment: accent (cyan)
- ✅ Cantidad con color:
  - Verde para entradas (+)
  - Rojo para salidas (-)
- ✅ Filtro de búsqueda
- ✅ Paginación (10, 20, 50)
- ✅ Ordenamiento por columnas
- ✅ Botón FAB para crear movimiento

#### MovementCreateComponent
**Archivo**: `/workspace/src/app/features/private/inventory/movement-create/`

**Formulario (Modal 600px)**:
- Producto (select con stock actual visible)
- Tipo de Movimiento (select: Entrada, Salida, Ajuste)
- Motivo (select desde parámetros)
- Cantidad (number, min 1)
- Costo Unitario (opcional, para compras)
- Número de Factura (opcional)
- Notas (textarea, max 500 caracteres)

**Validaciones**:
- Todos los campos requeridos
- Cantidad > 0
- Stock suficiente para salidas (validado en service)

#### ExpensesListComponent
**Archivo**: `/workspace/src/app/features/private/inventory/expenses-list/`

**Características**:
- ✅ Tabla con fury-list
- ✅ Columnas: Fecha, Categoría, Descripción, Monto, Método de Pago, Usuario, Acciones
- ✅ Monto en rojo con formato de moneda
- ✅ Botones de acción: Editar, Eliminar
- ✅ Filtro de búsqueda
- ✅ Paginación
- ✅ Botón FAB para crear gasto

#### ExpenseCreateUpdateComponent
**Archivo**: `/workspace/src/app/features/private/inventory/expense-create-update/`

**Formulario (Modal 700px)**:
- Categoría (select desde parámetros)
- Fecha (datepicker)
- Descripción (input, max 200 caracteres)
- Monto (number, min 0.01)
- Método de Pago (select desde parámetros)
- Número de Factura (opcional)
- Notas (textarea, max 500 caracteres)
- Comprobante (upload de imagen, preview 200x200px)

**Upload de Comprobante**:
- Preview de imagen antes de subir
- Botón para cambiar/remover
- Placeholder cuando no hay imagen
- Sube a Firebase Storage

### 7. Routing y Navegación

**Ruta Principal**: `/inventory`

**Menú Lateral**:
- Nombre: "Inventario"
- Icono: `receipt_long`
- Posición: 15

**Estructura de Tabs**:
```
/inventory
  ├─ Tab: Movimientos
  └─ Tab: Gastos
```

### 8. Reglas de Seguridad

**Firestore** (`/workspace/firestore.rules`):
```javascript
// Movimientos de inventario
match /inventoryMovements/{movementId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAuthenticated();
  allow delete: if false; // No se pueden eliminar
}

// Gastos
match /expenses/{expenseId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAuthenticated();
  allow delete: if isAdmin();
}
```

**Storage** (`/workspace/storage.rules`):
```javascript
match /expenses/receipts/{fileName} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

**Estado**: ✅ Reglas desplegadas en Firebase

## Archivos Creados

### Domain Layer (2)
- `/workspace/src/app/domain/models/inventory-movement.model.ts`
- `/workspace/src/app/domain/models/expense.model.ts`

### Infrastructure Layer (4)
- `/workspace/src/app/core/repositories/inventory-movement.repository.ts`
- `/workspace/src/app/core/repositories/inventory-movement-firebase.repository.ts`
- `/workspace/src/app/core/repositories/expense.repository.ts`
- `/workspace/src/app/core/repositories/expense-firebase.repository.ts`

### Service Layer (2)
- `/workspace/src/app/core/services/inventory-movement.service.ts`
- `/workspace/src/app/core/services/expense.service.ts`

### Feature Layer (11)
- `/workspace/src/app/features/private/inventory/inventory.module.ts`
- `/workspace/src/app/features/private/inventory/inventory-dashboard/` (3 archivos)
- `/workspace/src/app/features/private/inventory/movements-list/` (3 archivos)
- `/workspace/src/app/features/private/inventory/movement-create/` (3 archivos)
- `/workspace/src/app/features/private/inventory/expenses-list/` (3 archivos)
- `/workspace/src/app/features/private/inventory/expense-create-update/` (3 archivos)

## Archivos Modificados

- `/workspace/src/app/core/services/storage.service.ts` - Métodos para comprobantes
- `/workspace/src/app/core/services/parameters.service.ts` - Nuevos parámetros
- `/workspace/src/app/domain/models/parameter.model.ts` - Tipos actualizados
- `/workspace/src/app/app-routing.module.ts` - Ruta /inventory
- `/workspace/src/app/app.component.ts` - Menú "Inventario"
- `/workspace/firestore.rules` - Reglas para movements y expenses
- `/workspace/storage.rules` - Reglas para receipts

## Flujo de Uso

### Registrar Movimiento de Inventario

1. Ir a `/inventory` → Tab "Movimientos"
2. Click en botón FAB "+"
3. Seleccionar producto (muestra stock actual)
4. Seleccionar tipo: Entrada, Salida o Ajuste
5. Seleccionar motivo (desde parámetros)
6. Ingresar cantidad
7. Opcional: Costo unitario, número de factura, notas
8. Click en "Registrar"
9. **Automático**: Stock del producto se actualiza
10. Movimiento aparece en la lista con colores según tipo

### Registrar Gasto Operativo

1. Ir a `/inventory` → Tab "Gastos"
2. Click en botón FAB "+"
3. Seleccionar categoría
4. Seleccionar fecha
5. Ingresar descripción y monto
6. Seleccionar método de pago
7. Opcional: Número de factura, notas, comprobante
8. Si hay comprobante: Click en "Subir Comprobante" → Seleccionar imagen
9. Click en "Registrar"
10. Gasto aparece en la lista

### Editar Gasto

1. Click en botón "Editar" en la fila del gasto
2. Modificar campos necesarios
3. Cambiar comprobante si es necesario
4. Click en "Actualizar"

### Eliminar Gasto

1. Click en botón "Eliminar" en la fila del gasto
2. Confirmar eliminación en SweetAlert2
3. Solo administradores pueden eliminar

## Conceptos Técnicos Aplicados

### 1. Actualización Automática de Stock
El service calcula el nuevo stock y actualiza el producto en la misma transacción

### 2. Integridad de Datos
Los movimientos no se pueden eliminar para mantener historial completo

### 3. Cálculo de Costos
`totalCost = unitCost * quantity` calculado automáticamente

### 4. Validación de Stock
Valida stock suficiente antes de permitir salidas

### 5. Timestamp Conversion
Conversión automática de Firebase Timestamp a Date en repositorios

### 6. File Upload
Upload de comprobantes con preview y gestión de archivos antiguos

### 7. Material Tabs
Organización de funcionalidades en tabs para mejor UX

### 8. Color Coding
Chips y textos con colores según tipo de movimiento

### 9. Date Range Queries
Firestore queries con where para filtrar por rango de fechas

### 10. Dependency Injection
Inyección de ProductService en InventoryMovementService

## Ventajas del Diseño

1. **Trazabilidad Completa**: Historial de todos los movimientos de inventario
2. **Actualización Automática**: Stock se actualiza sin intervención manual
3. **Control Financiero**: Registro de gastos con comprobantes
4. **Integridad de Datos**: Movimientos no eliminables
5. **Validaciones Robustas**: Previene stock negativo y montos inválidos
6. **UX Intuitiva**: Tabs para separar funcionalidades
7. **Visual Feedback**: Colores para identificar tipos de movimiento
8. **Reportes Preparados**: Método getByDateRange para reportes futuros

## Próximos Pasos Sugeridos

1. **Dashboard de Inventario**: Gráficas de movimientos, productos más consumidos
2. **Reportes de Gastos**: Gastos por categoría, comparación mensual
3. **Alertas de Stock**: Notificaciones cuando productos lleguen a stock mínimo
4. **Proveedores**: Relacionar compras con proveedores
5. **Exportación**: Exportar movimientos y gastos a Excel/PDF
6. **Filtros Avanzados**: Filtrar por fecha, tipo, categoría
7. **Costos Promedio**: Calcular costo promedio ponderado
8. **Presupuestos**: Definir presupuestos por categoría de gasto

## Notas Importantes

### Parámetros Nuevos
Para que funcionen los selects de Motivo y Categoría, debes:
1. Ir a Firebase Console → Firestore
2. Eliminar TODA la colección `parameters`
3. Recargar la app
4. Los parámetros se crearán automáticamente incluyendo `movementReasons` y `expenseCategories`

### Permisos
- Cualquier usuario autenticado puede crear movimientos y gastos
- Solo administradores pueden eliminar gastos
- Los movimientos NO se pueden eliminar (integridad)

### Stock
- El stock se actualiza automáticamente al crear movimientos
- No se permite stock negativo
- Se valida stock suficiente para salidas

## Testing

### Casos de Prueba Recomendados
- ✅ Crear entrada de producto (stock aumenta)
- ✅ Crear salida de producto (stock disminuye)
- ✅ Intentar salida con stock insuficiente (debe fallar)
- ✅ Crear ajuste de inventario
- ✅ Verificar que movimientos no se pueden eliminar
- ✅ Crear gasto con comprobante
- ✅ Editar gasto y cambiar comprobante
- ✅ Eliminar gasto (solo admin)
- ✅ Filtrar movimientos por producto
- ✅ Verificar colores de chips según tipo
