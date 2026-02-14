import { Injectable } from '@angular/core';
import { Firestore, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseFirestoreRepository } from './base-firestore.repository';
import { Transaction } from '../../domain/models/transaction.model';
import { TransactionRepository } from '../../domain/repositories/transaction.repository';

@Injectable({
  providedIn: 'root'
})
export class FirebaseTransactionRepository extends BaseFirestoreRepository<Transaction> implements TransactionRepository {
  protected collectionName = 'transactions';
  
  constructor(firestore: Firestore) {
    super(firestore);
  }

  getByCashRegister(cashRegisterId: string): Observable<Transaction[]> {
    return this.getByField('cashRegisterId', cashRegisterId).pipe(
      map((transactions: Transaction[]) => transactions.sort((a, b) => 
        b.createdAt.toMillis() - a.createdAt.toMillis()
      ))
    );
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<Transaction[]> {
    const start = Timestamp.fromDate(startDate);
    const end = Timestamp.fromDate(endDate);
    
    return this.getAll().pipe(
      map(transactions => transactions.filter(t => 
        t.createdAt.toMillis() >= start.toMillis() && 
        t.createdAt.toMillis() <= end.toMillis()
      ))
    );
  }
}
