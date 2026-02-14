import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  serverTimestamp,
  limit
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { collectionData, docData } from '@angular/fire/firestore';
import { GuestAccount, GuestAccountStatus } from '../../domain/models/guest-account.model';
import { GuestAccountRepository } from '../../domain/repositories/guest-account.repository';

@Injectable({
  providedIn: 'root'
})
export class FirebaseGuestAccountRepository extends GuestAccountRepository {
  private collectionName = 'guestAccounts';

  constructor(private firestore: Firestore) {
    super();
  }

  getAll(): Observable<GuestAccount[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('checkInDate', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(accounts => accounts.map(a => this.convertTimestamps(a as any)))
    );
  }

  getById(id: string): Observable<GuestAccount> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(ref, { idField: 'id' }).pipe(
      map(account => this.convertTimestamps(account as any))
    );
  }

  getByBooking(bookingId: string): Observable<GuestAccount | null> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('bookingId', '==', bookingId), limit(1));
    return collectionData(q, { idField: 'id' }).pipe(
      map(accounts => {
        if (accounts.length === 0) return null;
        return this.convertTimestamps(accounts[0] as any);
      })
    );
  }

  getByStatus(status: GuestAccountStatus): Observable<GuestAccount[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('status', '==', status), orderBy('checkInDate', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(accounts => accounts.map(a => this.convertTimestamps(a as any)))
    );
  }

  getByRoom(roomNumber: string): Observable<GuestAccount[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('roomNumber', '==', roomNumber), orderBy('checkInDate', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(accounts => accounts.map(a => this.convertTimestamps(a as any)))
    );
  }

  async create(account: GuestAccount): Promise<string> {
    const ref = collection(this.firestore, this.collectionName);
    const data = {
      ...account,
      checkInDate: Timestamp.fromDate(account.checkInDate),
      checkOutDate: account.checkOutDate ? Timestamp.fromDate(account.checkOutDate) : null,
      charges: account.charges.map(c => ({
        ...c,
        date: Timestamp.fromDate(c.date),
        createdAt: Timestamp.fromDate(c.createdAt)
      })),
      payments: account.payments.map(p => ({
        ...p,
        date: Timestamp.fromDate(p.date),
        createdAt: Timestamp.fromDate(p.createdAt)
      })),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(ref, data);
    return docRef.id;
  }

  async update(id: string, account: Partial<GuestAccount>): Promise<void> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    const data: any = { ...account, updatedAt: serverTimestamp() };
    
    if (account.checkInDate) {
      data.checkInDate = Timestamp.fromDate(account.checkInDate);
    }
    if (account.checkOutDate) {
      data.checkOutDate = Timestamp.fromDate(account.checkOutDate);
    }
    if (account.charges) {
      data.charges = account.charges.map(c => ({
        ...c,
        date: Timestamp.fromDate(c.date),
        createdAt: Timestamp.fromDate(c.createdAt)
      }));
    }
    if (account.payments) {
      data.payments = account.payments.map(p => ({
        ...p,
        date: Timestamp.fromDate(p.date),
        createdAt: Timestamp.fromDate(p.createdAt)
      }));
    }
    if (account.closedAt) {
      data.closedAt = Timestamp.fromDate(account.closedAt);
    }
    
    await updateDoc(ref, data);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(ref);
  }

  private convertTimestamps(data: any): GuestAccount {
    return {
      ...data,
      checkInDate: data.checkInDate instanceof Timestamp 
        ? data.checkInDate.toDate() 
        : data.checkInDate,
      checkOutDate: data.checkOutDate instanceof Timestamp 
        ? data.checkOutDate.toDate() 
        : data.checkOutDate,
      charges: (data.charges || []).map((c: any) => ({
        ...c,
        date: c.date instanceof Timestamp ? c.date.toDate() : c.date,
        createdAt: c.createdAt instanceof Timestamp ? c.createdAt.toDate() : c.createdAt
      })),
      payments: (data.payments || []).map((p: any) => ({
        ...p,
        date: p.date instanceof Timestamp ? p.date.toDate() : p.date,
        createdAt: p.createdAt instanceof Timestamp ? p.createdAt.toDate() : p.createdAt
      })),
      createdAt: data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate() 
        : data.updatedAt,
      closedAt: data.closedAt instanceof Timestamp 
        ? data.closedAt.toDate() 
        : data.closedAt
    };
  }
}
