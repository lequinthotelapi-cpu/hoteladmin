import { Injectable, Injector } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { CashRegister, CreateCashRegisterData, CloseCashRegisterData } from '../../domain/models/cash-register.model';
import { CreateTransactionData } from '../../domain/models/transaction.model';
import { CashRegisterRepository } from '../../domain/repositories/cash-register.repository';
import { FirebaseCashRegisterRepository } from '../../infrastructure/repositories/cash-register-firebase.repository';
import { TransactionService } from './transaction.service';

@Injectable({
  providedIn: 'root'
})
export class CashRegisterService {
  
  constructor(
    private cashRegisterRepo: FirebaseCashRegisterRepository,
    private transactionService: TransactionService,
    private injector: Injector
  ) {}

  async openCashRegister(data: CreateCashRegisterData): Promise<CashRegister> {
    // Validar que no haya caja abierta
    const existingOpen = await this.cashRegisterRepo.getOpenCashRegisterByUser(data.userId);
    if (existingOpen) {
      throw new Error('Ya tienes una caja abierta. Ciérrala antes de abrir una nueva.');
    }

    // Validar monto inicial
    if (data.initialAmount < 0) {
      throw new Error('El monto inicial no puede ser negativo');
    }

    const cashRegister: any = {
      userId: data.userId,
      userName: data.userName,
      openedAt: Timestamp.now(),
      initialAmount: data.initialAmount,
      status: 'open',
      salesTotal: 0,
      paymentsTotal: 0,
      expensesTotal: 0,
      withdrawalsTotal: 0,
      depositsTotal: 0,
      expectedAmount: data.initialAmount
    };

    const id = await this.cashRegisterRepo.create(cashRegister);
    return { ...cashRegister, id } as CashRegister;
  }

  async closeCashRegister(id: string, data: CloseCashRegisterData): Promise<void> {
    const cashRegister = await firstValueFrom(this.cashRegisterRepo.getById(id));
    
    if (!cashRegister) {
      throw new Error('Caja no encontrada');
    }

    if (cashRegister.status === 'closed') {
      throw new Error('Esta caja ya está cerrada');
    }

    // Calcular diferencia
    const difference = data.finalAmount - cashRegister.expectedAmount;

    await this.cashRegisterRepo.closeCashRegister(id, data);
    await this.cashRegisterRepo.update(id, { difference } as Partial<CashRegister>);
  }

  async addTransaction(data: CreateTransactionData): Promise<string> {
    console.log('CashRegisterService.addTransaction - Inicio:', data);
    const id = await this.transactionService.createTransaction(data);
    console.log('CashRegisterService.addTransaction - Completado');
    return id;
  }

  async getOpenCashRegister(userId: string): Promise<CashRegister | null> {
    return await this.cashRegisterRepo.getOpenCashRegisterByUser(userId);
  }

  getUserCashRegisters(userId: string): Observable<CashRegister[]> {
    return this.cashRegisterRepo.getByUser(userId);
  }

  getAll(): Observable<CashRegister[]> {
    return this.cashRegisterRepo.getAll();
  }

  getById(id: string): Observable<CashRegister | null> {
    return this.cashRegisterRepo.getById(id);
  }

  getTransactions(cashRegisterId: string): Observable<any[]> {
    return this.transactionService.getTransactionsByCashRegister(cashRegisterId);
  }

  async calculateTotalsFromTransactions(cashRegisterId: string): Promise<Partial<CashRegister>> {
    const transactions = await firstValueFrom(this.transactionService.getTransactionsByCashRegister(cashRegisterId));
    
    const totals = {
      salesTotal: 0,
      paymentsTotal: 0,
      depositsTotal: 0,
      expensesTotal: 0,
      withdrawalsTotal: 0
    };

    if (transactions && transactions.length > 0) {
      transactions.forEach(t => {
        switch (t.type) {
          case 'sale':
            totals.salesTotal += t.amount;
            break;
          case 'payment':
            totals.paymentsTotal += t.amount;
            break;
          case 'deposit':
            totals.depositsTotal += t.amount;
            break;
          case 'expense':
            totals.expensesTotal += t.amount;
            break;
          case 'withdrawal':
            totals.withdrawalsTotal += t.amount;
            break;
        }
      });
    }

    console.log('Totales calculados:', totals, 'desde', transactions?.length || 0, 'transacciones');
    return totals;
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    await this.transactionService.deleteTransaction(transactionId);
  }
}
