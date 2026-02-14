import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, orderBy, Timestamp } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseFirestoreRepository } from './base-firestore.repository';
import { Invoice } from '../../domain/models/invoice.model';
import { InvoiceRepository } from '../../domain/repositories/invoice.repository';

@Injectable({
  providedIn: 'root'
})
export class FirebaseInvoiceRepository extends BaseFirestoreRepository<Invoice> implements InvoiceRepository {
  protected collectionName = 'invoices';

  constructor(firestore: Firestore) {
    super(firestore);
  }

  getByInvoiceNumber(invoiceNumber: string): Observable<Invoice | null> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('invoiceNumber', '==', invoiceNumber));
    return collectionData(q, { idField: 'id' }).pipe(
      map((invoices: any[]) => invoices.length > 0 ? this.convertTimestamps(invoices[0]) : null)
    );
  }

  getByReference(referenceId: string): Observable<Invoice | null> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('referenceId', '==', referenceId));
    return collectionData(q, { idField: 'id' }).pipe(
      map((invoices: any[]) => invoices.length > 0 ? this.convertTimestamps(invoices[0]) : null)
    );
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<Invoice[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('issuedAt', '>=', Timestamp.fromDate(startDate)),
      where('issuedAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('issuedAt', 'desc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map((invoices: any[]) => invoices.map(inv => this.convertTimestamps(inv)))
    );
  }

  getByStatus(status: 'active' | 'cancelled'): Observable<Invoice[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('status', '==', status), orderBy('issuedAt', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((invoices: any[]) => invoices.map(inv => this.convertTimestamps(inv)))
    );
  }

  override getAll(): Observable<Invoice[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('issuedAt', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((invoices: any[]) => invoices.map(inv => this.convertTimestamps(inv)))
    );
  }

  private convertTimestamps(invoice: any): Invoice {
    return {
      ...invoice,
      issuedAt: invoice.issuedAt?.toDate ? invoice.issuedAt.toDate() : invoice.issuedAt,
      cancelledAt: invoice.cancelledAt?.toDate ? invoice.cancelledAt.toDate() : invoice.cancelledAt
    };
  }
}
