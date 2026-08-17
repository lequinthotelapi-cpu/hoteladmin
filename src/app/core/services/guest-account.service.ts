import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { Functions, httpsCallable } from '@angular/fire/functions';
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
  constructor(
    private repository: FirebaseGuestAccountRepository,
    private functions: Functions
  ) {}

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

  // SPEC-09: delega en la Cloud Function agregarCargoCuenta (transaccional,
  // evita perder cargos concurrentes). Cubre también el camino POS "cargar a
  // habitación" (pos.component.ts), que llama a este mismo método. userId ya
  // no se usa pero se mantiene en la firma.
  async addCharge(accountId: string, dto: CreateChargeDto, _userId: string): Promise<void> {
    const agregarCargoCuentaFn = httpsCallable(this.functions, 'agregarCargoCuenta');
    try {
      await agregarCargoCuentaFn({
        accountId,
        tipo: dto.type,
        descripcion: dto.description,
        monto: dto.amount,
        cantidad: dto.quantity,
        referencia: dto.reference
      });
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo agregar el cargo');
    }
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

  // SPEC-09: delega en la Cloud Function agregarPagoCuenta (transaccional).
  async addPayment(accountId: string, dto: CreatePaymentDto, _userId: string): Promise<void> {
    const agregarPagoCuentaFn = httpsCallable(this.functions, 'agregarPagoCuenta');
    try {
      await agregarPagoCuentaFn({
        accountId,
        monto: dto.amount,
        metodoPago: dto.method,
        referencia: dto.reference,
        notas: dto.notes
      });
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo agregar el pago');
    }
  }

  // SPEC-09: delega en la Cloud Function cerrarCuenta.
  async closeAccount(accountId: string, _userId: string): Promise<void> {
    const cerrarCuentaFn = httpsCallable(this.functions, 'cerrarCuenta');
    try {
      await cerrarCuentaFn({ accountId });
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo cerrar la cuenta');
    }
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
