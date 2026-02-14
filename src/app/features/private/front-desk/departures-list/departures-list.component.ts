import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BookingService } from '../../../../core/services/booking.service';
import { Booking } from '../../../../domain/models/booking.model';
import { CheckOutDialogComponent } from '../check-out-dialog/check-out-dialog.component';

@Component({
  selector: 'fury-departures-list',
  templateUrl: './departures-list.component.html',
  styleUrls: ['./departures-list.component.scss']
})
export class DeparturesListComponent implements OnInit {
  departures: Booking[] = [];
  loading = false;

  constructor(
    private bookingService: BookingService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDepartures();
  }

  loadDepartures(): void {
    this.loading = true;
    this.bookingService.getDeparturesForToday().subscribe(departures => {
      this.departures = departures;
      this.loading = false;
    });
  }

  openCheckOut(booking: Booking): void {
    const dialogRef = this.dialog.open(CheckOutDialogComponent, {
      width: '600px',
      data: { booking }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDepartures();
      }
    });
  }
}
