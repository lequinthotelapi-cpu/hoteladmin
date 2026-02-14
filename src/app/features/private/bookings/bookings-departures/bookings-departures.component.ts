import { Component, OnInit } from '@angular/core';
import { BookingService } from '../../../../core/services/booking.service';
import { Booking } from '../../../../domain/models/booking.model';

@Component({
  selector: 'fury-bookings-departures',
  template: `
    <div class="departures-container">
      <h3>Salidas de Hoy ({{ departures.length }})</h3>
      <mat-list>
        <mat-list-item *ngFor="let booking of departures">
          <mat-icon matListItemIcon>flight_takeoff</mat-icon>
          <div matListItemTitle>{{ booking.guestName }}</div>
          <div matListItemLine>Habitación {{ booking.roomNumber }} - {{ booking.checkOutDate | date:'shortTime' }}</div>
        </mat-list-item>
      </mat-list>
      <p *ngIf="departures.length === 0" class="empty-message">No hay salidas programadas para hoy</p>
    </div>
  `,
  styles: [`
    .departures-container {
      padding: 20px;
    }
    .empty-message {
      text-align: center;
      color: #666;
      padding: 40px;
    }
  `]
})
export class BookingsDeparturesComponent implements OnInit {
  departures: Booking[] = [];

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.bookingService.getDeparturesForToday().subscribe(bookings => {
      this.departures = bookings;
    });
  }
}
