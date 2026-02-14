import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RoomRepository } from '../../domain/repositories/room.repository';
import { Room, CreateRoomDto, UpdateRoomDto } from '../../domain/models/room.model';
import { RoomFirebaseRepository } from '../repositories/room-firebase.repository';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  constructor(private repository: RoomFirebaseRepository) {}

  getAllRooms(): Observable<Room[]> {
    return this.repository.getAll();
  }

  getAll(): Observable<Room[]> {
    return this.repository.getAll();
  }

  getRoomById(id: string): Observable<Room | undefined> {
    return this.repository.getById(id);
  }

  getRoomsByFloor(floor: number): Observable<Room[]> {
    return this.repository.getByFloor(floor);
  }

  getRoomsByStatus(status: string): Observable<Room[]> {
    return this.repository.getByStatus(status);
  }

  getAvailableFloors(): Observable<number[]> {
    return this.repository.getAll().pipe(
      map(rooms => {
        const floors = rooms.map(room => room.floor);
        return [...new Set(floors)].sort((a, b) => a - b);
      })
    );
  }

  async createRoom(room: CreateRoomDto, userId: string): Promise<string> {
    await this.validateRoom(room);
    return this.repository.create(room, userId);
  }

  async updateRoom(room: UpdateRoomDto, userId: string): Promise<void> {
    await this.validateRoom(room, room.id);
    return this.repository.update(room, userId);
  }

  async deleteRoom(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  async changeRoomStatus(roomId: string, newStatus: string, userId: string): Promise<void> {
    return this.repository.update({ id: roomId, status: newStatus }, userId);
  }

  async assignHousekeeper(roomId: string, housekeeperId: string, userId: string): Promise<void> {
    return this.repository.update({ id: roomId, assignedHousekeeperId: housekeeperId }, userId);
  }

  async assignGuest(roomId: string, guestId: string, userId: string): Promise<void> {
    return this.repository.update({ 
      id: roomId, 
      currentGuestId: guestId,
      status: 'occupied'
    }, userId);
  }

  async checkoutGuest(roomId: string, userId: string): Promise<void> {
    return this.repository.update({ 
      id: roomId, 
      currentGuestId: null,
      status: 'cleaning'
    }, userId);
  }

  private async validateRoom(room: CreateRoomDto | UpdateRoomDto, excludeId?: string): Promise<void> {
    // Validar número de habitación único
    if (room.roomNumber) {
      const exists = await this.repository.checkRoomNumberExists(room.roomNumber, excludeId);
      if (exists) {
        throw new Error(`El número de habitación ${room.roomNumber} ya existe`);
      }
    }

    // Validar piso
    if (room.floor !== undefined && room.floor < 1) {
      throw new Error('El piso debe ser mayor o igual a 1');
    }

    // Validar capacidad
    if (room.capacity !== undefined && room.capacity < 1) {
      throw new Error('La capacidad debe ser al menos 1 persona');
    }

    // Validar precio
    if (room.basePrice !== undefined && room.basePrice < 0) {
      throw new Error('El precio base no puede ser negativo');
    }
  }
}
