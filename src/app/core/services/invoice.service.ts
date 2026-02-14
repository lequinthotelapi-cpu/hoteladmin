import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { FirebaseInvoiceRepository } from '../../infrastructure/repositories/invoice-firebase.repository';
import { Invoice, CreateInvoiceDto, InvoiceItem } from '../../domain/models/invoice.model';
import { GuestAccountService } from './guest-account.service';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  constructor(
    private repository: FirebaseInvoiceRepository,
    private guestAccountService: GuestAccountService
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

  async createInvoiceFromGuestAccount(
    accountId: string,
    clientData: {
      clientName: string;
      clientTaxId: string;
      clientAddress?: string;
      clientEmail?: string;
      clientPhone?: string;
    },
    userId: string,
    userName: string
  ): Promise<string> {
    const account = await firstValueFrom(this.guestAccountService.getById(accountId));
    
    if (!account) {
      throw new Error('Cuenta de huésped no encontrada');
    }

    if (account.status !== 'closed') {
      throw new Error('Solo se pueden facturar cuentas cerradas');
    }

    if (account.balance !== 0) {
      throw new Error('La cuenta debe tener balance cero para facturar');
    }

    // Convertir cargos a items de factura
    const items: InvoiceItem[] = account.charges.map(charge => ({
      description: charge.description,
      quantity: charge.quantity,
      unitPrice: charge.amount,
      subtotal: charge.total
    }));

    const dto: CreateInvoiceDto = {
      type: 'guest_account',
      referenceId: accountId,
      clientName: clientData.clientName,
      clientTaxId: clientData.clientTaxId,
      clientAddress: clientData.clientAddress,
      clientEmail: clientData.clientEmail,
      clientPhone: clientData.clientPhone,
      items,
      subtotal: account.subtotal,
      tax: account.tax,
      total: account.total
    };

    return await this.createInvoice(dto, userId, userName);
  }

  async cancelInvoice(id: string, reason: string, userId: string): Promise<void> {
    const invoice = await firstValueFrom(this.repository.getById(id));
    
    if (!invoice) {
      throw new Error('Factura no encontrada');
    }

    if (invoice.status === 'cancelled') {
      throw new Error('La factura ya está cancelada');
    }

    await this.repository.update(id, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancelReason: reason
    });
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
