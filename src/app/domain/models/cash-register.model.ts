import { Timestamp } from '@angular/fire/firestore';

export type CashRegisterStatus = 'open' | 'closed';

export interface CashRegister {
  id: string;
  userId: string;
  userName: string;
  openedAt: Timestamp;
  initialAmount: number;
  status: CashRegisterStatus;
  
  // Calculados durante el turno
  salesTotal: number;
  paymentsTotal: number;
  expensesTotal: number;
  withdrawalsTotal: number;
  depositsTotal: number;
  expectedAmount: number;
  
  // Al cerrar
  closedAt?: Timestamp;
  finalAmount?: number;
  difference?: number;
  notes?: string;
  closedBy?: string;
}

export interface CreateCashRegisterData {
  userId: string;
  userName: string;
  initialAmount: number;
}

export interface CloseCashRegisterData {
  finalAmount: number;
  notes?: string;
  closedBy: string;
}
