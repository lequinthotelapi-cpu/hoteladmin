import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CalendarEvent, CalendarEventTimesChangedEvent } from 'angular-calendar';
import { Subject } from 'rxjs';
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../domain/models/booking.model';
import { CalendarEventDetailComponent } from './calendar-event-detail/calendar-event-detail.component';
import { BookingCreateUpdateComponent } from '../bookings/booking-create-update/booking-create-update.component';

@Component({
  selector: 'fury-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  view = 'month';
  viewDate: Date = new Date();
  activeDayIsOpen = false;
  events: CalendarEvent[] = [];
  refresh: Subject<void> = new Subject();

  constructor(
    private bookingService: BookingService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.bookingService.getAllBookings().subscribe(bookings => {
      this.events = bookings
        .filter(b => b.status !== 'cancelled')
        .map(b => this.bookingToEvent(b));
      this.refresh.next();
    });
  }

  bookingToEvent(booking: Booking): CalendarEvent {
    const start = new Date(booking.checkInDate);
    const end = new Date(booking.checkOutDate);
    
    // Para vista de mes: usar solo la fecha sin horas
    // Para vistas de semana/día: agregar horas específicas
    if (this.view === 'month') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setHours(14, 0, 0, 0);
      end.setHours(12, 0, 0, 0);
      
      // Si check-out es el mismo día pero antes de check-in, ajustar
      if (end <= start) {
        end.setHours(23, 59, 59, 999);
      }
    }
    
    return {
      start,
      end,
      title: `${booking.guestName} - Hab. ${booking.roomNumber}`,
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
      'no-show': { primary: '#f97316', secondary: '#ffedd5' }
    };
    return colors[status] || colors['pending'];
  }

  handleEventClick(event: CalendarEvent): void {
    const dialogRef = this.dialog.open(CalendarEventDetailComponent, {
      width: '600px',
      data: { booking: event.meta.booking }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBookings();
      }
    });
  }

  dayClicked({ date, events }: { date: Date, events: CalendarEvent[] }): void {
    if (events.length === 0) {
      this.createBooking(date);
      return;
    }

    const isSameMonth = date.getMonth() === this.viewDate.getMonth() && 
                        date.getFullYear() === this.viewDate.getFullYear();
    
    if (isSameMonth) {
      const isSameDay = date.getDate() === this.viewDate.getDate() &&
                        date.getMonth() === this.viewDate.getMonth() &&
                        date.getFullYear() === this.viewDate.getFullYear();
      
      if (isSameDay && this.activeDayIsOpen) {
        this.activeDayIsOpen = false;
      } else {
        this.activeDayIsOpen = true;
        this.viewDate = date;
      }
    }
  }

  createBooking(date?: Date): void {
    const dialogRef = this.dialog.open(BookingCreateUpdateComponent, {
      width: '900px',
      data: { booking: null, preselectedDate: date }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBookings();
      }
    });
  }

  eventTimesChanged({ event, newStart, newEnd }: CalendarEventTimesChangedEvent): void {
    event.start = newStart;
    event.end = newEnd;
    this.refresh.next();
  }

  goToToday(): void {
    this.viewDate = new Date();
  }
}
