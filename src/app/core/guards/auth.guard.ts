import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService, 
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  canActivate() {
    return this.authService.user$.pipe(
      map(user => {
        if (user) {
          return true;
        } else {
          this.snackBar.open('Debes iniciar sesión para acceder', 'OK', { duration: 3000 });
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}