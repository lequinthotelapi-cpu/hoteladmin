export interface Expense {
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

export interface CreateExpenseData {
  category: string;
  description: string;
  amount: number;
  date: Date;
  paymentMethod: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateExpenseData {
  category?: string;
  description?: string;
  amount?: number;
  date?: Date;
  paymentMethod?: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  notes?: string;
  updatedBy: string;
}
