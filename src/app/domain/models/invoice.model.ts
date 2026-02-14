export type InvoiceStatus = 'active' | 'cancelled';
export type InvoiceType = 'guest_account' | 'pos';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  type: InvoiceType;
  referenceId: string;
  
  // Datos fiscales del cliente
  clientName: string;
  clientTaxId: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  
  // Detalle financiero
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  
  // Metadata
  status: InvoiceStatus;
  issuedAt: Date;
  issuedBy: string;
  issuedByName: string;
  
  // Cancelación
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelReason?: string;
  
  // PDF (futuro)
  pdfUrl?: string;
  
  // Notas
  notes?: string;
}

export interface CreateInvoiceDto {
  type: InvoiceType;
  referenceId: string;
  clientName: string;
  clientTaxId: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}
