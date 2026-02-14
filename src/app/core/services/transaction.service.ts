import { Injectable } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Transaction, CreateTransactionData } from '../../domain/models/transaction.model';
import { FirebaseTransactionRepository } from '../../infrastructure/repositories/transaction-firebase.repository';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  
  constructor(private transactionRepo: FirebaseTransactionRepository) {}

  async createTransaction(data: CreateTransactionData): Promise<string> {
    if (data.amount <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    const transaction: any = {
      cashRegisterId: data.cashRegisterId,
      type: data.type,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      description: data.description,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: Timestamp.now()
    };

    // Solo agregar campos opcionales si tienen valor
    if (data.category) transaction.category = data.category;
    if (data.invoiceNumber) transaction.invoiceNumber = data.invoiceNumber;
    if (data.receiptUrl) transaction.receiptUrl = data.receiptUrl;
    if (data.reference) transaction.reference = data.reference;

    return await this.transactionRepo.create(transaction);
  }

  getTransactionsByCashRegister(cashRegisterId: string): Observable<Transaction[]> {
    return this.transactionRepo.getByCashRegister(cashRegisterId);
  }

  getTransactionsByDateRange(startDate: Date, endDate: Date): Observable<Transaction[]> {
    return this.transactionRepo.getByDateRange(startDate, endDate);
  }

  getAllTransactions(): Observable<Transaction[]> {
    return this.transactionRepo.getAll();
  }

  getTransactionById(id: string): Observable<Transaction | null> {
    return this.transactionRepo.getById(id);
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
    return this.transactionRepo.update(id, data);
  }

  async deleteTransaction(id: string): Promise<void> {
    return this.transactionRepo.delete(id);
  }
}
