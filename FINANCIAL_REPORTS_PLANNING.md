# Módulo de Reportes Financieros - Planificación

## 📋 Objetivo

Crear un sistema completo de reportes financieros que consolide todos los ingresos del hotel (Guest Accounts, POS, Facturas) y proporcione métricas clave para la toma de decisiones.

---

## 🎯 Alcance del Módulo

### Dashboard Financiero Principal

**Métricas Clave (KPIs)**:
1. **Ingresos Totales** - Consolidado del período
2. **Ocupación** - % de habitaciones ocupadas
3. **RevPAR** - Revenue Per Available Room
4. **ADR** - Average Daily Rate
5. **Cuentas por Cobrar** - Guest Accounts abiertas
6. **Efectivo en Caja** - Cajas abiertas

**Gráficos**:
1. Ingresos por día (línea)
2. Ingresos por fuente (pie chart)
3. Ocupación mensual (barras)
4. Top 5 productos vendidos (barras horizontales)

**Filtros**:
- Rango de fechas (hoy, semana, mes, año, personalizado)
- Tipo de ingreso (todos, alojamiento, POS, servicios)

---

## 📊 Reportes Específicos

### 1. Reporte de Ingresos Consolidados

**Fuentes de Datos**:
- Guest Accounts cerradas (charges)
- Sales (POS directas)
- Transactions (movimientos de caja)

**Desglose**:
```
INGRESOS TOTALES - Febrero 2024
├── Alojamiento:           $15,000
├── Servicios (POS a hab): $ 3,500
├── Ventas POS directas:   $ 2,800
├── Otros cargos:          $   700
├─────────────────────────────────
│ TOTAL INGRESOS:          $22,000
│ GASTOS:                  $ 8,000
│ UTILIDAD NETA:           $14,000
└─────────────────────────────────
```

**Exportar**: Excel, PDF

### 2. Reporte de Ocupación

**Métricas**:
- Habitaciones disponibles
- Habitaciones ocupadas
- % Ocupación
- Noches vendidas
- Noches disponibles

**Por período**: Día, Semana, Mes, Año

### 3. Reporte de Cuentas por Cobrar

**Datos**:
- Guest Accounts abiertas
- Balance pendiente por cuenta
- Días de antigüedad
- Total por cobrar

**Formato**:
```
Hab. 101 - Juan Pérez:    $339 (3 días)
Hab. 205 - María López:   $520 (2 días)
─────────────────────────────────
TOTAL POR COBRAR:         $859
```

### 4. Reporte de Flujo de Caja

**Datos**:
- Saldo inicial
- Ingresos por método de pago
- Gastos
- Retiros/Depósitos
- Saldo final

**Desglose por método**:
- Efectivo
- Tarjeta
- Transferencia
- Depósito

### 5. Reporte de Productos Más Vendidos

**Datos**:
- Top 10 productos
- Cantidad vendida
- Ingresos generados
- % del total

---

## 🏗️ Arquitectura Propuesta

### Servicio: FinancialReportsService

```typescript
@Injectable({ providedIn: 'root' })
export class FinancialReportsService {
  
  // Dashboard
  getDashboardMetrics(startDate: Date, endDate: Date): Observable<DashboardMetrics>
  
  // Ingresos
  getRevenueReport(startDate: Date, endDate: Date): Observable<RevenueReport>
  getRevenueBySource(startDate: Date, endDate: Date): Observable<RevenueBySource>
  getRevenueByDay(startDate: Date, endDate: Date): Observable<RevenueByDay[]>
  
  // Ocupación
  getOccupancyReport(startDate: Date, endDate: Date): Observable<OccupancyReport>
  getOccupancyByDay(startDate: Date, endDate: Date): Observable<OccupancyByDay[]>
  
  // Cuentas por cobrar
  getAccountsReceivable(): Observable<AccountsReceivable>
  
  // Flujo de caja
  getCashFlowReport(startDate: Date, endDate: Date): Observable<CashFlowReport>
  
  // Productos
  getTopProducts(startDate: Date, endDate: Date, limit: number): Observable<TopProduct[]>
}
```

### Modelos de Datos

```typescript
interface DashboardMetrics {
  totalRevenue: number;
  occupancyRate: number;
  revPAR: number;
  adr: number;
  accountsReceivable: number;
  cashInHand: number;
  
  // Comparación con período anterior
  revenueChange: number;
  occupancyChange: number;
}

interface RevenueReport {
  totalRevenue: number;
  accommodation: number;
  posToRoom: number;
  posDirect: number;
  other: number;
  expenses: number;
  netIncome: number;
}

interface RevenueBySource {
  source: string;
  amount: number;
  percentage: number;
}

interface RevenueByDay {
  date: Date;
  amount: number;
}

interface OccupancyReport {
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  nightsSold: number;
  nightsAvailable: number;
}

interface AccountsReceivable {
  accounts: {
    roomNumber: string;
    guestName: string;
    balance: number;
    daysOpen: number;
  }[];
  totalReceivable: number;
}

interface CashFlowReport {
  initialBalance: number;
  cashIncome: number;
  cardIncome: number;
  transferIncome: number;
  depositIncome: number;
  totalIncome: number;
  expenses: number;
  withdrawals: number;
  totalOutflow: number;
  finalBalance: number;
}

interface TopProduct {
  productName: string;
  quantitySold: number;
  revenue: number;
  percentage: number;
}
```

---

## 🎨 Componentes UI

### 1. FinancialDashboardComponent
**Ruta**: `/reports/dashboard`

**Secciones**:
- Header con filtro de fechas
- Grid de KPIs (6 cards)
- Gráfico de ingresos por día
- Gráfico de ingresos por fuente
- Tabla de resumen

### 2. RevenueReportComponent
**Ruta**: `/reports/revenue`

**Secciones**:
- Filtros de fecha
- Resumen de ingresos
- Desglose por fuente
- Gráfico de tendencia
- Botón exportar

### 3. OccupancyReportComponent
**Ruta**: `/reports/occupancy`

**Secciones**:
- Filtros de fecha
- Métricas de ocupación
- Gráfico de ocupación diaria
- Tabla de detalles

### 4. AccountsReceivableComponent
**Ruta**: `/reports/receivables`

**Secciones**:
- Lista de cuentas abiertas
- Total por cobrar
- Filtros por antigüedad
- Exportar

### 5. CashFlowReportComponent
**Ruta**: `/reports/cash-flow`

**Secciones**:
- Filtros de fecha
- Resumen de flujo
- Desglose por método de pago
- Gráfico de flujo

---

## 📦 Librerías para Gráficos

### Opción Recomendada: **ngx-charts**

**Ventajas**:
- Nativa de Angular
- Basada en D3.js
- Responsive
- Muchos tipos de gráficos
- Fácil de usar

**Instalación**:
```bash
npm install @swimlane/ngx-charts
```

**Tipos de gráficos a usar**:
- Line Chart (ingresos por día)
- Pie Chart (ingresos por fuente)
- Bar Chart (ocupación, productos)
- Number Cards (KPIs)

---

## 🔄 Flujo de Datos

### Cálculo de Ingresos Totales

```typescript
// 1. Guest Accounts cerradas
const guestAccountsRevenue = await this.getGuestAccountsRevenue(startDate, endDate);

// 2. Ventas POS directas
const posRevenue = await this.getPOSRevenue(startDate, endDate);

// 3. Consolidar
const totalRevenue = guestAccountsRevenue + posRevenue;
```

### Cálculo de Ocupación

```typescript
// 1. Total de habitaciones activas
const totalRooms = await this.getTotalActiveRooms();

// 2. Reservas en el período
const bookings = await this.getBookingsInPeriod(startDate, endDate);

// 3. Calcular noches ocupadas
const nightsSold = this.calculateNightsSold(bookings);

// 4. Calcular noches disponibles
const days = this.getDaysBetween(startDate, endDate);
const nightsAvailable = totalRooms * days;

// 5. Ocupación
const occupancyRate = (nightsSold / nightsAvailable) * 100;
```

### Cálculo de RevPAR

```typescript
// RevPAR = Total Revenue / Total Available Rooms
const revPAR = totalRevenue / (totalRooms * days);
```

### Cálculo de ADR

```typescript
// ADR = Total Revenue / Rooms Sold
const adr = totalRevenue / nightsSold;
```

---

## 📁 Estructura de Archivos

```
src/app/
├── domain/
│   └── models/
│       └── financial-report.model.ts
├── core/
│   └── services/
│       └── financial-reports.service.ts
└── features/
    └── private/
        └── reports/
            ├── financial-dashboard/
            │   ├── financial-dashboard.component.*
            ├── revenue-report/
            │   ├── revenue-report.component.*
            ├── occupancy-report/
            │   ├── occupancy-report.component.*
            ├── accounts-receivable/
            │   ├── accounts-receivable.component.*
            ├── cash-flow-report/
            │   ├── cash-flow-report.component.*
            ├── reports.module.ts
            └── reports-routing.module.ts
```

---

## 🎯 Plan de Implementación

### Fase 1: Fundamentos (Prioridad ALTA)
1. ✅ Crear modelos de datos
2. ✅ Crear FinancialReportsService
3. ✅ Implementar cálculos básicos
4. ✅ Crear módulo y routing

### Fase 2: Dashboard (Prioridad ALTA)
5. ✅ Instalar ngx-charts
6. ✅ Crear FinancialDashboardComponent
7. ✅ Implementar KPIs
8. ✅ Implementar gráficos básicos

### Fase 3: Reportes Específicos (Prioridad MEDIA)
9. ✅ Reporte de Ingresos
10. ✅ Reporte de Ocupación
11. ✅ Cuentas por Cobrar
12. ✅ Flujo de Caja

### Fase 4: Exportación (Prioridad BAJA)
13. ✅ Exportar a Excel (xlsx)
14. ✅ Exportar a PDF

---

## 🚀 Inicio de Implementación

**Comenzaremos con**:
1. Modelos de datos
2. Servicio básico
3. Dashboard con KPIs principales
4. Gráfico de ingresos

**Tiempo estimado**: 2-3 horas

---

## 📊 Métricas de Éxito

- ✅ Dashboard muestra métricas en tiempo real
- ✅ Gráficos se actualizan con filtros de fecha
- ✅ Datos consolidados correctamente
- ✅ Exportación funcional
- ✅ UI responsive y profesional

---

**Estado**: 📝 PLANIFICACIÓN  
**Próximo paso**: Crear modelos y servicio base

¿Procedemos con la implementación?
