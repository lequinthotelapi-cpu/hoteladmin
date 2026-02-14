import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, orderBy, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CashTransaction } from '../../domain/models/cash-transaction.model';
import { CashTransactionRepository } from '../../domain/repositories/cash-transaction.repository';
import { BaseFirestoreRepository } from './base-firestore.repository';

@Injectable({
  providedIn: 'root'
})
export class FirebaseCashTransactionRepository extends BaseFirestoreRepository<CashTransaction> implements CashTransactionRepository {
  protected collectionName = 'cashTransactions';
  
  constructor(firestore: Firestore) {
    super(firestore);
  }

  getByCashRegister(cashRegisterId: string): Observable<CashTransaction[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('cashRegisterId', '==', cashRegisterId),
      orderBy('createdAt', 'desc')
    );
    
    return collectionData(q, { idField: 'id' }) as Observable<CashTransaction[]>;
  }
}
