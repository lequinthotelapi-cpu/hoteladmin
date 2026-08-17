import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { FirebaseBookingRepository } from '../repositories/booking-firebase.repository';
import {
  Booking,
  BookingStatus,
  CreateBookingDto,
  UpdateBookingDto,
  BookingSearchCriteria,
  AvailableRoom
} from '../../domain/models/booking.model';
import { RoomService } from './room.service';
import { GuestService } from './guest.service';
import { GuestAccountService } from './guest-account.service';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';

// Réplica del contrato de salida de la Cloud Function `crearReserva`
// (functions/src/bookings/crear-reserva.ts, SPEC-05).
interface CrearReservaResult {
  bookingId: string;
  bookingNumber: string;
  totalPrice: number;
  nights: number;
  status: 'pending';
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  constructor(
    private repository: FirebaseBookingRepository,
    private roomService: RoomService,
    private guestService: GuestService,
    private guestAccountService: GuestAccountService,
    private notificationService: NotificationService,
    private userService: UserService,
    private functions: Functions
  ) {}

  // CRUD básico
  getAllBookings(): Observable<Booking[]> {
    return this.repository.getAll();
  }

  getBookingById(id: string): Observable<Booking> {
    return this.repository.getById(id);
  }

  /**
   * SPEC-05: delega en la Cloud Function `crearReserva` en vez de validar/calcular/
   * escribir en el cliente (evita la condición de carrera que existía al no estar
   * en una transacción). `userId` ya no se usa — el creador de la reserva se deriva
   * server-side de `request.auth`, pero se mantiene el parámetro para no romper la
   * firma pública que consumen los componentes existentes.
   */
  async createBooking(dto: CreateBookingDto, _userId: string): Promise<string> {
    const crearReservaFn = httpsCallable<Record<string, unknown>, CrearReservaResult>(
      this.functions,
      'crearReserva'
    );

    let result: CrearReservaResult;
    try {
      const response = await crearReservaFn({
        roomId: dto.roomId,
        guestId: dto.guestId,
        checkInDate: dto.checkInDate.toISOString(),
        checkOutDate: dto.checkOutDate.toISOString(),
        adults: dto.adults,
        children: dto.children,
        source: dto.source,
        specialRequests: dto.specialRequests,
        notes: dto.notes
      });
      result = response.data;
    } catch (error: any) {
      // El mensaje de la Function ya está alineado en significado con los mensajes
      // que este método lanzaba antes (ver crear-reserva.ts) — se propaga tal cual.
      throw new Error(error.message || 'No se pudo crear la reserva');
    }

    // Notificar a recepcionistas sobre nueva reserva (se queda en Angular, no se
    // migró a la Function — ver "Fuera de alcance" en crear-reserva.ts).
    const guest = await firstValueFrom(this.guestService.getById(dto.guestId));
    const guestName = `${guest.firstName} ${guest.lastName}`;
    const receptionists = await firstValueFrom(this.userService.getUsersByRole('receptionist'));
    for (const receptionist of receptionists) {
      await this.notificationService.notifyNewBooking(
        receptionist.uid,
        result.bookingNumber,
        guestName
      );
    }

    return result.bookingId;
  }

  async updateBooking(id: string, dto: UpdateBookingDto, userId: string): Promise<void> {
    const booking = await firstValueFrom(this.repository.getById(id));

    // Si cambian las fechas, validar disponibilidad
    if (dto.checkInDate || dto.checkOutDate) {
      const newCheckIn = dto.checkInDate || booking.checkInDate;
      const newCheckOut = dto.checkOutDate || booking.checkOutDate;

      const isAvailable = await this.checkRoomAvailability(
        booking.roomId,
        newCheckIn,
        newCheckOut,
        id
      );

      if (!isAvailable) {
        throw new Error('La habitación no está disponible para las nuevas fechas');
      }

      // Recalcular noches y precio
      const nights = this.calculateNights(newCheckIn, newCheckOut);
      const totalPrice = booking.basePrice * nights;

      await this.repository.update(id, {
        ...dto,
        nights,
        totalPrice,
        updatedBy: userId
      });
    } else {
      await this.repository.update(id, { ...dto, updatedBy: userId });
    }
  }

  async deleteBooking(id: string): Promise<void> {
    return await this.repository.delete(id);
  }

  // Cambios de estado — SPEC-06: delegan en Functions (confirmarReserva/cancelarReserva)
  // en vez de escribir Firestore directo. userId ya no se usa (se deriva de
  // request.auth server-side) pero se mantiene el parámetro para no romper la
  // firma pública que consumen los componentes existentes.
  async confirmBooking(id: string, _userId: string): Promise<void> {
    const confirmarReservaFn = httpsCallable(this.functions, 'confirmarReserva');
    try {
      await confirmarReservaFn({ bookingId: id });
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo confirmar la reserva');
    }
  }

  async cancelBooking(id: string, _userId: string): Promise<void> {
    const cancelarReservaFn = httpsCallable(this.functions, 'cancelarReserva');
    try {
      await cancelarReservaFn({ bookingId: id });
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo cancelar la reserva');
    }
  }

  async markAsNoShow(id: string, userId: string): Promise<void> {
    await this.repository.update(id, { 
      status: 'no-show',
      updatedBy: userId
    });
  }

  // SPEC-07: delega en la Cloud Function registrarCheckIn, que hace las 3
  // escrituras (Guest Account, Room, Booking) en una sola transacción — en vez
  // de 3 escrituras independientes sin transacción como antes. userId ya no
  // se usa (se deriva de request.auth) pero se mantiene en la firma.
  async checkIn(id: string, _userId: string): Promise<void> {
    const registrarCheckInFn = httpsCallable(this.functions, 'registrarCheckIn');
    try {
      await registrarCheckInFn({ bookingId: id });
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo registrar el check-in');
    }
  }

  // SPEC-08: delega en la Cloud Function registrarCheckOut (transaccional).
  // Decisión del usuario (Task 08.1): no conectar tarea de housekeeping
  // automática — se mantiene manual, igual que hoy. userId ya no se usa pero
  // se mantiene en la firma.
  async checkOut(id: string, _userId: string): Promise<void> {
    const registrarCheckOutFn = httpsCallable(this.functions, 'registrarCheckOut');
    try {
      await registrarCheckOutFn({ bookingId: id });
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo registrar el check-out');
    }
  }

  // Queries especializadas
  getBookingsByStatus(status: BookingStatus): Observable<Booking[]> {
    return this.repository.getByStatus(status);
  }

  getBookingsByRoom(roomId: string): Observable<Booking[]> {
    return this.repository.getByRoom(roomId);
  }

  getBookingsByGuest(guestId: string): Observable<Booking[]> {
    return this.repository.getByGuest(guestId);
  }

  getActiveBookingForRoom(roomId: string): Observable<Booking | null> {
    return this.repository.getByRoom(roomId).pipe(
      map(bookings => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const activeBooking = bookings.find(b => {
          const checkIn = new Date(b.checkInDate);
          checkIn.setHours(0, 0, 0, 0);
          return ['pending', 'confirmed'].includes(b.status) && checkIn.getTime() === today.getTime();
        });
        
        return activeBooking || null;
      })
    );
  }

  getArrivalsForToday(): Observable<Booking[]> {
    return this.repository.getArrivalsForDate(new Date());
  }

  getDeparturesForToday(): Observable<Booking[]> {
    return this.repository.getDeparturesForDate(new Date());
  }

  getArrivalsForDate(date: Date): Observable<Booking[]> {
    return this.repository.getArrivalsForDate(date);
  }

  getDeparturesForDate(date: Date): Observable<Booking[]> {
    return this.repository.getDeparturesForDate(date);
  }

  // Búsqueda de disponibilidad
  async searchAvailableRooms(criteria: BookingSearchCriteria): Promise<AvailableRoom[]> {
    // Obtener todas las habitaciones activas y disponibles
    const allRooms = await firstValueFrom(this.roomService.getAllRooms());
    const activeRooms = allRooms.filter(r => r.isActive && (r.status === 'available' || r.status === 'reserved'));

    // Filtrar por tipo si se especifica
    let filteredRooms = activeRooms;
    if (criteria.roomType) {
      filteredRooms = activeRooms.filter(r => r.roomType === criteria.roomType);
    }

    // Filtrar por capacidad
    const totalGuests = criteria.adults + criteria.children;
    filteredRooms = filteredRooms.filter(r => r.capacity >= totalGuests);

    // Verificar disponibilidad de cada habitación
    const availableRooms: AvailableRoom[] = [];
    for (const room of filteredRooms) {
      const isAvailable = await this.checkRoomAvailability(
        room.id!,
        criteria.checkInDate,
        criteria.checkOutDate
      );

      if (isAvailable) {
        availableRooms.push({
          id: room.id!,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          capacity: room.capacity,
          basePrice: room.basePrice,
          amenities: room.amenities
        });
      }
    }

    return availableRooms;
  }

  async checkRoomAvailability(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string
  ): Promise<boolean> {
    const overlapping = await this.repository.getOverlappingBookings(
      roomId,
      checkIn,
      checkOut,
      excludeBookingId
    );
    return overlapping.length === 0;
  }

  // Utilidades
  private calculateNights(checkIn: Date, checkOut: Date): number {
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

}
