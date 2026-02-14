import { Observable } from 'rxjs';
import { CashTransaction } from '../models/cash-transaction.model';
import { BaseRepository } from './base.repository';

export abstract class CashTransactionRepository extends BaseRepository<CashTransaction> {
  abstract getByCashRegister(cashRegisterId: string): Observable<CashTransaction[]>;
}
