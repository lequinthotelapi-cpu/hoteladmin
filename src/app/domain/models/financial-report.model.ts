export interface DashboardMetrics {
  totalRevenue: number;
  occupancyRate: number;
  revPAR: number;
  adr: number;
  accountsReceivable: number;
  cashInHand: number;
  cashByMethod?: { method: string; amount: number }[];
  
  // Comparación con período anterior
  revenueChange?: number;
  occupancyChange?: number;
}

export interface RevenueReport {
  totalRevenue: number;
  accommodation: number;
  posToRoom: number;
  posDirect: number;
  other: number;
  expenses: number;
  netIncome: number;
}

export interface RevenueBySource {
  name: string;
  value: number;
}

export interface RevenueByDay {
  name: string;
  value: number;
}

export interface OccupancyReport {
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  nightsSold: number;
  nightsAvailable: number;
}

export interface AccountReceivable {
  roomNumber: string;
  guestName: string;
  balance: number;
  daysOpen: number;
}

export interface CashFlowReport {
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

export interface TopProduct {
  productName: string;
  quantitySold: number;
  revenue: number;
  percentage: number;
}
