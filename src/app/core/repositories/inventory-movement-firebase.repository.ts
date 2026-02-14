import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, Timestamp, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { InventoryMovementRepository } from './inventory-movement.repository';
import { InventoryMovement, CreateInventoryMovementData, UpdateInventoryMovementData } from '../../domain/models/inventory-movement.model';

@Injectable()
export class InventoryMovementFirebaseRepository implements InventoryMovementRepository {
  private collectionName = 'inventoryMovements';

  constructor(private firestore: Firestore) {}

  private convertTimestamps(data: any): InventoryMovement {
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      date: data.date instanceof Timestamp ? data.date.toDate() : data.date
    };
  }

  getAll(): Observable<InventoryMovement[]> {
    const movementsCollection = collection(this.firestore, this.collectionName);
    const q = query(movementsCollection, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((movements: any[]) => movements.map(m => this.convertTimestamps(m)))
    );
  }

  getById(id: string): Observable<InventoryMovement | null> {
    const movementDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(movementDoc, { idField: 'id' }).pipe(
      map((movement: any) => movement ? this.convertTimestamps(movement) : null)
    );
  }

  getByProduct(productId: string): Observable<InventoryMovement[]> {
    const movementsCollection = collection(this.firestore, this.collectionName);
    const q = query(movementsCollection, where('productId', '==', productId), orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((movements: any[]) => movements.map(m => this.convertTimestamps(m)))
    );
  }

  async create(data: CreateInventoryMovementData): Promise<string> {
    const movementsCollection = collection(this.firestore, this.collectionName);
    const docRef = await addDoc(movementsCollection, {
      ...data,
      createdAt: new Date()
    });
    return docRef.id;
  }

  async update(id: string, data: UpdateInventoryMovementData): Promise<void> {
    const movementDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    await updateDoc(movementDoc, { ...data });
  }

  async delete(id: string): Promise<void> {
    const movementDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(movementDoc);
  }
}
