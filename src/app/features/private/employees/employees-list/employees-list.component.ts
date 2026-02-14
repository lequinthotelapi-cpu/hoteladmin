import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../../../../domain/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { AlertService } from '../../../../core/services/alert.service';
import { EmployeeCreateUpdateComponent } from '../employee-create-update/employee-create-update.component';
import { ListColumn } from '../../../../../@fury/shared/list/list-column.model';

@Component({
  selector: 'fury-employees-list',
  templateUrl: './employees-list.component.html',
  styleUrls: ['./employees-list.component.scss']
})
export class EmployeesListComponent implements OnInit, AfterViewInit {
  employees$: Observable<User[]>;
  dataSource: MatTableDataSource<User> = new MatTableDataSource();

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  columns: ListColumn[] = [
    { name: 'Nombre', property: 'firstName', visible: true, isModelProperty: true },
    { name: 'Email', property: 'email', visible: true, isModelProperty: true },
    { name: 'Cargo', property: 'position', visible: true, isModelProperty: true },
    { name: 'Departamento', property: 'department', visible: true, isModelProperty: true },
    { name: 'Rol', property: 'role', visible: true, isModelProperty: true },
    { name: 'Estado', property: 'active', visible: true, isModelProperty: true },
    { name: 'Acciones', property: 'actions', visible: true, isModelProperty: false }
  ] as ListColumn[];

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private alertService: AlertService
  ) {}

  get visibleColumns() {
    return this.columns.filter(column => column.visible).map(column => column.property);
  }

  ngOnInit() {
    this.loadEmployees();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadEmployees() {
    this.employees$ = this.userService.getAllUsers().pipe(
      map(users => users.filter(user => 
        ['manager', 'receptionist', 'housekeeper'].includes(user.role)
      ))
    );
    this.employees$.subscribe(employees => {
      this.dataSource.data = employees;
    });
  }

  onFilterChange(value: string) {
    if (!this.dataSource) {
      return;
    }
    value = value.trim();
    value = value.toLowerCase();
    this.dataSource.filter = value;
  }

  createEmployee() {
    this.dialog.open(EmployeeCreateUpdateComponent, {
      width: '800px'
    }).afterClosed().subscribe((employee: User) => {
      if (employee) {
        this.loadEmployees();
        this.alertService.success('Empleado creado exitosamente');
      }
    });
  }

  updateEmployee(employee: User) {
    this.dialog.open(EmployeeCreateUpdateComponent, {
      width: '800px',
      data: employee
    }).afterClosed().subscribe((updatedEmployee: User) => {
      if (updatedEmployee) {
        this.loadEmployees();
        this.alertService.success('Empleado actualizado exitosamente');
      }
    });
  }

  async deleteEmployee(employee: User) {
    const confirmed = await this.alertService.confirmDelete(
      'Eliminar Empleado',
      `¿Está seguro de eliminar al empleado "${employee.firstName} ${employee.lastName}"?`
    );
    
    if (confirmed) {
      try {
        await this.userService.deleteUser(employee.uid);
        this.loadEmployees();
        this.alertService.success('Empleado eliminado exitosamente');
      } catch (error: any) {
        this.alertService.error(error.message || 'Error al eliminar el empleado');
      }
    }
  }

  getRoleLabel(role: string): string {
    const roles: any = {
      'manager': 'Gerente',
      'receptionist': 'Recepcionista',
      'housekeeper': 'Camarera'
    };
    return roles[role] || role;
  }

  getRoleColor(role: string): string {
    const colors: any = {
      'manager': 'primary',
      'receptionist': 'accent',
      'housekeeper': 'warn'
    };
    return colors[role] || '';
  }
}
