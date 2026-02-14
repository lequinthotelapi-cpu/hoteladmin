import { Injectable } from '@angular/core';
import { Observable, firstValueFrom, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { DashboardMetrics, RevenueBySource, RevenueByDay } from '../../domain/models/financial-report.model';
import { GuestAccountService } from './guest-account.service';
import { RoomService } from './room.service';
import { BookingService } from './booking.service';
import { CashRegisterService } from './cash-register.service';
import { POSService } from './pos.service';

@Injectable({
  providedIn: 'root'
})
export class FinancialReportsService {

  constructor(
    private guestAccountService: GuestAccountService,
    private roomService: RoomService,
    private bookingService: BookingService,
    private cashRegisterService: CashRegisterService,
    private posService: POSService
  ) {}

  async getDashboardMetrics(startDate: Date, endDate: Date): Promise<DashboardMetrics> {
    const [revenue, occupancy, revPAR, adr, receivables, cashByMethod] = await Promise.all([
      this.calculateTotalRevenue(startDate, endDate),
      this.calculateOccupancy(startDate, endDate),
      this.calculateRevPAR(startDate, endDate),
      this.calculateADR(startDate, endDate),
      this.getAccountsReceivable(),
      this.getCashByPaymentMethod()
    ]);

    return {
      totalRevenue: revenue,
      occupancyRate: occupancy,
      revPAR,
      adr,
      accountsReceivable: receivables,
      cashInHand: cashByMethod.total,
      cashByMethod: cashByMethod.breakdown
    };
  }

  async getRevenueBySource(startDate: Date, endDate: Date): Promise<RevenueBySource[]> {
    const accounts = await firstValueFrom(
      this.guestAccountService.getAll().pipe(
        map(accounts => accounts.filter(a =>
          a.status === 'closed' &&
          a.closedAt &&
          new Date(a.closedAt) >= startDate &&
          new Date(a.closedAt) <= endDate
        ))
      )
    );

    let accommodation = 0;
    let services = 0;
    let other = 0;

    accounts.forEach(account => {
      account.charges?.forEach(charge => {
        if (charge.type === 'accommodation') {
          accommodation += charge.amount;
        } else if (charge.type === 'service') {
          services += charge.amount;
        } else {
          other += charge.amount;
        }
      });
    });

    const sales = await firstValueFrom(
      this.posService.getByDateRange(startDate, endDate)
    );
    const posDirect = sales.reduce((sum, s) => sum + s.total, 0);

    return [
      { name: 'Alojamiento', value: accommodation },
      { name: 'Servicios', value: services },
      { name: 'POS Directo', value: posDirect },
      { name: 'Otros', value: other }
    ].filter(item => item.value > 0);
  }

  async getRevenueByDay(startDate: Date, endDate: Date): Promise<RevenueByDay[]> {
    const accounts = await firstValueFrom(
      this.guestAccountService.getAll().pipe(
        map(accounts => accounts.filter(a =>
          a.status === 'closed' &&
          a.closedAt &&
          new Date(a.closedAt) >= startDate &&
          new Date(a.closedAt) <= endDate
        ))
      )
    );

    const sales = await firstValueFrom(
      this.posService.getByDateRange(startDate, endDate)
    );

    const revenueMap = new Map<string, number>();

    accounts.forEach(account => {
      if (account.closedAt) {
        const dateKey = new Date(account.closedAt).toISOString().split('T')[0];
        const current = revenueMap.get(dateKey) || 0;
        revenueMap.set(dateKey, current + account.total);
      }
    });

    sales.forEach(sale => {
      const createdAt = sale.createdAt instanceof Date ? sale.createdAt : (sale.createdAt as any).toDate();
      const dateKey = createdAt.toISOString().split('T')[0];
      const current = revenueMap.get(dateKey) || 0;
      revenueMap.set(dateKey, current + sale.total);
    });

    return Array.from(revenueMap.entries())
      .map(([date, value]) => ({ name: date, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async calculateTotalRevenue(startDate: Date, endDate: Date): Promise<number> {
    const accounts = await firstValueFrom(
      this.guestAccountService.getAll().pipe(
        map(accounts => accounts.filter(a =>
          a.status === 'closed' &&
          a.closedAt &&
          new Date(a.closedAt) >= startDate &&
          new Date(a.closedAt) <= endDate
        ))
      )
    );

    const guestAccountsRevenue = accounts.reduce((sum, a) => sum + a.total, 0);

    const sales = await firstValueFrom(
      this.posService.getByDateRange(startDate, endDate)
    );

    const posRevenue = sales.reduce((sum, s) => sum + s.total, 0);

    return guestAccountsRevenue + posRevenue;
  }

  private async calculateOccupancy(startDate: Date, endDate: Date): Promise<number> {
    const rooms = await firstValueFrom(
      this.roomService.getAll().pipe(
        map(rooms => rooms.filter(r => r.isActive))
      )
    );
    const totalRooms = rooms.length;

    if (totalRooms === 0) return 0;

    const bookings = await firstValueFrom(
      this.bookingService.getAllBookings().pipe(
        map((bookings: any[]) => bookings.filter(b =>
          (b.status === 'checked-in' || b.status === 'checked-out') &&
          this.isBookingInPeriod(b, startDate, endDate)
        ))
      )
    );

    const nightsSold = bookings.reduce((sum: number, b: any) => {
      const nights = this.calculateNights(
        new Date(b.checkInDate),
        new Date(b.checkOutDate),
        startDate,
        endDate
      );
      return sum + nights;
    }, 0);

    const days = this.getDaysBetween(startDate, endDate);
    const nightsAvailable = totalRooms * days;

    return nightsAvailable > 0 ? (nightsSold / nightsAvailable) * 100 : 0;
  }

  private async calculateRevPAR(startDate: Date, endDate: Date): Promise<number> {
    const revenue = await this.calculateTotalRevenue(startDate, endDate);
    const rooms = await firstValueFrom(
      this.roomService.getAll().pipe(
        map(rooms => rooms.filter(r => r.isActive))
      )
    );
    const days = this.getDaysBetween(startDate, endDate);

    return rooms.length > 0 && days > 0 ? revenue / (rooms.length * days) : 0;
  }

  private async calculateADR(startDate: Date, endDate: Date): Promise<number> {
    const revenue = await this.calculateTotalRevenue(startDate, endDate);
    const bookings = await firstValueFrom(
      this.bookingService.getAllBookings().pipe(
        map((bookings: any[]) => bookings.filter(b =>
          (b.status === 'checked-in' || b.status === 'checked-out') &&
          this.isBookingInPeriod(b, startDate, endDate)
        ))
      )
    );

    const nightsSold = bookings.reduce((sum: number, b: any) => {
      return sum + this.calculateNights(
        new Date(b.checkInDate),
        new Date(b.checkOutDate),
        startDate,
        endDate
      );
    }, 0);

    return nightsSold > 0 ? revenue / nightsSold : 0;
  }

  private async getAccountsReceivable(): Promise<number> {
    const openAccounts = await firstValueFrom(
      this.guestAccountService.getAll().pipe(
        map(accounts => accounts.filter(a => a.status === 'open'))
      )
    );

    return openAccounts.reduce((sum, a) => sum + a.balance, 0);
  }

  private async getCashByPaymentMethod(): Promise<{ total: number; breakdown: { method: string; amount: number }[] }> {
    const openRegisters = await firstValueFrom(
      this.cashRegisterService.getAll().pipe(
        map(registers => registers.filter(r => r.status === 'open'))
      )
    );

    if (openRegisters.length === 0) {
      return { total: 0, breakdown: [] };
    }

    // Obtener todas las transacciones de las cajas abiertas
    const transactionsPromises = openRegisters.map(register =>
      firstValueFrom(this.cashRegisterService.getTransactions(register.id))
    );

    const transactionsArrays = await Promise.all(transactionsPromises);
    const allTransactions = transactionsArrays.reduce((acc, curr) => acc.concat(curr), []);

    // Agrupar por método de pago
    const methodMap = new Map<string, number>();

    // Inicializar con el monto inicial de cada caja
    openRegisters.forEach(register => {
      const current = methodMap.get('cash') || 0;
      methodMap.set('cash', current + register.initialAmount);
    });

    // Procesar transacciones
    allTransactions.forEach(transaction => {
      const method = transaction.paymentMethod || 'cash';
      const current = methodMap.get(method) || 0;

      if (transaction.type === 'sale' || transaction.type === 'payment' || transaction.type === 'deposit') {
        methodMap.set(method, current + transaction.amount);
      } else if (transaction.type === 'expense' || transaction.type === 'withdrawal' || transaction.type === 'refund') {
        methodMap.set(method, current - transaction.amount);
      }
    });

    const breakdown = Array.from(methodMap.entries())
      .map(([method, amount]) => ({ method, amount }))
      .filter(item => item.amount > 0);

    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

    return { total, breakdown };
  }

  private isBookingInPeriod(booking: any, startDate: Date, endDate: Date): boolean {
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    return checkIn <= endDate && checkOut >= startDate;
  }

  private calculateNights(checkIn: Date, checkOut: Date, periodStart: Date, periodEnd: Date): number {
    const start = checkIn > periodStart ? checkIn : periodStart;
    const end = checkOut < periodEnd ? checkOut : periodEnd;
    
    if (start >= end) return 0;
    
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getDaysBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}
