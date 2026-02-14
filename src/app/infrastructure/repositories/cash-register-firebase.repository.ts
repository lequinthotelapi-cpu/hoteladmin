import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, getDocs, Timestamp, orderBy, limit, collectionData, doc, updateDoc, increment } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CashRegister, CloseCashRegisterData } from '../../domain/models/cash-register.model';
import { CashRegisterRepository } from '../../domain/repositories/cash-register.repository';
import { BaseFirestoreRepository } from './base-firestore.repository';

@Injectable({
  providedIn: 'root'
})
export class FirebaseCashRegisterRepository extends BaseFirestoreRepository<CashRegister> implements CashRegisterRepository {
  protected collectionName = 'cashRegisters';
  
  constructor(firestore: Firestore) {
    super(firestore);
  }

  async getOpenCashRegisterByUser(userId: string): Promise<CashRegister | null> {
    const q = query(
      collection(this.firestore, this.collectionName),
      where('userId', '==', userId),
      where('status', '==', 'open'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as CashRegister;
  }

  getByUser(userId: string): Observable<CashRegister[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('userId', '==', userId),
      orderBy('openedAt', 'desc')
    );
    
    return collectionData(q, { idField: 'id' }) as Observable<CashRegister[]>;
  }

  async closeCashRegister(id: string, data: CloseCashRegisterData): Promise<void> {
    await this.update(id, {
      status: 'closed',
      closedAt: Timestamp.now(),
      finalAmount: data.finalAmount,
      notes: data.notes,
      closedBy: data.closedBy
    } as Partial<CashRegister>);
  }

  async updateTotals(id: string, totals: Partial<CashRegister>): Promise<void> {
    await this.update(id, totals);
  }

  async incrementTotal(id: string, field: string, amount: number, incrementExpected: number): Promise<void> {
    const docRef = doc(this.firestore, `${this.collectionName}/${id}`);
    const updates: any = {
      [field]: increment(amount),
      expectedAmount: increment(incrementExpected)
    };
    await updateDoc(docRef, updates);
  }
}
