import { Timestamp } from '@angular/fire/firestore';

export interface SaleItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  guestId?: string;
  guestName?: string;
  roomNumber?: string;
  cashRegisterId?: string;
  createdAt: Timestamp;
  createdBy: string;
  createdByName: string;
}

export interface CreateSaleData {
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  guestId?: string;
  guestName?: string;
  roomNumber?: string;
  createdBy: string;
  createdByName: string;
}
