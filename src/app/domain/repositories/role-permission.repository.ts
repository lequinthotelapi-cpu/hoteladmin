import { Observable } from 'rxjs';
import { RolePermission } from '../models/role-permission.model';

export abstract class RolePermissionRepository {
  abstract getByRole(role: string): Observable<RolePermission | null>;
  abstract getAll(): Observable<RolePermission[]>;
  abstract create(permission: RolePermission): Promise<void>;
  abstract update(role: string, permission: Partial<RolePermission>): Promise<void>;
}
