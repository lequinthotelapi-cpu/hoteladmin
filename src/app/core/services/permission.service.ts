import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { RolePermission, DEFAULT_ROLE_PERMISSIONS } from '../../domain/models/role-permission.model';
import { RolePermissionRepository } from '../../domain/repositories/role-permission.repository';
import { AuthService } from './auth.service';
import { User } from '../../domain/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  constructor(
    private repository: RolePermissionRepository,
    private authService: AuthService
  ) {}

  async initializeDefaultPermissions(): Promise<void> {
    const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS);
    
    for (const role of roles) {
      try {
        const exists = await new Promise<boolean>((resolve) => {
          this.repository.getByRole(role).subscribe({
            next: (permission) => resolve(permission !== null),
            error: () => resolve(false)
          });
        });

        if (!exists) {
          await this.repository.create(DEFAULT_ROLE_PERMISSIONS[role]);
        }
      } catch (error) {
        console.error(`Error initializing permissions for role ${role}:`, error);
      }
    }
  }

  hasRouteAccess(route: string): Observable<boolean> {
    const firebaseUser = this.authService.getCurrentUser();
    if (!firebaseUser) return of(false);

    // Obtener datos completos del usuario desde Firestore
    return from(this.authService.getUserData(firebaseUser.uid)).pipe(
      switchMap((userData: User | null) => {
        if (!userData) return of(false);
        
        // Superadmin siempre tiene acceso
        if (userData.role === 'superadmin') return of(true);

        return this.repository.getByRole(userData.role).pipe(
          map(permission => {
            if (!permission) return false;
            
            // Si tiene acceso a todas las rutas
            if (permission.routes.includes('*')) return true;
            
            // Verificar si la ruta está en la lista
            return permission.routes.some(allowedRoute => 
              route.startsWith(allowedRoute)
            );
          }),
          catchError(() => of(false))
        );
      }),
      catchError(() => of(false))
    );
  }

  getRolePermissions(role: string): Observable<RolePermission | null> {
    return this.repository.getByRole(role);
  }

  getAllRolePermissions(): Observable<RolePermission[]> {
    return this.repository.getAll();
  }

  async updateRolePermissions(role: string, routes: string[]): Promise<void> {
    await this.repository.update(role, { routes });
  }
}
