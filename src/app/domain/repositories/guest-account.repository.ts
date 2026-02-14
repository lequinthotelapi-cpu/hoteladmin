import { Observable } from 'rxjs';
import { GuestAccount, GuestAccountStatus } from '../models/guest-account.model';

export abstract class GuestAccountRepository {
  abstract getAll(): Observable<GuestAccount[]>;
  abstract getById(id: string): Observable<GuestAccount>;
  abstract getByBooking(bookingId: string): Observable<GuestAccount | null>;
  abstract getByStatus(status: GuestAccountStatus): Observable<GuestAccount[]>;
  abstract getByRoom(roomNumber: string): Observable<GuestAccount[]>;
  abstract create(account: GuestAccount): Promise<string>;
  abstract update(id: string, account: Partial<GuestAccount>): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
