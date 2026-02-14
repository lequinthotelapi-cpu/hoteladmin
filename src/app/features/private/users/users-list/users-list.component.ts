import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { User } from '../../../../domain/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { AlertService } from '../../../../core/services/alert.service';
import { UserCreateUpdateComponent } from '../user-create-update/user-create-update.component';
import { ListColumn } from '../../../../../@fury/shared/list/list-column.model';

@Component({
  selector: 'fury-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit, AfterViewInit, OnDestroy {
  columns: ListColumn[] = [
    { name: 'Avatar', property: 'avatar', visible: true },
    { name: 'Nombre', property: 'name', visible: true },
    { name: 'Email', property: 'email', visible: true },
    { name: 'Rol', property: 'role', visible: true },
    { name: 'Estado', property: 'active', visible: true },
    { name: 'Sesiones', property: 'sessions', visible: true },
    { name: 'Acciones', property: 'actions', visible: true }
  ];
  pageSize = 10;
  dataSource: MatTableDataSource<User>;
  private destroy$ = new Subject<void>();
  processingUserId: string | null = null;

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private alertService: AlertService
  ) {}

  get visibleColumns() {
    return this.columns.filter(column => column.visible).map(column => column.property);
  }

  ngOnInit() {
    this.dataSource = new MatTableDataSource();
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers() {
    this.userService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.dataSource.data = users;
      });
  }

  onFilterChange(value: string) {
    if (!this.dataSource) {
      return;
    }
    value = value.trim().toLowerCase();
    this.dataSource.filter = value;
  }

  createUser() {
    this.dialog.open(UserCreateUpdateComponent, {
      width: '600px',
      data: { mode: 'create' }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.alertService.success('Usuario creado exitosamente');
      }
    });
  }

  editUser(user: User) {
    this.dialog.open(UserCreateUpdateComponent, {
      width: '600px',
      data: { mode: 'update', user }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.alertService.success('Usuario actualizado exitosamente');
      }
    });
  }

  async toggleStatus(user: User, event: any) {
    // Revertir el cambio visual inmediatamente
    event.source.checked = user.active;
    
    const newStatus = !user.active;
    const action = newStatus ? 'activar' : 'desactivar';
    
    const confirmed = await this.alertService.confirm(
      `¿Está seguro que desea ${action} a ${user.firstName} ${user.lastName}?`,
      `${action.charAt(0).toUpperCase() + action.slice(1)} usuario`,
      `Sí, ${action}`
    );
    
    if (confirmed) {
      this.processingUserId = user.uid;
      try {
        await this.userService.toggleUserStatus(user.uid, newStatus);
        this.alertService.toast(`Usuario ${newStatus ? 'activado' : 'desactivado'}`);
      } catch (error) {
        this.alertService.error('Error al cambiar estado del usuario');
      } finally {
        this.processingUserId = null;
      }
    }
  }

  async resetSessions(user: User) {
    try {
      await this.userService.resetUserSessions(user.uid);
      this.alertService.toast('Sesiones reseteadas correctamente');
    } catch (error) {
      this.alertService.error('Error al resetear sesiones');
    }
  }

  async fixSessionRoles(user: User) {
    const confirmed = await this.alertService.confirm(
      `Se actualizarán los roles de todas las sesiones activas de ${user.firstName} ${user.lastName} al rol actual: ${user.role}`,
      '¿Corregir roles de sesiones?',
      'Sí, corregir'
    );
    
    if (confirmed) {
      try {
        await this.userService.fixSessionRoles(user.uid);
        this.alertService.success('Roles de sesiones corregidos');
      } catch (error) {
        this.alertService.error('Error al corregir roles');
      }
    }
  }

  async forceLogout(user: User) {
    const confirmed = await this.alertService.confirm(
      `Se cerrarán todas las sesiones activas de ${user.firstName} ${user.lastName}`,
      '¿Forzar cierre de sesión?',
      'Sí, forzar logout'
    );
    
    if (confirmed) {
      try {
        this.alertService.loading('Cerrando sesiones...');
        await this.userService.forceLogoutUser(user.uid);
        this.alertService.close();
        this.alertService.success('Usuario desconectado forzadamente');
      } catch (error: any) {
        this.alertService.close();
        this.alertService.error(error.message || 'Error al forzar logout');
      }
    }
  }

  async deleteUser(user: User) {
    const confirmed = await this.alertService.confirmDelete(`${user.firstName} ${user.lastName}`);
    
    if (confirmed) {
      try {
        await this.userService.deleteUser(user.uid);
        this.alertService.success('Usuario eliminado correctamente');
      } catch (error) {
        this.alertService.error('Error al eliminar usuario');
      }
    }
  }

  getRoleBadgeClass(role: string): string {
    const classes: Record<string, string> = {
      'superadmin': 'badge-purple',
      'admin': 'badge-red',
      'manager': 'badge-blue',
      'receptionist': 'badge-green',
      'housekeeper': 'badge-orange',
      'guest': 'badge-gray'
    };
    return classes[role] || 'badge-gray';
  }
}
