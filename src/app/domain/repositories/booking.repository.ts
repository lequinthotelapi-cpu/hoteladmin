import { Observable } from 'rxjs';
import { Booking, BookingStatus } from '../models/booking.model';

export abstract class BookingRepository {
  abstract getAll(): Observable<Booking[]>;
  abstract getById(id: string): Observable<Booking>;
  abstract create(booking: Booking): Promise<string>;
  abstract update(id: string, booking: Partial<Booking>): Promise<void>;
  abstract delete(id: string): Promise<void>;
  
  // Queries especializadas
  abstract getByStatus(status: BookingStatus): Observable<Booking[]>;
  abstract getByRoom(roomId: string): Observable<Booking[]>;
  abstract getByGuest(guestId: string): Observable<Booking[]>;
  abstract getByDateRange(startDate: Date, endDate: Date): Observable<Booking[]>;
  abstract getArrivalsForDate(date: Date): Observable<Booking[]>;
  abstract getDeparturesForDate(date: Date): Observable<Booking[]>;
  abstract getOverlappingBookings(
    roomId: string, 
    checkIn: Date, 
    checkOut: Date,
    excludeBookingId?: string
  ): Promise<Booking[]>;
}
