import { Observable } from 'rxjs';
import { Guest, CreateGuestData, UpdateGuestData } from '../../domain/models/guest.model';

export abstract class GuestRepository {
  abstract getAll(): Observable<Guest[]>;
  abstract getById(id: string): Observable<Guest | null>;
  abstract create(data: CreateGuestData): Promise<string>;
  abstract update(id: string, data: UpdateGuestData): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract searchByEmail(email: string): Promise<Guest | null>;
  abstract searchByDocument(documentType: string, documentNumber: string): Promise<Guest | null>;
}
