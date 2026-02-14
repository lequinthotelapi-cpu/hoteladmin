import { Component, OnInit } from '@angular/core';
import { BookingService } from '../../../../core/services/booking.service';
import { Booking } from '../../../../domain/models/booking.model';

@Component({
  selector: 'fury-in-house-list',
  templateUrl: './in-house-list.component.html',
  styleUrls: ['./in-house-list.component.scss']
})
export class InHouseListComponent implements OnInit {
  inHouseGuests: Booking[] = [];
  loading = false;

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.loadInHouseGuests();
  }

  loadInHouseGuests(): void {
    this.loading = true;
    this.bookingService.getBookingsByStatus('checked-in').subscribe(bookings => {
      this.inHouseGuests = bookings;
      this.loading = false;
    });
  }
}
