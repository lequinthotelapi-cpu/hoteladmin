import { Component, HostBinding, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { SidenavItem } from './sidenav-item/sidenav-item.interface';
import { SidenavService } from './sidenav.service';
import { ThemeService } from '../../../@fury/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';

@Component({
  selector: 'fury-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit, OnDestroy {

  sidenavUserVisible$ = this.themeService.config$.pipe(map(config => config.sidenavUserVisible));
  currentUser$ = this.authService.user$.pipe(
    map(firebaseUser => {
      if (!firebaseUser) return null;
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL || 'assets/img/avatars/default.jpg'
      };
    })
  );
  userData: any = null;

  @Input()
  @HostBinding('class.collapsed')
  collapsed: boolean;

  @Input()
  @HostBinding('class.expanded')
  expanded: boolean;

  items$: Observable<SidenavItem[]>;
  @Input() configpanel: any;

  constructor(
    private router: Router,
    private sidenavService: SidenavService,
    private themeService: ThemeService,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {}

  ngOnInit() {
    this.items$ = this.sidenavService.items$.pipe(
      map((items: SidenavItem[]) => this.sidenavService.sortRecursive(items, 'position'))
    );

    this.authService.user$.subscribe(async firebaseUser => {
      if (firebaseUser) {
        this.userData = await this.authService.getUserData(firebaseUser.uid);
      }
    });
  }

  toggleCollapsed() {
    this.sidenavService.toggleCollapsed();
  }

  @HostListener('mouseenter')
  @HostListener('touchenter')
  onMouseEnter() {
    this.sidenavService.setExpanded(true);
  }

  @HostListener('mouseleave')
  @HostListener('touchleave')
  onMouseLeave() {
    this.sidenavService.setExpanded(false);
  }

  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.router.navigate(['/login']);
    }
  }

  getRoleLabel(role: string): string {
    const roles: { [key: string]: string } = {
      'superadmin': 'Super Administrador',
      'admin': 'Administrador',
      'receptionist': 'Recepcionista',
      'housekeeper': 'Camarera',
      'manager': 'Gerente',
      'guest': 'Invitado'
    };
    return roles[role] || role;
  }

  hasAccess(route: string): Observable<boolean> {
    // Superadmin siempre tiene acceso
    if (this.userData?.role === 'superadmin') {
      return of(true);
    }
    return this.permissionService.hasRouteAccess(route);
  }

  openConfigPanel() {
    if (this.configpanel) {
      this.configpanel.open();
    }
  }

  ngOnDestroy() {
  }
}
