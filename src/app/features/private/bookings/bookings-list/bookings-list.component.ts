import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Booking, BookingStatus } from '../../../../domain/models/booking.model';
import { BookingService } from '../../../../core/services/booking.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ListColumn } from '../../../../../@fury/shared/list/list-column.model';

@Component({
  selector: 'fury-bookings-list',
  templateUrl: './bookings-list.component.html',
  styleUrls: ['./bookings-list.component.scss']
})
export class BookingsListComponent implements OnInit {
  columns: ListColumn[] = [
    { name: 'Número', property: 'bookingNumber', visible: true, isModelProperty: true },
    { name: 'Huésped', property: 'guestName', visible: true, isModelProperty: true },
    { name: 'Habitación', property: 'roomNumber', visible: true, isModelProperty: true },
    { name: 'Check-in', property: 'checkInDate', visible: true, isModelProperty: true },
    { name: 'Check-out', property: 'checkOutDate', visible: true, isModelProperty: true },
    { name: 'Noches', property: 'nights', visible: true, isModelProperty: true },
    { name: 'Total', property: 'totalPrice', visible: true, isModelProperty: true },
    { name: 'Estado', property: 'status', visible: true, isModelProperty: true },
    { name: 'Acciones', property: 'actions', visible: true, isModelProperty: false }
  ];
  dataSource: MatTableDataSource<Booking>;
  
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  statusFilter: BookingStatus | 'all' = 'all';
  statuses: { value: BookingStatus | 'all', label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmada' },
    { value: 'checked-in', label: 'Check-in' },
    { value: 'checked-out', label: 'Check-out' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'no-show', label: 'No Show' }
  ];

  get visibleColumns() {
    return this.columns.filter(column => column.visible).map(column => column.property);
  }

  constructor(
    private bookingService: BookingService,
    private alertService: AlertService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.dataSource = new MatTableDataSource<Booking>([]);
  }

  ngOnInit(): void {
    this.loadBookings();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadBookings(): void {
    if (this.statusFilter === 'all') {
      this.bookingService.getAllBookings().subscribe(bookings => {
        this.dataSource.data = bookings;
      });
    } else {
      this.bookingService.getBookingsByStatus(this.statusFilter).subscribe(bookings => {
        this.dataSource.data = bookings;
      });
    }
  }

  onFilterChange(value: string): void {
    this.dataSource.filter = value.trim().toLowerCase();
  }

  onStatusFilterChange(): void {
    this.loadBookings();
  }

  editBooking(booking: Booking): void {
    import('../booking-create-update/booking-create-update.component').then(m => {
      this.dialog.open(m.BookingCreateUpdateComponent, {
        width: '900px',
        data: { booking }
      });
    });
  }

  async confirmBooking(booking: Booking): Promise<void> {
    const confirmed = await this.alertService.confirm(
      'Confirmar Reserva',
      `¿Confirmar la reserva ${booking.bookingNumber}?`
    );

    if (confirmed) {
      try {
        const userId = this.authService.getCurrentUser()?.uid || '';
        await this.bookingService.confirmBooking(booking.id!, userId);
        this.alertService.success('Reserva confirmada');
        this.loadBookings();
      } catch (error: any) {
        this.alertService.error('Error', error.message);
      }
    }
  }

  async cancelBooking(booking: Booking): Promise<void> {
    const confirmed = await this.alertService.confirmDelete(
      'Cancelar Reserva',
      `¿Está seguro de cancelar la reserva ${booking.bookingNumber}?`
    );

    if (confirmed) {
      try {
        const userId = this.authService.getCurrentUser()?.uid || '';
        await this.bookingService.cancelBooking(booking.id!, userId);
        this.alertService.success('Reserva cancelada');
        this.loadBookings();
      } catch (error: any) {
        this.alertService.error('Error', error.message);
      }
    }
  }

  getStatusBadgeClass(status: BookingStatus): string {
    const map: Record<BookingStatus, string> = {
      'pending': 'badge-warning',
      'confirmed': 'badge-info',
      'checked-in': 'badge-success',
      'checked-out': 'badge-secondary',
      'cancelled': 'badge-danger',
      'no-show': 'badge-danger'
    };
    return map[status] || 'badge-secondary';
  }

  getStatusLabel(status: BookingStatus): string {
    const map: Record<BookingStatus, string> = {
      'pending': 'Pendiente',
      'confirmed': 'Confirmada',
      'checked-in': 'Check-in',
      'checked-out': 'Check-out',
      'cancelled': 'Cancelada',
      'no-show': 'No Show'
    };
    return map[status] || status;
  }

  toggleColumn(column: ListColumn): void {
    column.visible = !column.visible;
  }

  createBooking(): void {
    import('../booking-create-update/booking-create-update.component').then(m => {
      this.dialog.open(m.BookingCreateUpdateComponent, {
        width: '900px',
        data: { booking: null }
      });
    });
  }
}
