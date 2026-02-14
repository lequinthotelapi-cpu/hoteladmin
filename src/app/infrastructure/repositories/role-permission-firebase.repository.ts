import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { RolePermission } from '../../domain/models/role-permission.model';
import { RolePermissionRepository } from '../../domain/repositories/role-permission.repository';

@Injectable({
  providedIn: 'root'
})
export class RolePermissionFirebaseRepository extends RolePermissionRepository {
  private collectionName = 'rolePermissions';

  constructor(private firestore: Firestore) {
    super();
  }

  getByRole(role: string): Observable<RolePermission | null> {
    return new Observable(observer => {
      const docRef = doc(this.firestore, this.collectionName, role);
      getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          observer.next({
            ...data,
            createdAt: data['createdAt']?.toDate(),
            updatedAt: data['updatedAt']?.toDate()
          } as RolePermission);
        } else {
          observer.next(null);
        }
        observer.complete();
      }).catch(error => observer.error(error));
    });
  }

  getAll(): Observable<RolePermission[]> {
    return new Observable(observer => {
      const collectionRef = collection(this.firestore, this.collectionName);
      getDocs(collectionRef).then(snapshot => {
        const permissions = snapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate(),
          updatedAt: doc.data()['updatedAt']?.toDate()
        } as RolePermission));
        observer.next(permissions);
        observer.complete();
      }).catch(error => observer.error(error));
    });
  }

  async create(permission: RolePermission): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, permission.role);
    await setDoc(docRef, {
      ...permission,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  async update(role: string, permission: Partial<RolePermission>): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, role);
    await updateDoc(docRef, {
      ...permission,
      updatedAt: Timestamp.now()
    });
  }
}
