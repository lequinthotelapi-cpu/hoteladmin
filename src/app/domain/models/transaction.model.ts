import { Timestamp } from '@angular/fire/firestore';

export type TransactionType = 'sale' | 'payment' | 'expense' | 'withdrawal' | 'deposit' | 'refund';

export interface Transaction {
  id: string;
  cashRegisterId: string;
  type: TransactionType;
  amount: number;
  paymentMethod: string;
  category?: string; // Para gastos: utilities, maintenance, etc.
  description: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  reference?: string;
  createdAt: Timestamp;
  createdBy: string;
  createdByName: string;
}

export interface CreateTransactionData {
  cashRegisterId: string;
  type: TransactionType;
  amount: number;
  paymentMethod: string;
  category?: string;
  description: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  reference?: string;
  createdBy: string;
  createdByName: string;
}
