import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PermissionService } from '../../../core/services/permission.service';
import { RolePermission } from '../../../domain/models/role-permission.model';

@Component({
  selector: 'fury-permissions',
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss']
})
export class PermissionsComponent implements OnInit {
  roles: RolePermission[] = [];
  selectedRole: RolePermission | null = null;
  loading = false;

  availableRoutes = [
    { path: '/dashboard', label: 'Dashboard', group: 'OPERACIONES' },
    { path: '/front-desk', label: 'Recepción', group: 'OPERACIONES' },
    { path: '/rooms', label: 'Habitaciones', group: 'OPERACIONES' },
    { path: '/bookings', label: 'Reservas', group: 'OPERACIONES' },
    { path: '/calendar', label: 'Calendario', group: 'OPERACIONES' },
    { path: '/housekeeping', label: 'Housekeeping', group: 'OPERACIONES' },
    { path: '/guest-accounts', label: 'Cuentas', group: 'FINANZAS' },
    { path: '/pos', label: 'POS', group: 'FINANZAS' },
    { path: '/cash-register', label: 'Caja', group: 'FINANZAS' },
    { path: '/transactions', label: 'Movimientos', group: 'FINANZAS' },
    { path: '/invoices', label: 'Facturas', group: 'FINANZAS' },
    { path: '/reports', label: 'Reportes', group: 'FINANZAS' },
    { path: '/products', label: 'Productos', group: 'INVENTARIO' },
    { path: '/inventory', label: 'Inventario', group: 'INVENTARIO' },
    { path: '/guests', label: 'Huéspedes', group: 'ADMINISTRACIÓN' },
    { path: '/employees', label: 'Empleados', group: 'ADMINISTRACIÓN' },
    { path: '/users', label: 'Usuarios', group: 'ADMINISTRACIÓN' },
    { path: '/parameters', label: 'Parámetros', group: 'ADMINISTRACIÓN' },
    { path: '/notifications', label: 'Notificaciones', group: 'ADMINISTRACIÓN' }
  ];

  routesByGroup: { [key: string]: any[] } = {};

  constructor(
    private permissionService: PermissionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.groupRoutes();
    this.loadRoles();
  }

  groupRoutes() {
    this.availableRoutes.forEach(route => {
      if (!this.routesByGroup[route.group]) {
        this.routesByGroup[route.group] = [];
      }
      this.routesByGroup[route.group].push(route);
    });
  }

  loadRoles() {
    this.loading = true;
    this.permissionService.getAllRolePermissions().subscribe({
      next: (roles) => {
        this.roles = roles;
        if (roles.length > 0) {
          this.selectRole(roles[0]);
        }
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar roles', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  selectRole(role: RolePermission) {
    this.selectedRole = { ...role };
  }

  isRouteEnabled(path: string): boolean {
    if (!this.selectedRole) return false;
    return this.selectedRole.routes.includes('*') || this.selectedRole.routes.includes(path);
  }

  toggleRoute(path: string) {
    if (!this.selectedRole || this.selectedRole.role === 'superadmin') return;

    const index = this.selectedRole.routes.indexOf(path);
    if (index > -1) {
      this.selectedRole.routes.splice(index, 1);
    } else {
      this.selectedRole.routes.push(path);
    }
  }

  async saveChanges() {
    if (!this.selectedRole) return;

    this.loading = true;
    try {
      await this.permissionService.updateRolePermissions(
        this.selectedRole.role,
        this.selectedRole.routes
      );
      this.snackBar.open('Permisos actualizados correctamente', 'Cerrar', { duration: 3000 });
      this.loadRoles();
    } catch (error) {
      this.snackBar.open('Error al actualizar permisos', 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  getGroupKeys(): string[] {
    return Object.keys(this.routesByGroup);
  }
}
