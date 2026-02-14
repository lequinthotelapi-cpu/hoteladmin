import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { BaseRepository } from '../../domain/repositories/base.repository';

/**
 * Base Firestore Repository Implementation
 * Generic implementation for Firestore CRUD operations
 * 
 * @template T - Entity type
 */
export abstract class BaseFirestoreRepository<T> implements BaseRepository<T> {
  
  protected abstract collectionName: string;
  protected idField: string = 'id';

  constructor(protected firestore: Firestore) {}

  getAll(): Observable<T[]> {
    const ref = collection(this.firestore, this.collectionName);
    return collectionData(ref, { idField: this.idField as any }) as Observable<T[]>;
  }

  getById(id: string): Observable<T | null> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(ref, { idField: this.idField as any }) as Observable<T>;
  }

  getByField(field: string, value: any): Observable<T[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where(field as any, '==', value));
    return collectionData(q, { idField: this.idField as any }) as Observable<T[]>;
  }

  async create(entity: T): Promise<string> {
    const ref = collection(this.firestore, this.collectionName);
    const data = { ...entity };
    delete (data as any)[this.idField];
    const docRef = await addDoc(ref, data);
    return docRef.id;
  }

  async update(id: string, entity: Partial<T>): Promise<void> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    const data = { ...entity };
    delete (data as any)[this.idField];
    await updateDoc(ref, data as any);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(ref);
  }
}
