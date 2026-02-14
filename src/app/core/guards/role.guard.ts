import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserRole } from '../models/user-role.enum';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private userRepository: UserRepository,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const requiredRoles = route.data['roles'] as UserRole[];

    return this.authService.user$.pipe(
      take(1),
      map(firebaseUser => {
        if (!firebaseUser) {
          this.router.navigate(['/login']);
          return false;
        }

        // Get user data from Firestore to check role
        this.userRepository.getById(firebaseUser.uid).pipe(
          take(1)
        ).subscribe(user => {
          if (!user || !requiredRoles.includes(user.role as UserRole)) {
            this.router.navigate(['/unauthorized']);
            return false;
          }
        });

        return true;
      })
    );
  }
}
