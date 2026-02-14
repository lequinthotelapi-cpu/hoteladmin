import { Injectable } from '@angular/core';
import { Firestore, collection, query, where } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User, UserRole } from '../../domain/models/user.model';
import { BaseFirestoreRepository } from './base-firestore.repository';

/**
 * Firebase User Repository Implementation
 * Implements user data operations using Firestore
 */
@Injectable({
  providedIn: 'root'
})
export class FirebaseUserRepository 
  extends BaseFirestoreRepository<User> 
  implements UserRepository {

  protected collectionName = 'users';
  protected override idField = 'uid';

  constructor(firestore: Firestore) {
    super(firestore);
  }

  getUsersByRole(role: UserRole): Observable<User[]> {
    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(collectionRef, where('role', '==', role));
    return collectionData(q, { idField: this.idField }) as Observable<User[]>;
  }

  getByRole(role: string): Observable<User[]> {
    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(collectionRef, where('role', '==', role));
    return collectionData(q, { idField: this.idField }) as Observable<User[]>;
  }

  getActiveUsers(): Observable<User[]> {
    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(collectionRef, where('active', '==', true));
    return collectionData(q, { idField: this.idField }) as Observable<User[]>;
  }
}
