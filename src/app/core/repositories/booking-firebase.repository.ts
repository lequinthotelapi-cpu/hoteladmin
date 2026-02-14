import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { collectionData, docData } from '@angular/fire/firestore';
import { Booking, BookingStatus } from '../../domain/models/booking.model';
import { BookingRepository } from '../../domain/repositories/booking.repository';

@Injectable({
  providedIn: 'root'
})
export class FirebaseBookingRepository extends BookingRepository {
  private collectionName = 'bookings';

  constructor(private firestore: Firestore) {
    super();
  }

  getAll(): Observable<Booking[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('checkInDate', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(bookings => bookings.map(b => this.convertTimestamps(b as any)))
    );
  }

  getById(id: string): Observable<Booking> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(ref, { idField: 'id' }).pipe(
      map(booking => this.convertTimestamps(booking as any))
    );
  }

  async create(booking: Booking): Promise<string> {
    const ref = collection(this.firestore, this.collectionName);
    const data = {
      ...booking,
      checkInDate: Timestamp.fromDate(booking.checkInDate),
      checkOutDate: Timestamp.fromDate(booking.checkOutDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(ref, data);
    return docRef.id;
  }

  async update(id: string, booking: Partial<Booking>): Promise<void> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    const data: any = { ...booking, updatedAt: serverTimestamp() };
    
    if (booking.checkInDate) {
      data.checkInDate = Timestamp.fromDate(booking.checkInDate);
    }
    if (booking.checkOutDate) {
      data.checkOutDate = Timestamp.fromDate(booking.checkOutDate);
    }
    
    await updateDoc(ref, data);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(ref);
  }

  getByStatus(status: BookingStatus): Observable<Booking[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('status', '==', status), orderBy('checkInDate', 'asc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(bookings => bookings.map(b => this.convertTimestamps(b as any)))
    );
  }

  getByRoom(roomId: string): Observable<Booking[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('roomId', '==', roomId), orderBy('checkInDate', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(bookings => bookings.map(b => this.convertTimestamps(b as any)))
    );
  }

  getByGuest(guestId: string): Observable<Booking[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('guestId', '==', guestId), orderBy('checkInDate', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      map(bookings => bookings.map(b => this.convertTimestamps(b as any)))
    );
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<Booking[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('checkInDate', '>=', Timestamp.fromDate(startDate)),
      where('checkInDate', '<=', Timestamp.fromDate(endDate)),
      orderBy('checkInDate', 'asc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(bookings => bookings.map(b => this.convertTimestamps(b as any)))
    );
  }

  getArrivalsForDate(date: Date): Observable<Booking[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('status', '==', 'confirmed'),
      where('checkInDate', '>=', Timestamp.fromDate(startOfDay)),
      where('checkInDate', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('checkInDate', 'asc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(bookings => bookings.map(b => this.convertTimestamps(b as any)))
    );
  }

  getDeparturesForDate(date: Date): Observable<Booking[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const ref = collection(this.firestore, this.collectionName);
    const q = query(
      ref,
      where('status', '==', 'checked-in'),
      where('checkOutDate', '>=', Timestamp.fromDate(startOfDay)),
      where('checkOutDate', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('checkOutDate', 'asc')
    );
    return collectionData(q, { idField: 'id' }).pipe(
      map(bookings => bookings.map(b => this.convertTimestamps(b as any)))
    );
  }

  async getOverlappingBookings(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string
  ): Promise<Booking[]> {
    const ref = collection(this.firestore, this.collectionName);
    
    // Buscar todas las reservas de la habitación (sin filtro de estado para evitar índice compuesto)
    const q = query(ref, where('roomId', '==', roomId));

    const snapshot = await getDocs(q);
    const bookings = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .map(b => this.convertTimestamps(b));

    // Filtrar manualmente por estado y solapamiento
    return bookings.filter(booking => {
      if (excludeBookingId && booking.id === excludeBookingId) {
        return false;
      }
      
      // Solo considerar reservas activas
      if (!['confirmed', 'checked-in'].includes(booking.status)) {
        return false;
      }
      
      // Dos reservas se solapan si:
      // (checkIn < booking.checkOut) AND (checkOut > booking.checkIn)
      return checkIn < booking.checkOutDate && checkOut > booking.checkInDate;
    });
  }

  private convertTimestamps(data: any): Booking {
    return {
      ...data,
      checkInDate: data.checkInDate instanceof Timestamp 
        ? data.checkInDate.toDate() 
        : data.checkInDate,
      checkOutDate: data.checkOutDate instanceof Timestamp 
        ? data.checkOutDate.toDate() 
        : data.checkOutDate,
      createdAt: data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate() 
        : data.updatedAt
    };
  }
}
