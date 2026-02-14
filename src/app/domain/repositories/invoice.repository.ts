import { Observable } from 'rxjs';
import { Invoice } from '../models/invoice.model';

export interface InvoiceRepository {
  getAll(): Observable<Invoice[]>;
  getById(id: string): Observable<Invoice | null>;
  getByInvoiceNumber(invoiceNumber: string): Observable<Invoice | null>;
  getByReference(referenceId: string): Observable<Invoice | null>;
  getByDateRange(startDate: Date, endDate: Date): Observable<Invoice[]>;
  getByStatus(status: 'active' | 'cancelled'): Observable<Invoice[]>;
  create(invoice: Invoice): Promise<string>;
  update(id: string, data: Partial<Invoice>): Promise<void>;
  delete(id: string): Promise<void>;
}
