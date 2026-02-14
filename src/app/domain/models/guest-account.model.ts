export type GuestAccountStatus = 'open' | 'closed';
export type ChargeType = 'accommodation' | 'pos' | 'service' | 'minibar' | 'laundry' | 'spa' | 'restaurant' | 'other';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'deposit';

export interface Charge {
  id?: string;
  accountId: string;
  type: ChargeType;
  description: string;
  amount: number;
  quantity: number;
  total: number;
  date: Date;
  reference?: string;
  createdBy: string;
  createdAt: Date;
}

export interface Payment {
  id?: string;
  accountId: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
  notes?: string;
  date: Date;
  createdBy: string;
  createdAt: Date;
}

export interface GuestAccount {
  id?: string;
  bookingId: string;
  bookingNumber: string;
  guestId: string;
  guestName: string;
  roomId: string;
  roomNumber: string;
  status: GuestAccountStatus;
  checkInDate: Date;
  checkOutDate?: Date;
  charges: Charge[];
  payments: Payment[];
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
  closedAt?: Date;
  closedBy?: string;
}

export interface CreateChargeDto {
  type: ChargeType;
  description: string;
  amount: number;
  quantity: number;
  reference?: string;
}

export interface CreatePaymentDto {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  notes?: string;
}
