import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Notification } from '../../domain/models/notification.model';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

@Injectable({
  providedIn: 'root'
})
export class NotificationFirebaseRepository extends NotificationRepository {
  private collectionName = 'notifications';

  constructor(private firestore: Firestore) {
    super();
  }

  async create(notification: Notification): Promise<string> {
    const notificationsRef = collection(this.firestore, this.collectionName);
    const docData: any = {
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      createdAt: Timestamp.fromDate(notification.createdAt),
      priority: notification.priority
    };
    
    // Only add optional fields if they exist
    if (notification.actionUrl) {
      docData.actionUrl = notification.actionUrl;
    }
    if (notification.metadata) {
      docData.metadata = notification.metadata;
    }
    
    const docRef = await addDoc(notificationsRef, docData);
    return docRef.id;
  }

  getByUserId(userId: string): Observable<Notification[]> {
    return new Observable(observer => {
      const notificationsRef = collection(this.firestore, this.collectionName);
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications: Notification[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data()['createdAt']?.toDate() || new Date()
        } as Notification));
        observer.next(notifications);
      }, (error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  getUnreadCount(userId: string): Observable<number> {
    return new Observable(observer => {
      const notificationsRef = collection(this.firestore, this.collectionName);
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        observer.next(snapshot.size);
      }, (error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, notificationId);
    await updateDoc(docRef, { read: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const notificationsRef = collection(this.firestore, this.collectionName);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await new Promise<any>((resolve, reject) => {
      const unsubscribe = onSnapshot(q, resolve, reject);
      return unsubscribe;
    });

    const batch = writeBatch(this.firestore);
    snapshot.docs.forEach((document: any) => {
      batch.update(document.ref, { read: true });
    });

    await batch.commit();
  }

  async delete(notificationId: string): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, notificationId);
    await deleteDoc(docRef);
  }
}
