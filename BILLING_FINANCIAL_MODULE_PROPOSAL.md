# Módulo de Facturación y Consolidación Financiera - PROPUESTA

## 🎯 Objetivo

Crear un sistema completo de facturación y consolidación financiera que unifique todos los ingresos del hotel (Guest Accounts + POS) y genere reportes contables reales.

---

## 🔴 PROBLEMAS ACTUALES

### 1. No hay Facturación Formal
- Guest Accounts se cierran sin generar factura fiscal
- No hay numeración consecutiva de facturas
- No se capturan datos fiscales del cliente
- No hay documento imprimible/PDF

### 2. Ingresos Fragmentados
```
┌─────────────────┐     ┌──────────────┐
│ Guest Accounts  │     │  POS Directo │
│  (habitaciones) │     │   (ventas)   │
└─────────────────┘     └──────────────┘
        ↓                       ↓
    NO HAY CONSOLIDACIÓN FINANCIERA
```

### 3. Cash Register Solo Cubre POS
- Cash Register solo registra ventas POS directas
- Guest Accounts NO pasan por caja
- Pagos de habitación NO se registran en caja
- Imposible hacer arqueo real del hotel

### 4. No hay Reportes Financieros
- No existe reporte de ingresos totales
- No hay balance general
- No hay flujo de caja consolidado
- No hay análisis de rentabilidad

---

## ✅ SOLUCIÓN PROPUESTA

### Módulo 1: **Billing (Facturación)**

#### Funcionalidades:
1. **Generar Factura desde Guest Account**
   - Al cerrar cuenta → opción "Generar Factura"
   - Capturar datos fiscales del cliente
   - Numeración consecutiva automática
   - Generar PDF con formato fiscal

2. **Generar Factura desde POS**
   - Opción de facturar venta directa
   - Mismo flujo de datos fiscales

3. **Gestión de Facturas**
   - Listado de facturas emitidas
   - Búsqueda por número, cliente, fecha
   - Anular facturas (con nota de crédito)
   - Reimpresión de facturas

#### Modelo de Datos:
```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;        // Consecutivo: FAC-2024-0001
  type: 'guest_account' | 'pos'; // Origen
  referenceId: string;           // ID de Guest Account o Sale
  
  // Datos fiscales
  clientName: string;
  clientTaxId: string;           // NIT/RFC
  clientAddress?: string;
  clientEmail?: string;
  
  // Financiero
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  
  // Metadata
  status: 'active' | 'cancelled';
  issuedAt: Date;
  issuedBy: string;
  cancelledAt?: Date;
  cancelReason?: string;
  
  // PDF
  pdfUrl?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
```

---

### Módulo 2: **Financial Reports (Reportes Financieros)**

#### Funcionalidades:

#### 1. **Dashboard Financiero**
Métricas en tiempo real:
- Ingresos del día/mes/año
- Ocupación y RevPAR
- Ventas POS vs Habitaciones
- Gastos operativos
- Utilidad neta

#### 2. **Reporte de Ingresos Consolidado**
```
┌─────────────────────────────────────────┐
│  INGRESOS TOTALES - Febrero 2024        │
├─────────────────────────────────────────┤
│ Alojamiento:           $15,000          │
│ Servicios (POS a hab): $ 3,500          │
│ Ventas POS directas:   $ 2,800          │
│ Otros cargos:          $   700          │
├─────────────────────────────────────────┤
│ TOTAL INGRESOS:        $22,000          │
│ GASTOS:                $ 8,000          │
│ UTILIDAD NETA:         $14,000          │
└─────────────────────────────────────────┘
```

**Fuentes de datos:**
- Guest Accounts cerradas (charges)
- Sales (POS directas)
- Transactions tipo 'expense'

#### 3. **Flujo de Caja Real**
```
Saldo Inicial:         $10,000
+ Ingresos en efectivo: $ 8,000
+ Ingresos con tarjeta: $ 6,000
- Gastos:              $ 3,000
- Retiros:             $ 2,000
= Saldo Final:         $19,000
```

**Desglose por método de pago:**
- Efectivo
- Tarjeta
- Transferencia
- Depósito

#### 4. **Reporte de Cuentas por Cobrar**
Guest Accounts abiertas con saldo pendiente:
```
Hab. 101 - Juan Pérez:    $339 (3 días)
Hab. 205 - María López:   $520 (2 días)
TOTAL POR COBRAR:         $859
```

#### 5. **Análisis de Rentabilidad**
- Ingresos por tipo de habitación
- Productos más vendidos en POS
- Servicios más consumidos
- Temporadas de mayor ocupación

---

### Módulo 3: **Accounting Integration (Integración Contable)**

#### Funcionalidades:

#### 1. **Asientos Contables Automáticos**
Cada transacción genera asiento:

**Venta POS:**
```
DEBE: Caja           $100
HABER: Ingresos POS  $100
```

**Cargo a Habitación:**
```
DEBE: Cuentas por Cobrar  $50
HABER: Ingresos Servicios $50
```

**Pago de Guest Account:**
```
DEBE: Caja                 $339
HABER: Cuentas por Cobrar  $339
```

**Gasto:**
```
DEBE: Gastos Operativos  $30
HABER: Caja              $30
```

#### 2. **Libro Mayor**
Registro de todos los asientos contables

#### 3. **Balance General**
- Activos (Caja, Cuentas por Cobrar, Inventario)
- Pasivos
- Patrimonio

#### 4. **Estado de Resultados**
- Ingresos
- Costos
- Gastos
- Utilidad

---

## 🏗️ ARQUITECTURA PROPUESTA

### Colecciones Firestore:

#### `invoices`
```javascript
{
  invoiceNumber: "FAC-2024-0001",
  type: "guest_account",
  referenceId: "guestAccountId",
  clientName: "Juan Pérez",
  clientTaxId: "123456789",
  items: [...],
  subtotal: 300,
  tax: 39,
  total: 339,
  status: "active",
  issuedAt: Timestamp,
  issuedBy: "userId",
  pdfUrl: "storage/invoices/FAC-2024-0001.pdf"
}
```

#### `accountingEntries` (Asientos Contables)
```javascript
{
  entryNumber: "ASI-2024-0001",
  date: Timestamp,
  description: "Venta POS #123",
  reference: "saleId",
  lines: [
    { account: "1101-Caja", debit: 100, credit: 0 },
    { account: "4101-Ingresos POS", debit: 0, credit: 100 }
  ],
  createdBy: "userId"
}
```

#### `financialPeriods` (Períodos Contables)
```javascript
{
  year: 2024,
  month: 2,
  status: "open" | "closed",
  totalRevenue: 22000,
  totalExpenses: 8000,
  netIncome: 14000,
  closedAt?: Timestamp
}
```

---

## 🔄 FLUJOS INTEGRADOS

### Flujo 1: Check-out con Factura
```
1. Usuario hace check-out
2. Guest Account queda abierta con balance
3. Usuario registra pago final
4. Balance = 0
5. Usuario hace clic en "Cerrar y Facturar"
6. Sistema muestra formulario de datos fiscales
7. Sistema genera factura con número consecutivo
8. Sistema genera PDF
9. Sistema cierra Guest Account
10. Sistema crea asiento contable
```

### Flujo 2: Venta POS con Factura
```
1. Usuario procesa venta en POS
2. Sistema pregunta: "¿Requiere factura?"
3. Si SÍ → Captura datos fiscales
4. Sistema genera factura
5. Sistema registra venta en Cash Register
6. Sistema crea asiento contable
```

### Flujo 3: Cierre de Día
```
1. Usuario cierra caja
2. Sistema calcula:
   - Ventas POS del día
   - Pagos de Guest Accounts del día
   - Gastos del día
3. Sistema genera reporte de cierre diario
4. Sistema actualiza período contable
```

---

## 📊 REPORTES CLAVE

### 1. Reporte Diario de Operaciones
```
FECHA: 13 de Febrero 2024

INGRESOS:
- Alojamiento:        $500
- POS Habitaciones:   $150
- POS Directo:        $200
- Otros:              $ 50
TOTAL INGRESOS:       $900

GASTOS:
- Operativos:         $100
- Compras:            $150
TOTAL GASTOS:         $250

UTILIDAD DEL DÍA:     $650

MÉTODOS DE PAGO:
- Efectivo:           $400
- Tarjeta:            $500

CAJA:
- Saldo Inicial:      $1,000
- Ingresos:           $  400 (efectivo)
- Gastos:             $  250
- Saldo Final:        $1,150
```

### 2. Reporte Mensual
- Ingresos por día (gráfica)
- Ocupación promedio
- RevPAR (Revenue Per Available Room)
- Productos más vendidos
- Gastos por categoría

### 3. Reporte Anual
- Comparativa mes a mes
- Tendencias de ocupación
- Análisis de rentabilidad
- Proyecciones

---

## 🎨 UI PROPUESTA

### Menú Principal:
```
├── Recepción
├── Habitaciones
├── Reservas
├── Cuentas (Guest Accounts)
├── POS
├── Caja
├── Movimientos
├── 📄 Facturación ← NUEVO
│   ├── Generar Factura
│   ├── Listado de Facturas
│   └── Anular Factura
├── 📊 Reportes Financieros ← NUEVO
│   ├── Dashboard
│   ├── Ingresos Consolidados
│   ├── Flujo de Caja
│   ├── Cuentas por Cobrar
│   └── Análisis de Rentabilidad
└── 📚 Contabilidad ← NUEVO (Opcional)
    ├── Asientos Contables
    ├── Libro Mayor
    ├── Balance General
    └── Estado de Resultados
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Facturación Básica (Prioridad ALTA)
- [ ] Modelo de Invoice
- [ ] Generar factura desde Guest Account
- [ ] Captura de datos fiscales
- [ ] Numeración consecutiva
- [ ] Listado de facturas
- [ ] Generación de PDF básico

**Tiempo estimado:** 2-3 días

### Fase 2: Reportes Financieros (Prioridad ALTA)
- [ ] Dashboard con métricas clave
- [ ] Reporte de ingresos consolidados
- [ ] Reporte de cuentas por cobrar
- [ ] Flujo de caja
- [ ] Exportar a Excel/PDF

**Tiempo estimado:** 3-4 días

### Fase 3: Integración Contable (Prioridad MEDIA)
- [ ] Modelo de asientos contables
- [ ] Generación automática de asientos
- [ ] Libro mayor
- [ ] Balance general
- [ ] Estado de resultados

**Tiempo estimado:** 4-5 días

### Fase 4: Mejoras Avanzadas (Prioridad BAJA)
- [ ] Integración con sistema fiscal (SAT, DIAN, etc.)
- [ ] Factura electrónica
- [ ] Notas de crédito
- [ ] Reportes personalizados
- [ ] Exportación a software contable

**Tiempo estimado:** 5-7 días

---

## 💡 RECOMENDACIÓN

**Implementar FASE 1 y FASE 2 de inmediato** porque:

1. ✅ Son esenciales para operación real del hotel
2. ✅ Unifican todos los ingresos (Guest Accounts + POS)
3. ✅ Permiten tomar decisiones basadas en datos reales
4. ✅ Cumplen requisitos fiscales básicos
5. ✅ No son excesivamente complejas

**La FASE 3 (Contabilidad)** es opcional si:
- El hotel usa software contable externo (QuickBooks, Contpaqi, etc.)
- Solo necesitan exportar datos para contabilidad externa

---

## 📋 CHECKLIST DE VALIDACIÓN

Antes de considerar el sistema "completo", debe poder:

- [ ] Generar factura fiscal desde Guest Account cerrada
- [ ] Generar factura desde venta POS
- [ ] Ver reporte de ingresos totales del mes
- [ ] Ver cuánto dinero hay realmente en caja
- [ ] Ver cuánto deben los huéspedes (cuentas por cobrar)
- [ ] Exportar reporte financiero a Excel/PDF
- [ ] Calcular utilidad neta del período
- [ ] Desglosar ingresos por fuente (alojamiento, POS, servicios)

---

## 🎯 CONCLUSIÓN

**SÍ, FALTA un módulo crítico de Facturación y Consolidación Financiera.**

El sistema actual tiene:
- ✅ Gestión operativa (reservas, habitaciones, cuentas)
- ✅ Punto de venta funcional
- ✅ Control de caja para POS

Pero NO tiene:
- ❌ Facturación formal
- ❌ Consolidación de ingresos
- ❌ Reportes financieros reales
- ❌ Visión completa del negocio

**Sin este módulo, el hotel NO puede:**
- Cumplir obligaciones fiscales
- Conocer su rentabilidad real
- Tomar decisiones financieras informadas
- Hacer arqueos completos
- Generar reportes para gerencia/dueños

---

**Prioridad:** 🔴 ALTA  
**Impacto:** 🔴 CRÍTICO  
**Complejidad:** 🟡 MEDIA  

**Recomendación:** Implementar Fase 1 y 2 antes de agregar más funcionalidades operativas.
