import { Component, Inject, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RoomWithStatus } from '../../../../core/services/room-status.service';
import { BookingService } from '../../../../core/services/booking.service';
import { GuestAccountService } from '../../../../core/services/guest-account.service';
import { HousekeepingService } from '../../../../core/services/housekeeping.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AlertService } from '../../../../core/services/alert.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'fury-room-map-actions-dialog',
  templateUrl: './room-map-actions-dialog.component.html',
  styleUrls: ['./room-map-actions-dialog.component.scss']
})
export class RoomMapActionsDialogComponent implements AfterViewInit {
  currentUserId = '';

  constructor(
    public dialogRef: MatDialogRef<RoomMapActionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { room: RoomWithStatus, roomStatuses: any[], roomTypes: any[] },
    private cdr: ChangeDetectorRef,
    private bookingService: BookingService,
    private guestAccountService: GuestAccountService,
    private housekeepingService: HousekeepingService,
    private authService: AuthService,
    private alertService: AlertService,
    private dialog: MatDialog,
    private router: Router
  ) {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId = user.uid;
    }
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  getRoomStatusLabel(value: string): string {
    if (!this.data.roomStatuses || !value) return value || '';
    const status = this.data.roomStatuses.find(s => s.value === value);
    return status ? status.label : value;
  }

  getRoomTypeLabel(value: string): string {
    if (!this.data.roomTypes || !value) return value || '';
    const type = this.data.roomTypes.find(t => t.value === value);
    return type ? type.label : value;
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

  onAction(action: string): void {
    switch (action) {
      case 'check-in':
        this.checkInRoom();
        break;
      case 'check-out':
        this.checkOutRoom();
        break;
      case 'view-account':
        this.viewRoomAccount();
        break;
      case 'complete-cleaning':
        this.completeRoomTask();
        break;
      case 'create-task':
        this.createTaskForRoom();
        break;
      case 'edit-room':
        this.editRoom();
        break;
    }
  }

  editRoom(): void {
    import('../room-create-update/room-create-update.component')
      .then(m => {
        const dialogRef = this.dialog.open(m.RoomCreateUpdateComponent, {
          width: '900px',
          data: { mode: 'edit', room: this.data.room }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.dialogRef.close('refresh');
          }
        });
      });
  }

  createTaskForRoom(): void {
    import('../../housekeeping/task-create-update/task-create-update.component')
      .then(m => {
        const dialogRef = this.dialog.open(m.TaskCreateUpdateComponent, {
          width: '600px',
          data: { 
            task: null,
            prefilledRoom: { id: this.data.room.id, roomNumber: this.data.room.roomNumber, floor: this.data.room.floor }
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.alertService.success('Tarea creada exitosamente');
            this.dialogRef.close('refresh');
          }
        });
      })
      .catch(err => {
        this.alertService.error('Error al abrir formulario de tarea');
      });
  }

  async checkInRoom(): Promise<void> {
    const bookings = await firstValueFrom(this.bookingService.getBookingsByRoom(this.data.room.id!));
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
            this.dialogRef.close('refresh');
          }
        });
      });
  }

  async checkOutRoom(): Promise<void> {
    const bookings = await firstValueFrom(this.bookingService.getBookingsByRoom(this.data.room.id!));
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
            this.dialogRef.close('refresh');
          }
        });
      });
  }

  async viewRoomAccount(): Promise<void> {
    const accounts = await firstValueFrom(this.guestAccountService.getOpenAccounts());
    const account = accounts.find(a => a.roomId === this.data.room.id);

    if (!account) {
      this.alertService.warning('Sin Cuenta', 'No hay cuenta activa para esta habitación');
      return;
    }

    this.dialogRef.close();
    this.router.navigate(['/guest-accounts', account.id]);
  }

  async completeRoomTask(): Promise<void> {
    try {
      const tasks = await firstValueFrom(this.housekeepingService.getByRoom(this.data.room.id!));
      const activeTask = tasks.find(t => t.status === 'in-progress' || t.status === 'pending');

      if (!activeTask) {
        this.alertService.warning('Sin Tarea', 'No hay tarea activa para esta habitación');
        return;
      }

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
        this.dialogRef.close('refresh');
      }
    } catch (error: any) {
      this.alertService.error(error.message || 'Error al completar limpieza');
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
