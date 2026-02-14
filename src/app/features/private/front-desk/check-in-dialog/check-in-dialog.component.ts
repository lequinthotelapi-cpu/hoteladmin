import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Booking } from '../../../../domain/models/booking.model';
import { BookingService } from '../../../../core/services/booking.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
  selector: 'fury-check-in-dialog',
  templateUrl: './check-in-dialog.component.html',
  styleUrls: ['./check-in-dialog.component.scss']
})
export class CheckInDialogComponent {
  booking: Booking;
  loading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { booking: Booking },
    private dialogRef: MatDialogRef<CheckInDialogComponent>,
    private bookingService: BookingService,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.booking = data.booking;
  }

  async confirmCheckIn(): Promise<void> {
    this.loading = true;
    try {
      const userId = this.authService.getCurrentUser()?.uid || '';
      await this.bookingService.checkIn(this.booking.id!, userId);
      this.alertService.success('Check-in realizado exitosamente');
      this.dialogRef.close(true);
    } catch (error: any) {
      this.alertService.error('Error', error.message);
    } finally {
      this.loading = false;
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
