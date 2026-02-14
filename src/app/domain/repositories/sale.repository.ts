import { Observable } from 'rxjs';
import { Sale } from '../models/sale.model';
import { BaseRepository } from './base.repository';

export abstract class SaleRepository extends BaseRepository<Sale> {
  abstract getByCashRegister(cashRegisterId: string): Observable<Sale[]>;
  abstract getByDateRange(startDate: Date, endDate: Date): Observable<Sale[]>;
}
