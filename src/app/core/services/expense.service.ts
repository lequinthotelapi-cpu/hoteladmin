import { Injectable, Injector } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ExpenseRepository } from '../repositories/expense.repository';
import { Expense, CreateExpenseData, UpdateExpenseData } from '../../domain/models/expense.model';
import { CashRegisterService } from './cash-register.service';
import { AuthService } from './auth.service';

@Injectable()
export class ExpenseService {
  constructor(
    private expenseRepository: ExpenseRepository,
    private cashRegisterService: CashRegisterService,
    private authService: AuthService,
    private injector: Injector
  ) {}

  getAll(): Observable<Expense[]> {
    return this.expenseRepository.getAll();
  }

  getById(id: string): Observable<Expense | null> {
    return this.expenseRepository.getById(id);
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<Expense[]> {
    return this.expenseRepository.getByDateRange(startDate, endDate);
  }

  async create(data: CreateExpenseData): Promise<string> {
    this.validateAmount(data.amount);

    // Verificar si hay caja abierta
    const openCashRegister = await this.cashRegisterService.getOpenCashRegister(data.createdBy);
    
    if (!openCashRegister) {
      throw new Error('Debes tener una caja abierta para registrar gastos');
    }

    const user = await this.authService.getUserData(data.createdBy);
    const userName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';

    // Crear transacción directamente (ya no se crea gasto separado)
    const transactionId = await this.cashRegisterService.addTransaction({
      cashRegisterId: openCashRegister.id,
      type: 'expense',
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      category: data.category,
      description: data.description,
      invoiceNumber: data.invoiceNumber,
      receiptUrl: data.receiptUrl,
      createdBy: data.createdBy,
      createdByName: userName
    });

    console.log('Gasto registrado como transacción:', transactionId);
    return transactionId || '';
  }

  async update(id: string, data: UpdateExpenseData): Promise<void> {
    if (data.amount !== undefined) {
      this.validateAmount(data.amount);
    }
    return this.expenseRepository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    // Buscar transacción de caja relacionada
    try {
      const { FirebaseCashTransactionRepository } = await import('../../infrastructure/repositories/cash-transaction-firebase.repository');
      const cashTransactionRepo = this.injector.get(FirebaseCashTransactionRepository);
      const allTransactions = await firstValueFrom(cashTransactionRepo.getAll());
      const relatedTransaction = allTransactions.find(t => t.reference === id && t.type === 'expense');
      
      if (relatedTransaction) {
        await cashTransactionRepo.delete(relatedTransaction.id);
        console.log('Transacción de caja relacionada eliminada:', relatedTransaction.id);
      }
    } catch (error) {
      console.warn('No se pudo eliminar la transacción de caja relacionada:', error);
    }

    // Eliminar el gasto
    return this.expenseRepository.delete(id);
  }

  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }
  }
}
