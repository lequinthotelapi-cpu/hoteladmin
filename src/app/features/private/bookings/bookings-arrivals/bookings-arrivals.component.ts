import { Component, OnInit } from '@angular/core';
import { BookingService } from '../../../../core/services/booking.service';
import { Booking } from '../../../../domain/models/booking.model';

@Component({
  selector: 'fury-bookings-arrivals',
  template: `
    <div class="arrivals-container">
      <h3>Llegadas de Hoy ({{ arrivals.length }})</h3>
      <mat-list>
        <mat-list-item *ngFor="let booking of arrivals">
          <mat-icon matListItemIcon>flight_land</mat-icon>
          <div matListItemTitle>{{ booking.guestName }}</div>
          <div matListItemLine>Habitación {{ booking.roomNumber }} - {{ booking.checkInDate | date:'shortTime' }}</div>
        </mat-list-item>
      </mat-list>
      <p *ngIf="arrivals.length === 0" class="empty-message">No hay llegadas programadas para hoy</p>
    </div>
  `,
  styles: [`
    .arrivals-container {
      padding: 20px;
    }
    .empty-message {
      text-align: center;
      color: #666;
      padding: 40px;
    }
  `]
})
export class BookingsArrivalsComponent implements OnInit {
  arrivals: Booking[] = [];

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.bookingService.getArrivalsForToday().subscribe(bookings => {
      this.arrivals = bookings;
    });
  }
}
