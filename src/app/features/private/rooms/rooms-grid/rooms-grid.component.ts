import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Room } from '../../../../domain/models/room.model';
import { RoomService } from '../../../../core/services/room.service';
import { BookingService } from '../../../../core/services/booking.service';
import { GuestAccountService } from '../../../../core/services/guest-account.service';
import { HousekeepingService } from '../../../../core/services/housekeeping.service';
import { AuthService } from '../../../../core/services/auth.service';
import { RoomStatusService, RoomWithStatus } from '../../../../core/services/room-status.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { AlertService } from '../../../../core/services/alert.service';
import { RoomCreateUpdateComponent } from '../room-create-update/room-create-update.component';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'fury-rooms-grid',
  templateUrl: './rooms-grid.component.html',
  styleUrls: ['./rooms-grid.component.scss']
})
export class RoomsGridComponent implements OnInit, OnDestroy {
  rooms: RoomWithStatus[] = [];
  floors: number[] = [];
  selectedFloor: number = 1;
  roomTypes: any[] = [];
  roomStatuses: any[] = [];
  amenities: any[] = [];
  currentUserId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private roomService: RoomService,
    private bookingService: BookingService,
    private guestAccountService: GuestAccountService,
    private housekeepingService: HousekeepingService,
    private authService: AuthService,
    private roomStatusService: RoomStatusService,
    private parametersService: ParametersService,
    private alertService: AlertService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId = user.uid;
    }
    this.loadParameters();
    this.loadRooms();
  }

  loadParameters(): void {
    this.roomTypes = this.parametersService.getOptions('roomTypes');
    this.roomStatuses = this.parametersService.getOptions('roomStatuses');
    this.amenities = this.parametersService.getOptions('amenities');
  }

  loadRooms(): void {
    const rooms$ = this.roomService.getAllRooms();
    const bookings$ = this.bookingService.getAllBookings();
    
    this.roomStatusService.getRoomsWithStatus(rooms$, bookings$)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rooms) => {
          this.rooms = rooms;
          this.extractFloors();
          if (this.floors.length > 0 && !this.floors.includes(this.selectedFloor)) {
            this.selectedFloor = this.floors[0];
          }
        },
        error: (error) => {
          this.alertService.error('Error al cargar habitaciones', error.message);
        }
      });
  }

  extractFloors(): void {
    const floorSet = new Set(this.rooms.map(room => room.floor));
    this.floors = Array.from(floorSet).sort((a, b) => a - b);
  }

  getRoomsByFloor(floor: number): RoomWithStatus[] {
    return this.rooms.filter(room => room.floor === floor).sort((a, b) => {
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    });
  }

  createRoom(): void {
    const dialogRef = this.dialog.open(RoomCreateUpdateComponent, {
      width: '900px',
      data: { mode: 'create', defaultFloor: this.selectedFloor }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRooms();
      }
    });
  }

  editRoom(room: RoomWithStatus): void {
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

  getRoomTypeLabel(value: string): string {
    const type = this.roomTypes.find(t => t.value === value);
    return type ? type.label : value;
  }

  getRoomStatusLabel(value: string): string {
    const status = this.roomStatuses.find(s => s.value === value);
    return status ? status.label : value;
  }

  getAmenityLabel(value: string): string {
    const amenity = this.amenities.find(a => a.value === value);
    return amenity ? amenity.label : value;
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'available': '#10b981',
      'reserved': '#8b5cf6',
      'occupied': '#ef4444',
      'dirty': '#f59e0b',
      'cleaning': '#3b82f6',
      'maintenance': '#6366f1'
    };
    return colorMap[status] || '#6366f1';
  }

  getStatusLightColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'available': '#d1fae5',
      'reserved': '#ede9fe',
      'occupied': '#fee2e2',
      'dirty': '#fef3c7',
      'cleaning': '#dbeafe',
      'maintenance': '#e0e7ff'
    };
    return colorMap[status] || '#e0e7ff';
  }

  getStatusBackgroundColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'available': 'rgba(16, 185, 129, 0.08)',
      'reserved': 'rgba(139, 92, 246, 0.08)',
      'occupied': 'rgba(239, 68, 68, 0.08)',
      'dirty': 'rgba(245, 158, 11, 0.08)',
      'cleaning': 'rgba(59, 130, 246, 0.08)',
      'maintenance': 'rgba(99, 102, 241, 0.08)'
    };
    return colorMap[status] || 'rgba(99, 102, 241, 0.08)';
  }

  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'available': 'check_circle',
      'reserved': 'event',
      'occupied': 'hotel',
      'dirty': 'warning',
      'cleaning': 'cleaning_services',
      'maintenance': 'build'
    };
    return iconMap[status] || 'info';
  }

  createTaskForRoom(room: RoomWithStatus): void {
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

  async checkInRoom(room: RoomWithStatus): Promise<void> {
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

  async checkOutRoom(room: RoomWithStatus): Promise<void> {
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

  async viewRoomAccount(room: RoomWithStatus): Promise<void> {
    const accounts = await firstValueFrom(this.guestAccountService.getOpenAccounts());
    const account = accounts.find(a => a.roomId === room.id);

    if (!account) {
      this.alertService.warning('Sin Cuenta', 'No hay cuenta activa para esta habitación');
      return;
    }

    this.router.navigate(['/guest-accounts', account.id]);
  }

  async completeRoomTask(room: RoomWithStatus): Promise<void> {
    try {
      const tasks = await firstValueFrom(this.housekeepingService.getByRoom(room.id!));
      const activeTask = tasks.find(t => t.status === 'in-progress' || t.status === 'pending');

      if (!activeTask) {
        this.alertService.warning('Sin Tarea', 'No hay tarea activa para esta habitación');
        return;
      }

      // Si la tarea está pendiente, iniciarla automáticamente primero
      if (activeTask.status === 'pending') {
        if (!activeTask.assignedTo) {
          this.alertService.error('La tarea debe estar asignada a un empleado');
          return;
        }
        try {
          await this.housekeepingService.startTask(activeTask.id!, this.currentUserId);
        } catch (startError: any) {
          this.alertService.error(startError.message || 'Error al iniciar tarea');
          return;
        }
      }

      const Swal = (await import('sweetalert2')).default;
      
      const { value: formValues } = await Swal.fire({
        title: 'Completar Limpieza',
        html:
          '<label>Duración Real (minutos)</label>' +
          '<input id="duration" type="number" class="swal2-input" placeholder="30" min="1">' +
          '<label>Notas de Completación</label>' +
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
          this.currentUserId
        );
        this.alertService.success('Limpieza completada');
      }
    } catch (error: any) {
      this.alertService.error(error.message || 'Error al completar limpieza');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
