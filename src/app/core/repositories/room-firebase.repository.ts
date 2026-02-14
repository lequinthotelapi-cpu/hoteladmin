import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, getDocs, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RoomRepository } from '../../domain/repositories/room.repository';
import { Room, CreateRoomDto, UpdateRoomDto } from '../../domain/models/room.model';

@Injectable({
  providedIn: 'root'
})
export class RoomFirebaseRepository extends RoomRepository {
  private collectionName = 'rooms';

  constructor(private firestore: Firestore) {
    super();
  }

  getAll(): Observable<Room[]> {
    const roomsCollection = collection(this.firestore, this.collectionName);
    return collectionData(roomsCollection, { idField: 'id' }) as Observable<Room[]>;
  }

  getById(id: string): Observable<Room | undefined> {
    const roomDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(roomDoc, { idField: 'id' }) as Observable<Room | undefined>;
  }

  getByFloor(floor: number): Observable<Room[]> {
    const roomsCollection = collection(this.firestore, this.collectionName);
    const q = query(roomsCollection, where('floor', '==', floor));
    return collectionData(q, { idField: 'id' }) as Observable<Room[]>;
  }

  getByStatus(status: string): Observable<Room[]> {
    const roomsCollection = collection(this.firestore, this.collectionName);
    const q = query(roomsCollection, where('status', '==', status));
    return collectionData(q, { idField: 'id' }) as Observable<Room[]>;
  }

  async create(room: CreateRoomDto, userId: string): Promise<string> {
    const roomsCollection = collection(this.firestore, this.collectionName);
    const newRoom = {
      ...room,
      createdAt: Timestamp.now(),
      createdBy: userId,
      updatedAt: Timestamp.now(),
      updatedBy: userId
    };
    const docRef = await addDoc(roomsCollection, newRoom);
    return docRef.id;
  }

  async update(room: UpdateRoomDto, userId: string): Promise<void> {
    const { id, ...updateData } = room;
    const roomDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    await updateDoc(roomDoc, {
      ...updateData,
      updatedAt: Timestamp.now(),
      updatedBy: userId
    });
  }

  async delete(id: string): Promise<void> {
    const roomDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(roomDoc);
  }

  async checkRoomNumberExists(roomNumber: string, excludeId?: string): Promise<boolean> {
    const roomsCollection = collection(this.firestore, this.collectionName);
    const q = query(roomsCollection, where('roomNumber', '==', roomNumber));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return false;
    if (!excludeId) return true;
    
    return snapshot.docs.some(doc => doc.id !== excludeId);
  }
}
