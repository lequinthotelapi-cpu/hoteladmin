import { Observable } from 'rxjs';
import { CashRegister, CreateCashRegisterData, CloseCashRegisterData } from '../models/cash-register.model';
import { BaseRepository } from './base.repository';

export abstract class CashRegisterRepository extends BaseRepository<CashRegister> {
  abstract getOpenCashRegisterByUser(userId: string): Promise<CashRegister | null>;
  abstract getByUser(userId: string): Observable<CashRegister[]>;
  abstract closeCashRegister(id: string, data: CloseCashRegisterData): Promise<void>;
  abstract updateTotals(id: string, totals: Partial<CashRegister>): Promise<void>;
}
