import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'fury-toolbar-user',
  templateUrl: './toolbar-user.component.html',
  styleUrls: ['./toolbar-user.component.scss']
})
export class ToolbarUserComponent implements OnInit {

  isOpen: boolean;
  userData: any = null;

  constructor(
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authService.user$.subscribe(async firebaseUser => {
      if (firebaseUser) {
        this.userData = await this.authService.getUserData(firebaseUser.uid);
      }
    });
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  onClickOutside() {
    this.isOpen = false;
  }

  async logout() {
    try {
      await this.authService.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      window.location.href = '/login';
    }
  }

}
