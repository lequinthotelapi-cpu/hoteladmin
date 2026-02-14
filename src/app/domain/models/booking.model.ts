export interface Booking {
  id?: string;
  bookingNumber: string; // Auto-generado: BK-20240101-001
  
  // Guest Info
  guestId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  
  // Room Info
  roomId: string;
  roomNumber: string;
  roomType: string;
  
  // Dates
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
  
  // Occupancy
  adults: number;
  children: number;
  
  // Pricing
  basePrice: number; // Precio por noche
  totalPrice: number; // basePrice * nights
  
  // Status
  status: BookingStatus;
  source: string; // direct, booking.com, airbnb, etc.
  
  // Additional
  specialRequests?: string;
  notes?: string;
  
  // Audit
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export type BookingStatus = 
  | 'pending'      // Reserva creada, pendiente de confirmación
  | 'confirmed'    // Confirmada, esperando llegada
  | 'checked-in'   // Huésped en el hotel
  | 'checked-out'  // Huésped salió
  | 'cancelled'    // Cancelada
  | 'no-show';     // No se presentó

export interface CreateBookingDto {
  guestId: string;
  roomId: string;
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: number;
  source: string;
  specialRequests?: string;
  notes?: string;
}

export interface UpdateBookingDto {
  checkInDate?: Date;
  checkOutDate?: Date;
  adults?: number;
  children?: number;
  specialRequests?: string;
  notes?: string;
}

export interface BookingSearchCriteria {
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: number;
  roomType?: string;
}

export interface AvailableRoom {
  id: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  basePrice: number;
  amenities: string[];
}
