import { Observable } from 'rxjs';
import { Expense, CreateExpenseData, UpdateExpenseData } from '../../domain/models/expense.model';

export abstract class ExpenseRepository {
  abstract getAll(): Observable<Expense[]>;
  abstract getById(id: string): Observable<Expense | null>;
  abstract getByDateRange(startDate: Date, endDate: Date): Observable<Expense[]>;
  abstract create(data: CreateExpenseData): Promise<string>;
  abstract update(id: string, data: UpdateExpenseData): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
