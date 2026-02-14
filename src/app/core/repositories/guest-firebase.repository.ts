import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, getDocs, serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { GuestRepository } from './guest.repository';
import { Guest, CreateGuestData, UpdateGuestData } from '../../domain/models/guest.model';

@Injectable({
  providedIn: 'root'
})
export class GuestFirebaseRepository extends GuestRepository {
  private collectionName = 'guests';

  constructor(private firestore: Firestore) {
    super();
  }

  private convertTimestamps(data: any): any {
    if (!data) return data;
    
    const converted = { ...data };
    
    if (converted.createdAt instanceof Timestamp) {
      converted.createdAt = converted.createdAt.toDate();
    }
    if (converted.updatedAt instanceof Timestamp) {
      converted.updatedAt = converted.updatedAt.toDate();
    }
    if (converted.dateOfBirth instanceof Timestamp) {
      converted.dateOfBirth = converted.dateOfBirth.toDate();
    }
    
    return converted;
  }

  getAll(): Observable<Guest[]> {
    const guestsCollection = collection(this.firestore, this.collectionName);
    return collectionData(guestsCollection, { idField: 'id' }).pipe(
      map(guests => guests.map(guest => this.convertTimestamps(guest) as Guest))
    );
  }

  getById(id: string): Observable<Guest | null> {
    const guestDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(guestDoc, { idField: 'id' }).pipe(
      map(data => data ? this.convertTimestamps(data) as Guest : null)
    );
  }

  async create(data: CreateGuestData): Promise<string> {
    const guestsCollection = collection(this.firestore, this.collectionName);
    const docData = {
      ...data,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(guestsCollection, docData);
    return docRef.id;
  }

  async update(id: string, data: UpdateGuestData): Promise<void> {
    const guestDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    await updateDoc(guestDoc, updateData);
  }

  async delete(id: string): Promise<void> {
    const guestDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(guestDoc);
  }

  async searchByEmail(email: string): Promise<Guest | null> {
    const guestsCollection = collection(this.firestore, this.collectionName);
    const q = query(guestsCollection, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    return this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Guest;
  }

  async searchByDocument(documentType: string, documentNumber: string): Promise<Guest | null> {
    const guestsCollection = collection(this.firestore, this.collectionName);
    const q = query(
      guestsCollection,
      where('documentType', '==', documentType),
      where('documentNumber', '==', documentNumber)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    return this.convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as Guest;
  }
}
