import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { FirebaseGuestAccountRepository } from '../repositories/guest-account-firebase.repository';
import { 
  GuestAccount, 
  GuestAccountStatus,
  Charge,
  Payment,
  CreateChargeDto,
  CreatePaymentDto
} from '../../domain/models/guest-account.model';
import { Booking } from '../../domain/models/booking.model';

@Injectable({
  providedIn: 'root'
})
export class GuestAccountService {
  constructor(private repository: FirebaseGuestAccountRepository) {}

  getAll(): Observable<GuestAccount[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<GuestAccount> {
    return this.repository.getById(id);
  }

  getByBooking(bookingId: string): Observable<GuestAccount | null> {
    return this.repository.getByBooking(bookingId);
  }

  getByStatus(status: GuestAccountStatus): Observable<GuestAccount[]> {
    return this.repository.getByStatus(status);
  }

  getOpenAccounts(): Observable<GuestAccount[]> {
    return this.repository.getByStatus('open');
  }

  async createAccountFromBooking(booking: Booking, userId: string): Promise<string> {
    // Calcular cargo de alojamiento
    const nights = this.calculateNights(booking.checkInDate, booking.checkOutDate);
    const pricePerNight = booking.basePrice;
    const accommodationSubtotal = pricePerNight * nights;
    
    const accommodationCharge: Charge = {
      accountId: '',
      type: 'accommodation',
      description: `Alojamiento - ${nights} noche(s)`,
      amount: pricePerNight,
      quantity: nights,
      total: accommodationSubtotal,
      date: new Date(),
      createdBy: userId,
      createdAt: new Date()
    };

    // Calcular totales con IVA
    const subtotal = accommodationSubtotal;
    const tax = subtotal * 0.13; // 13% IVA
    const total = subtotal + tax;

    const account: GuestAccount = {
      bookingId: booking.id!,
      bookingNumber: booking.bookingNumber,
      guestId: booking.guestId,
      guestName: booking.guestName,
      roomId: booking.roomId,
      roomNumber: booking.roomNumber,
      status: 'open',
      checkInDate: booking.checkInDate,
      charges: [accommodationCharge],
      payments: [],
      subtotal: subtotal,
      tax: tax,
      total: total,
      paid: 0,
      balance: total,
      createdAt: new Date(),
      createdBy: userId
    };

    return await this.repository.create(account);
  }

  async addCharge(accountId: string, dto: CreateChargeDto, userId: string): Promise<void> {
    const account = await firstValueFrom(this.repository.getById(accountId));

    if (account.status !== 'open') {
      throw new Error('No se pueden agregar cargos a una cuenta cerrada');
    }

    const charge: Charge = {
      accountId,
      type: dto.type,
      description: dto.description,
      amount: dto.amount,
      quantity: dto.quantity,
      total: dto.amount * dto.quantity,
      date: new Date(),
      createdBy: userId,
      createdAt: new Date()
    };

    // Solo agregar reference si existe
    if (dto.reference) {
      charge.reference = dto.reference;
    }

    const updatedCharges = [...account.charges, charge];
    const totals = this.calculateTotals(updatedCharges, account.payments);

    await this.repository.update(accountId, {
      charges: updatedCharges,
      ...totals,
      updatedBy: userId
    });
  }

  async removeCharge(accountId: string, chargeId: string, userId: string): Promise<void> {
    const account = await firstValueFrom(this.repository.getById(accountId));

    if (account.status !== 'open') {
      throw new Error('No se pueden eliminar cargos de una cuenta cerrada');
    }

    const updatedCharges = account.charges.filter(c => c.id !== chargeId);
    const totals = this.calculateTotals(updatedCharges, account.payments);

    await this.repository.update(accountId, {
      charges: updatedCharges,
      ...totals,
      updatedBy: userId
    });
  }

  async addPayment(accountId: string, dto: CreatePaymentDto, userId: string): Promise<void> {
    const account = await firstValueFrom(this.repository.getById(accountId));

    if (account.status !== 'open') {
      throw new Error('No se pueden agregar pagos a una cuenta cerrada');
    }

    if (dto.amount > account.balance) {
      throw new Error('El monto del pago excede el saldo pendiente');
    }

    const payment: Payment = {
      accountId,
      method: dto.method,
      amount: dto.amount,
      date: new Date(),
      createdBy: userId,
      createdAt: new Date()
    };

    // Solo agregar campos opcionales si existen
    if (dto.reference) {
      payment.reference = dto.reference;
    }
    if (dto.notes) {
      payment.notes = dto.notes;
    }

    const updatedPayments = [...account.payments, payment];
    const totals = this.calculateTotals(account.charges, updatedPayments);

    await this.repository.update(accountId, {
      payments: updatedPayments,
      ...totals,
      updatedBy: userId
    });
  }

  async closeAccount(accountId: string, userId: string): Promise<void> {
    const account = await firstValueFrom(this.repository.getById(accountId));

    if (account.status === 'closed') {
      throw new Error('La cuenta ya está cerrada');
    }

    if (account.balance > 0) {
      throw new Error('No se puede cerrar una cuenta con saldo pendiente');
    }

    await this.repository.update(accountId, {
      status: 'closed',
      checkOutDate: new Date(),
      closedAt: new Date(),
      closedBy: userId,
      updatedBy: userId
    });
  }

  private calculateTotals(charges: Charge[], payments: Payment[]) {
    const subtotal = charges.reduce((sum, c) => sum + c.total, 0);
    const tax = subtotal * 0.13; // 13% IVA
    const total = subtotal + tax;
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = total - paid;

    return { subtotal, tax, total, paid, balance };
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}
