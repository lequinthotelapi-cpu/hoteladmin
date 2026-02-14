import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Room } from '../../domain/models/room.model';
import { Booking } from '../../domain/models/booking.model';

export interface RoomWithStatus extends Room {
  displayStatus: string;
  activeBooking?: Booking;
}

@Injectable({
  providedIn: 'root'
})
export class RoomStatusService {
  
  /**
   * Calcula el estado visual de las habitaciones basado en reservas activas
   */
  getRoomsWithStatus(rooms$: Observable<Room[]>, bookings$: Observable<Booking[]>): Observable<RoomWithStatus[]> {
    return combineLatest([rooms$, bookings$]).pipe(
      map(([rooms, bookings]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return rooms.map(room => {
          // Si la habitación NO está disponible, usar su estado real
          if (room.status !== 'available') {
            return { ...room, displayStatus: room.status };
          }
          
          // Si está disponible, verificar si tiene reserva activa HOY
          const activeBooking = bookings.find(b => {
            if (b.roomId !== room.id) return false;
            if (!['pending', 'confirmed'].includes(b.status)) return false;
            
            const checkIn = new Date(b.checkInDate);
            checkIn.setHours(0, 0, 0, 0);
            
            // Reserva activa = check-in es HOY
            return checkIn.getTime() === today.getTime();
          });
          
          return {
            ...room,
            displayStatus: activeBooking ? 'reserved' : 'available',
            activeBooking
          };
        });
      })
    );
  }
  
  /**
   * Verifica si una habitación tiene reserva activa para HOY
   */
  hasActiveBookingToday(room: Room, bookings: Booking[]): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return bookings.some(b => {
      if (b.roomId !== room.id) return false;
      if (!['pending', 'confirmed'].includes(b.status)) return false;
      
      const checkIn = new Date(b.checkInDate);
      checkIn.setHours(0, 0, 0, 0);
      
      return checkIn.getTime() === today.getTime();
    });
  }
}
