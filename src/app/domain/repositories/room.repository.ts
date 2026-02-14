import { Observable } from 'rxjs';
import { Room, CreateRoomDto, UpdateRoomDto } from '../models/room.model';

export abstract class RoomRepository {
  abstract getAll(): Observable<Room[]>;
  abstract getById(id: string): Observable<Room | undefined>;
  abstract getByFloor(floor: number): Observable<Room[]>;
  abstract getByStatus(status: string): Observable<Room[]>;
  abstract create(room: CreateRoomDto, userId: string): Promise<string>;
  abstract update(room: UpdateRoomDto, userId: string): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract checkRoomNumberExists(roomNumber: string, excludeId?: string): Promise<boolean>;
}
