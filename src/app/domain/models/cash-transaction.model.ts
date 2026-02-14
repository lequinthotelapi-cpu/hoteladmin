import { Timestamp } from '@angular/fire/firestore';

export type CashTransactionType = 'sale' | 'payment' | 'expense' | 'withdrawal' | 'deposit';

export interface CashTransaction {
  id: string;
  cashRegisterId: string;
  type: CashTransactionType;
  amount: number;
  paymentMethod: string;
  description: string;
  reference?: string;
  createdAt: Timestamp;
  createdBy: string;
  createdByName: string;
}

export interface CreateCashTransactionData {
  cashRegisterId: string;
  type: CashTransactionType;
  amount: number;
  paymentMethod: string;
  description: string;
  reference?: string;
  createdBy: string;
  createdByName: string;
}
