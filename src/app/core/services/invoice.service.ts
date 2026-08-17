import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { FirebaseInvoiceRepository } from '../../infrastructure/repositories/invoice-firebase.repository';
import { Invoice, CreateInvoiceDto } from '../../domain/models/invoice.model';
import { GuestAccountService } from './guest-account.service';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  constructor(
    private repository: FirebaseInvoiceRepository,
    private guestAccountService: GuestAccountService,
    private functions: Functions
  ) {}

  getAll(): Observable<Invoice[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<Invoice | null> {
    return this.repository.getById(id);
  }

  getByInvoiceNumber(invoiceNumber: string): Observable<Invoice | null> {
    return this.repository.getByInvoiceNumber(invoiceNumber);
  }

  getByReference(referenceId: string): Observable<Invoice | null> {
    return this.repository.getByReference(referenceId);
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<Invoice[]> {
    return this.repository.getByDateRange(startDate, endDate);
  }

  getActiveInvoices(): Observable<Invoice[]> {
    return this.repository.getByStatus('active');
  }

  async createInvoice(dto: CreateInvoiceDto, userId: string, userName: string): Promise<string> {
    // Validar que no exista factura para esta referencia
    const existing = await firstValueFrom(this.repository.getByReference(dto.referenceId));
    if (existing) {
      throw new Error('Ya existe una factura para esta referencia');
    }

    // Generar número de factura
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice: Invoice = {
      invoiceNumber,
      type: dto.type,
      referenceId: dto.referenceId,
      clientName: dto.clientName,
      clientTaxId: dto.clientTaxId,
      items: dto.items,
      subtotal: dto.subtotal,
      tax: dto.tax,
      total: dto.total,
      status: 'active',
      issuedAt: new Date(),
      issuedBy: userId,
      issuedByName: userName
    };

    // Agregar campos opcionales solo si existen
    if (dto.clientAddress) invoice.clientAddress = dto.clientAddress;
    if (dto.clientEmail) invoice.clientEmail = dto.clientEmail;
    if (dto.clientPhone) invoice.clientPhone = dto.clientPhone;
    if (dto.notes) invoice.notes = dto.notes;

    return await this.repository.create(invoice);
  }

  // SPEC-10: delega en la Cloud Function emitirFactura (transaccional, usa el
  // contador atómico de SPEC-02 para invoiceNumber). Solo soporta cuentas de
  // huésped hoy — no existe ningún flujo real de facturación POS en la UI
  // actual, así que no se inventó esa lógica (ver facturacion.ts).
  async createInvoiceFromGuestAccount(
    accountId: string,
    clientData: {
      clientName: string;
      clientTaxId: string;
      clientAddress?: string;
      clientEmail?: string;
      clientPhone?: string;
    },
    _userId: string,
    _userName: string
  ): Promise<string> {
    const emitirFacturaFn = httpsCallable(this.functions, 'emitirFactura');
    try {
      const response: any = await emitirFacturaFn({
        referenceId: accountId,
        tipo: 'guest_account',
        ...clientData
      });
      return response.data.invoiceId;
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo generar la factura');
    }
  }

  // SPEC-10: delega en la Cloud Function cancelarFactura.
  async cancelInvoice(id: string, reason: string, _userId: string): Promise<void> {
    const cancelarFacturaFn = httpsCallable(this.functions, 'cancelarFactura');
    try {
      await cancelarFacturaFn({ invoiceId: id, motivo: reason });
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo cancelar la factura');
    }
  }

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Obtener todas las facturas del mes actual
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);
    
    const invoices = await firstValueFrom(
      this.repository.getByDateRange(startOfMonth, endOfMonth)
    );

    const sequence = invoices.length + 1;
    const sequenceStr = String(sequence).padStart(4, '0');
    
    return `FAC-${year}${month}-${sequenceStr}`;
  }
}
