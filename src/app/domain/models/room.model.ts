import { Timestamp } from '@angular/fire/firestore';

export interface Room {
  id?: string;
  
  // Identificación
  roomNumber: string;
  floor: number;
  
  // Características
  roomType: string;
  bedType: string;
  capacity: number;
  amenities: string[];
  
  // Estado
  status: string;
  isActive: boolean;
  
  // Precios
  basePrice: number;
  
  // Asignaciones
  assignedHousekeeperId?: string;
  currentGuestId?: string;
  
  // Opcional
  description?: string;
  photoUrl?: string;
  notes?: string;
  
  // Auditoría
  createdAt?: Timestamp;
  createdBy?: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export interface CreateRoomDto {
  roomNumber: string;
  floor: number;
  roomType: string;
  bedType: string;
  capacity: number;
  amenities: string[];
  status: string;
  isActive: boolean;
  basePrice: number;
  assignedHousekeeperId?: string;
  description?: string;
  photoUrl?: string;
  notes?: string;
}

export interface UpdateRoomDto extends Partial<CreateRoomDto> {
  id: string;
  currentGuestId?: string | null;
}
