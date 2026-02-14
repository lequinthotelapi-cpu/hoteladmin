import { Component } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  template: `
    <form (ngSubmit)="onSubmit()">
      <input [(ngModel)]="email" type="email" placeholder="Email" required>
      <input [(ngModel)]="password" type="password" placeholder="Password" required>
      <button type="submit">Login</button>
      <button type="button" (click)="signUp()">Sign Up</button>
    </form>
  `
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private authService: AuthService, private router: Router) {}

  async onSubmit() {
    try {
      await this.authService.signIn(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Login error:', error);
    }
  }

  async signUp() {
    try {
      await this.authService.signUp(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Sign up error:', error);
    }
  }
}