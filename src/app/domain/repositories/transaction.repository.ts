import { Observable } from 'rxjs';
import { Transaction } from '../models/transaction.model';

export abstract class TransactionRepository {
  abstract getAll(): Observable<Transaction[]>;
  abstract getById(id: string): Observable<Transaction | null>;
  abstract getByCashRegister(cashRegisterId: string): Observable<Transaction[]>;
  abstract getByDateRange(startDate: Date, endDate: Date): Observable<Transaction[]>;
  abstract create(data: any): Promise<string>;
  abstract update(id: string, data: Partial<Transaction>): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
