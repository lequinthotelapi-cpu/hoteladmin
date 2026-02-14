import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { HousekeepingTaskRepository } from '../../domain/repositories/housekeeping-task.repository';
import { HousekeepingTask, CreateHousekeepingTaskDto, UpdateHousekeepingTaskDto, TaskStatus } from '../../domain/models/housekeeping-task.model';

@Injectable({
  providedIn: 'root'
})
export class HousekeepingTaskFirebaseRepository extends HousekeepingTaskRepository {
  private collectionName = 'housekeepingTasks';

  constructor(private firestore: Firestore) {
    super();
  }

  getAll(): Observable<HousekeepingTask[]> {
    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(collectionRef, orderBy('scheduledDate', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(tasks => tasks.map(task => this.convertTimestamps(task)))
    );
  }

  getById(id: string): Observable<HousekeepingTask | undefined> {
    const docRef = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(docRef, { idField: 'id' }).pipe(
      map(task => task ? this.convertTimestamps(task) : undefined)
    );
  }

  getByRoom(roomId: string): Observable<HousekeepingTask[]> {
    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(
      collectionRef,
      where('roomId', '==', roomId),
      orderBy('scheduledDate', 'desc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(tasks => tasks.map(task => this.convertTimestamps(task)))
    );
  }

  getByEmployee(employeeId: string): Observable<HousekeepingTask[]> {
    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(
      collectionRef,
      where('assignedTo', '==', employeeId),
      orderBy('scheduledDate', 'asc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(tasks => tasks.map(task => this.convertTimestamps(task)))
    );
  }

  getByStatus(status: TaskStatus): Observable<HousekeepingTask[]> {
    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(
      collectionRef,
      where('status', '==', status),
      orderBy('priority', 'desc'),
      orderBy('scheduledDate', 'asc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(tasks => tasks.map(task => this.convertTimestamps(task)))
    );
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<HousekeepingTask[]> {
    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(
      collectionRef,
      where('scheduledDate', '>=', Timestamp.fromDate(startDate)),
      where('scheduledDate', '<=', Timestamp.fromDate(endDate)),
      orderBy('scheduledDate', 'asc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(tasks => tasks.map(task => this.convertTimestamps(task)))
    );
  }

  getPendingTasks(): Observable<HousekeepingTask[]> {
    return this.getByStatus('pending');
  }

  getInProgressTasks(): Observable<HousekeepingTask[]> {
    return this.getByStatus('in-progress');
  }

  getCompletedToday(): Observable<HousekeepingTask[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(
      collectionRef,
      where('status', '==', 'completed'),
      where('completedAt', '>=', Timestamp.fromDate(today)),
      where('completedAt', '<', Timestamp.fromDate(tomorrow)),
      orderBy('completedAt', 'desc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(tasks => tasks.map(task => this.convertTimestamps(task)))
    );
  }

  getOverdueTasks(): Observable<HousekeepingTask[]> {
    const now = new Date();
    const collectionRef = collection(this.firestore, this.collectionName);
    const q = query(
      collectionRef,
      where('status', 'in', ['pending', 'in-progress']),
      where('scheduledDate', '<', Timestamp.fromDate(now)),
      orderBy('scheduledDate', 'asc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(tasks => tasks.map(task => this.convertTimestamps(task)))
    );
  }

  async create(dto: CreateHousekeepingTaskDto, userId: string): Promise<string> {
    const collectionRef = collection(this.firestore, this.collectionName);
    const now = new Date();
    
    const task: any = {
      ...dto,
      status: 'pending',
      scheduledDate: Timestamp.fromDate(dto.scheduledDate),
      createdAt: Timestamp.fromDate(now),
      createdBy: userId,
      updatedAt: Timestamp.fromDate(now),
      updatedBy: userId
    };

    const docRef = await addDoc(collectionRef, task);
    return docRef.id;
  }

  async update(id: string, dto: UpdateHousekeepingTaskDto, userId: string): Promise<void> {
    const docRef = doc(this.firestore, `${this.collectionName}/${id}`);
    const updateData: any = {
      ...dto,
      updatedAt: Timestamp.fromDate(new Date()),
      updatedBy: userId
    };

    if (dto.scheduledDate) {
      updateData.scheduledDate = Timestamp.fromDate(dto.scheduledDate);
    }

    // Convertir startedAt si existe
    if ((dto as any).startedAt) {
      updateData.startedAt = Timestamp.fromDate((dto as any).startedAt);
    }

    // Convertir completedAt si existe
    if ((dto as any).completedAt) {
      updateData.completedAt = Timestamp.fromDate((dto as any).completedAt);
    }

    await updateDoc(docRef, updateData);
  }

  async updateStatus(id: string, status: TaskStatus, userId: string): Promise<void> {
    const docRef = doc(this.firestore, `${this.collectionName}/${id}`);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.fromDate(new Date()),
      updatedBy: userId
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(docRef);
  }

  private convertTimestamps(task: any): HousekeepingTask {
    return {
      ...task,
      scheduledDate: task.scheduledDate?.toDate() || new Date(),
      startedAt: task.startedAt?.toDate(),
      completedAt: task.completedAt?.toDate(),
      createdAt: task.createdAt?.toDate() || new Date(),
      updatedAt: task.updatedAt?.toDate() || new Date()
    };
  }
}
