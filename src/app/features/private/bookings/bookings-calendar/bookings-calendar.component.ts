import { Component, OnInit } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { Subject } from 'rxjs';
import { BookingService } from '../../../../core/services/booking.service';
import { Booking } from '../../../../domain/models/booking.model';

@Component({
  selector: 'fury-bookings-calendar',
  template: `
    <div class="calendar-container">
      <mwl-calendar-month-view
        [viewDate]="viewDate"
        [events]="events"
        [refresh]="refresh"
        (eventClicked)="handleEvent($event.event)">
      </mwl-calendar-month-view>
    </div>
  `,
  styles: [`
    .calendar-container {
      padding: 20px;
    }
  `]
})
export class BookingsCalendarComponent implements OnInit {
  viewDate: Date = new Date();
  events: CalendarEvent[] = [];
  refresh: Subject<void> = new Subject();

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.bookingService.getAllBookings().subscribe(bookings => {
      this.events = bookings.map(b => this.bookingToEvent(b));
      this.refresh.next();
    });
  }

  bookingToEvent(booking: Booking): CalendarEvent {
    return {
      start: booking.checkInDate,
      end: booking.checkOutDate,
      title: `${booking.guestName} - ${booking.roomNumber}`,
      color: this.getColorByStatus(booking.status),
      meta: { booking }
    };
  }

  getColorByStatus(status: string): any {
    const colors: any = {
      'pending': { primary: '#fbbf24', secondary: '#fef3c7' },
      'confirmed': { primary: '#3b82f6', secondary: '#dbeafe' },
      'checked-in': { primary: '#10b981', secondary: '#d1fae5' },
      'checked-out': { primary: '#6b7280', secondary: '#f3f4f6' },
      'cancelled': { primary: '#ef4444', secondary: '#fee2e2' }
    };
    return colors[status] || colors['pending'];
  }

  handleEvent(event: CalendarEvent): void {
    console.log('Event clicked', event);
  }
}
