import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Booking } from '../../../../domain/models/booking.model';
import { BookingService } from '../../../../core/services/booking.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
  selector: 'fury-check-out-dialog',
  templateUrl: './check-out-dialog.component.html',
  styleUrls: ['./check-out-dialog.component.scss']
})
export class CheckOutDialogComponent {
  booking: Booking;
  loading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { booking: Booking },
    private dialogRef: MatDialogRef<CheckOutDialogComponent>,
    private bookingService: BookingService,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.booking = data.booking;
  }

  async confirmCheckOut(): Promise<void> {
    this.loading = true;
    try {
      const userId = this.authService.getCurrentUser()?.uid || '';
      await this.bookingService.checkOut(this.booking.id!, userId);
      this.alertService.success('Check-out realizado exitosamente');
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
