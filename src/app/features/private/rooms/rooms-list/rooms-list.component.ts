import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Room } from '../../../../domain/models/room.model';
import { RoomService } from '../../../../core/services/room.service';
import { BookingService } from '../../../../core/services/booking.service';
import { GuestAccountService } from '../../../../core/services/guest-account.service';
import { HousekeepingService } from '../../../../core/services/housekeeping.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { RoomCreateUpdateComponent } from '../room-create-update/room-create-update.component';
import { ListColumn } from '../../../../../@fury/shared/list/list-column.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'fury-rooms-list',
  templateUrl: './rooms-list.component.html',
  styleUrls: ['./rooms-list.component.scss']
})
export class RoomsListComponent implements OnInit, AfterViewInit {
  columns: ListColumn[] = [
    { name: 'Número', property: 'roomNumber', visible: true },
    { name: 'Piso', property: 'floor', visible: true },
    { name: 'Tipo', property: 'roomType', visible: true },
    { name: 'Cama', property: 'bedType', visible: true },
    { name: 'Capacidad', property: 'capacity', visible: true },
    { name: 'Estado', property: 'status', visible: true },
    { name: 'Precio', property: 'basePrice', visible: true },
    { name: 'Activo', property: 'isActive', visible: true },
    { name: 'Acciones', property: 'actions', visible: true }
  ];
  dataSource: MatTableDataSource<Room>;
  
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  roomTypes: any[] = [];
  bedTypes: any[] = [];
  roomStatuses: any[] = [];

  constructor(
    private roomService: RoomService,
    private bookingService: BookingService,
    private guestAccountService: GuestAccountService,
    private housekeepingService: HousekeepingService,
    private parametersService: ParametersService,
    private alertService: AlertService,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.dataSource = new MatTableDataSource<Room>([]);
  }

  get visibleColumns() {
    return this.columns.filter(column => column.visible).map(column => column.property);
  }

  ngOnInit(): void {
    this.loadParameters();
    this.loadRooms();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadParameters(): void {
    this.roomTypes = this.parametersService.getOptions('roomTypes');
    this.bedTypes = this.parametersService.getOptions('bedTypes');
    this.roomStatuses = this.parametersService.getOptions('roomStatuses');
  }

  loadRooms(): void {
    this.roomService.getAllRooms().subscribe({
      next: (rooms) => {
        this.dataSource.data = rooms;
      },
      error: (error) => {
        this.alertService.error('Error al cargar habitaciones', error.message);
      }
    });
  }

  onFilterChange(value: string): void {
    if (!this.dataSource) {
      return;
    }
    value = value.trim().toLowerCase();
    this.dataSource.filter = value;
  }

  createRoom(): void {
    const dialogRef = this.dialog.open(RoomCreateUpdateComponent, {
      width: '900px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRooms();
      }
    });
  }

  editRoom(room: Room): void {
    const dialogRef = this.dialog.open(RoomCreateUpdateComponent, {
      width: '900px',
      data: { mode: 'edit', room }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRooms();
      }
    });
  }

  async deleteRoom(room: Room): Promise<void> {
    const confirmed = await this.alertService.confirmDelete(
      `¿Eliminar habitación?`,
      `¿Está seguro de eliminar la habitación ${room.roomNumber}? Esta acción no se puede deshacer.`
    );

    if (confirmed) {
      try {
        await this.roomService.deleteRoom(room.id);
        this.alertService.success('Habitación eliminada', 'La habitación ha sido eliminada correctamente');
        this.loadRooms();
      } catch (error: any) {
        this.alertService.error('Error al eliminar habitación', error.message);
      }
    }
  }

  getRoomTypeLabel(value: string): string {
    const type = this.roomTypes.find(t => t.value === value);
    return type ? type.label : value;
  }

  getBedTypeLabel(value: string): string {
    const type = this.bedTypes.find(t => t.value === value);
    return type ? type.label : value;
  }

  getRoomStatusLabel(value: string): string {
    const status = this.roomStatuses.find(s => s.value === value);
    return status ? status.label : value;
  }

  getStatusBadgeClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'available': 'badge-success',
      'reserved': 'badge-info',
      'occupied': 'badge-danger',
      'dirty': 'badge-warning',
      'cleaning': 'badge-primary',
      'maintenance': 'badge-secondary'
    };
    return statusMap[status] || 'badge-secondary';
  }

  createTaskForRoom(room: Room): void {
    // Importar dinámicamente el componente de housekeeping
    import('../../housekeeping/task-create-update/task-create-update.component')
      .then(m => {
        const dialogRef = this.dialog.open(m.TaskCreateUpdateComponent, {
          width: '600px',
          data: { 
            task: null,
            prefilledRoom: { id: room.id, roomNumber: room.roomNumber, floor: room.floor }
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.alertService.success('Tarea creada exitosamente');
          }
        });
      })
      .catch(err => {
        this.alertService.error('Error al abrir formulario de tarea');
      });
  }

  async checkInRoom(room: Room): Promise<void> {
    const bookings = await firstValueFrom(this.bookingService.getBookingsByRoom(room.id!));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const confirmedBooking = bookings.find(b => {
      const checkIn = new Date(b.checkInDate);
      checkIn.setHours(0, 0, 0, 0);
      return b.status === 'confirmed' && checkIn.getTime() === today.getTime();
    });

    if (!confirmedBooking) {
      this.alertService.warning('Sin Reserva', 'No hay reserva confirmada para hoy en esta habitación');
      return;
    }

    import('../../front-desk/check-in-dialog/check-in-dialog.component')
      .then(m => {
        const dialogRef = this.dialog.open(m.CheckInDialogComponent, {
          width: '600px',
          data: { booking: confirmedBooking }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.loadRooms();
          }
        });
      });
  }

  async checkOutRoom(room: Room): Promise<void> {
    const bookings = await firstValueFrom(this.bookingService.getBookingsByRoom(room.id!));
    const checkedInBooking = bookings.find(b => b.status === 'checked-in');

    if (!checkedInBooking) {
      this.alertService.warning('Sin Huésped', 'No hay huésped activo en esta habitación');
      return;
    }

    import('../../front-desk/check-out-dialog/check-out-dialog.component')
      .then(m => {
        const dialogRef = this.dialog.open(m.CheckOutDialogComponent, {
          width: '600px',
          data: { booking: checkedInBooking }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.loadRooms();
          }
        });
      });
  }

  async viewRoomAccount(room: Room): Promise<void> {
    const accounts = await firstValueFrom(this.guestAccountService.getOpenAccounts());
    const account = accounts.find(a => a.roomId === room.id);

    if (!account) {
      this.alertService.warning('Sin Cuenta', 'No hay cuenta activa para esta habitación');
      return;
    }

    this.router.navigate(['/guest-accounts', account.id]);
  }

  async completeRoomTask(room: Room): Promise<void> {
    const tasks = await firstValueFrom(this.housekeepingService.getByRoom(room.id!));
    const activeTask = tasks.find(t => t.status === 'in-progress' || t.status === 'pending');

    if (!activeTask) {
      this.alertService.warning('Sin Tarea', 'No hay tarea activa para esta habitación');
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user) return;

    // Si está pendiente, validar asignación e iniciarla primero
    if (activeTask.status === 'pending') {
      if (!activeTask.assignedTo) {
        this.alertService.error('La tarea debe estar asignada a un empleado');
        return;
      }
      try {
        await this.housekeepingService.startTask(activeTask.id!, user.uid);
      } catch (error: any) {
        this.alertService.error(error.message);
        return;
      }
    }

    const Swal = (await import('sweetalert2')).default;
    
    const { value: formValues } = await Swal.fire({
      title: 'Completar Limpieza',
      html:
        '<label>Duración Real (minutos)</label>' +
        '<input id="duration" type="number" class="swal2-input" placeholder="30" min="1">' +
        '<label>Notas</label>' +
        '<textarea id="notes" class="swal2-textarea" placeholder="Notas opcionales"></textarea>' +
        '<label><input id="maintenance" type="checkbox"> Requiere mantenimiento</label>' +
        '<textarea id="maintenanceNotes" class="swal2-textarea" placeholder="Notas de mantenimiento" style="display:none"></textarea>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Completar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const maintenanceCheckbox = document.getElementById('maintenance') as HTMLInputElement;
        const maintenanceNotes = document.getElementById('maintenanceNotes') as HTMLTextAreaElement;
        maintenanceCheckbox?.addEventListener('change', () => {
          if (maintenanceNotes) {
            maintenanceNotes.style.display = maintenanceCheckbox.checked ? 'block' : 'none';
          }
        });
      },
      preConfirm: () => {
        const duration = (document.getElementById('duration') as HTMLInputElement).value;
        const notes = (document.getElementById('notes') as HTMLTextAreaElement).value;
        const maintenance = (document.getElementById('maintenance') as HTMLInputElement).checked;
        const maintenanceNotes = (document.getElementById('maintenanceNotes') as HTMLTextAreaElement).value;
        
        if (!duration || parseInt(duration) <= 0) {
          Swal.showValidationMessage('La duración debe ser mayor a 0');
          return false;
        }
        
        return { duration: parseInt(duration), notes, maintenance, maintenanceNotes };
      }
    });

    if (formValues) {
      try {
        await this.housekeepingService.completeTask(
          activeTask.id!,
          {
            completedAt: new Date(),
            actualDuration: formValues.duration,
            completionNotes: formValues.notes,
            requiresMaintenance: formValues.maintenance,
            maintenanceNotes: formValues.maintenanceNotes,
            issuesFound: []
          },
          user.uid
        );
        this.alertService.success('Limpieza completada');
      } catch (error: any) {
        this.alertService.error(error.message || 'Error al completar limpieza');
      }
    }
  }
}
