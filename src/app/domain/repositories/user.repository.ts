import { User, UserRole } from '../models/user.model';
import { BaseRepository } from './base.repository';
import { Observable } from 'rxjs';

/**
 * User Repository
 * Contract for user data operations
 */
export abstract class UserRepository extends BaseRepository<User> {
  abstract getUsersByRole(role: UserRole): Observable<User[]>;
  abstract getByRole(role: string): Observable<User[]>;
  abstract getActiveUsers(): Observable<User[]>;
}