export interface InventoryMovement {
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

export interface CreateInventoryMovementData {
  productId: string;
  type: 'entry' | 'exit' | 'adjustment';
  reason: string;
  quantity: number;
  unitCost?: number;
  supplierId?: string;
  invoiceNumber?: string;
  notes?: string;
  createdBy: string;
}

export interface UpdateInventoryMovementData {
  notes?: string;
}
