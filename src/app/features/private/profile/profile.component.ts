import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../domain/models/user.model';

@Component({
  selector: 'fury-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: User | null = null;

  constructor(private authService: AuthService) {}

  async ngOnInit() {
    const firebaseUser = this.authService.getCurrentUser();
    if (firebaseUser) {
      this.user = await this.authService.getUserData(firebaseUser.uid);
    }
  }

  getRoleLabel(role: string): string {
    const roles: { [key: string]: string } = {
      'superadmin': 'Super Administrador',
      'admin': 'Administrador',
      'receptionist': 'Recepcionista',
      'housekeeper': 'Camarera',
      'manager': 'Gerente'
    };
    return roles[role] || role;
  }

  getSessionsCount(): number {
    return this.user?.activeSessionsCount || 0;
  }

  getYearsWorking(): number {
    if (!this.user?.createdAt) return 0;
    const created = this.user.createdAt instanceof Date 
      ? this.user.createdAt 
      : new Date(this.user.createdAt);
    const now = new Date();
    const years = now.getFullYear() - created.getFullYear();
    return years > 0 ? years : 0;
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  getCreatedAtDate(): Date | null {
    if (!this.user?.createdAt) return null;
    return this.user.createdAt instanceof Date 
      ? this.user.createdAt 
      : new Date(this.user.createdAt);
  }

  async resetAllSessions() {
    if (!this.user) return;
    
    if (confirm('¿Estás seguro de que deseas cerrar todas las sesiones activas? Esto te desconectará de todos los dispositivos.')) {
      try {
        await this.authService.resetUserSessions(this.user.uid);
        alert('Todas las sesiones han sido cerradas. Por favor, inicia sesión nuevamente.');
        await this.authService.signOut();
        window.location.href = '/login';
      } catch (error) {
        console.error('Error al resetear sesiones:', error);
        alert('Error al cerrar las sesiones. Intenta nuevamente.');
      }
    }
  }
}
