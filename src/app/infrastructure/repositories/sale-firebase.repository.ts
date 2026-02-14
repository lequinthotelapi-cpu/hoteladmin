import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, orderBy, Timestamp, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Sale } from '../../domain/models/sale.model';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { BaseFirestoreRepository } from './base-firestore.repository';

@Injectable({
  providedIn: 'root'
})
export class FirebaseSaleRepository extends BaseFirestoreRepository<Sale> implements SaleRepository {
  protected collectionName = 'sales';
  
  constructor(firestore: Firestore) {
    super(firestore);
  }

  getByCashRegister(cashRegisterId: string): Observable<Sale[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('cashRegisterId', '==', cashRegisterId),
      orderBy('createdAt', 'desc')
    );
    
    return collectionData(q, { idField: 'id' }) as Observable<Sale[]>;
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<Sale[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );
    
    return collectionData(q, { idField: 'id' }) as Observable<Sale[]>;
  }
}
