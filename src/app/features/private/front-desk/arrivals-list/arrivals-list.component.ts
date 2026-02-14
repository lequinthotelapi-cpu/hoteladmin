import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BookingService } from '../../../../core/services/booking.service';
import { Booking } from '../../../../domain/models/booking.model';
import { CheckInDialogComponent } from '../check-in-dialog/check-in-dialog.component';

@Component({
  selector: 'fury-arrivals-list',
  templateUrl: './arrivals-list.component.html',
  styleUrls: ['./arrivals-list.component.scss']
})
export class ArrivalsListComponent implements OnInit {
  arrivals: Booking[] = [];
  loading = false;

  constructor(
    private bookingService: BookingService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadArrivals();
  }

  loadArrivals(): void {
    this.loading = true;
    this.bookingService.getArrivalsForToday().subscribe(arrivals => {
      this.arrivals = arrivals;
      this.loading = false;
    });
  }

  openCheckIn(booking: Booking): void {
    const dialogRef = this.dialog.open(CheckInDialogComponent, {
      width: '600px',
      data: { booking }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadArrivals();
      }
    });
  }
}
