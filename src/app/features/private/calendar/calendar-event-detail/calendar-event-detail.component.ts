import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Booking } from '../../../../domain/models/booking.model';
import { BookingService } from '../../../../core/services/booking.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { BookingCreateUpdateComponent } from '../../bookings/booking-create-update/booking-create-update.component';

@Component({
  selector: 'fury-calendar-event-detail',
  templateUrl: './calendar-event-detail.component.html',
  styleUrls: ['./calendar-event-detail.component.scss']
})
export class CalendarEventDetailComponent {
  booking: Booking;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { booking: Booking },
    private dialogRef: MatDialogRef<CalendarEventDetailComponent>,
    private dialog: MatDialog,
    private bookingService: BookingService,
    private alertService: AlertService,
    private authService: AuthService
  ) {
    this.booking = data.booking;
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'pending': 'Pendiente',
      'confirmed': 'Confirmada',
      'checked-in': 'Check-in',
      'checked-out': 'Check-out',
      'cancelled': 'Cancelada',
      'no-show': 'No Show'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: any = {
      'pending': '#fbbf24',
      'confirmed': '#3b82f6',
      'checked-in': '#10b981',
      'checked-out': '#6b7280',
      'cancelled': '#ef4444',
      'no-show': '#f97316'
    };
    return colors[status] || '#6b7280';
  }

  async confirmBooking(): Promise<void> {
    try {
      const userId = this.authService.getCurrentUser()?.uid || '';
      await this.bookingService.confirmBooking(this.booking.id!, userId);
      this.alertService.success('Reserva confirmada');
      this.dialogRef.close(true);
    } catch (error: any) {
      this.alertService.error('Error', error.message);
    }
  }

  async cancelBooking(): Promise<void> {
    try {
      const userId = this.authService.getCurrentUser()?.uid || '';
      await this.bookingService.cancelBooking(this.booking.id!, userId);
      this.alertService.success('Reserva cancelada');
      this.dialogRef.close(true);
    } catch (error: any) {
      this.alertService.error('Error', error.message);
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
