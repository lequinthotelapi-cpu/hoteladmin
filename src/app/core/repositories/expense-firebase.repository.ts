import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, Timestamp, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExpenseRepository } from './expense.repository';
import { Expense, CreateExpenseData, UpdateExpenseData } from '../../domain/models/expense.model';

@Injectable()
export class ExpenseFirebaseRepository implements ExpenseRepository {
  private collectionName = 'expenses';

  constructor(private firestore: Firestore) {}

  private convertTimestamps(data: any): Expense {
    return {
      ...data,
      date: data.date instanceof Timestamp ? data.date.toDate() : data.date,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt
    };
  }

  getAll(): Observable<Expense[]> {
    const expensesCollection = collection(this.firestore, this.collectionName);
    const q = query(expensesCollection, orderBy('date', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((expenses: any[]) => expenses.map(e => this.convertTimestamps(e)))
    );
  }

  getById(id: string): Observable<Expense | null> {
    const expenseDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(expenseDoc, { idField: 'id' }).pipe(
      map((expense: any) => expense ? this.convertTimestamps(expense) : null)
    );
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<Expense[]> {
    const expensesCollection = collection(this.firestore, this.collectionName);
    const q = query(
      expensesCollection,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map((expenses: any[]) => expenses.map(e => this.convertTimestamps(e)))
    );
  }

  async create(data: CreateExpenseData): Promise<string> {
    const expensesCollection = collection(this.firestore, this.collectionName);
    const docRef = await addDoc(expensesCollection, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  }

  async update(id: string, data: UpdateExpenseData): Promise<void> {
    const expenseDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    await updateDoc(expenseDoc, {
      ...data,
      updatedAt: new Date()
    });
  }

  async delete(id: string): Promise<void> {
    const expenseDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(expenseDoc);
  }
}
