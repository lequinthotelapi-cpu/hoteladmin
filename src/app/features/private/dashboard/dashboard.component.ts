import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { RoomService } from '../../../core/services/room.service';
import { RoomStatusService } from '../../../core/services/room-status.service';
import { GuestAccountService } from '../../../core/services/guest-account.service';
import { POSService } from '../../../core/services/pos.service';
import { ProductService } from '../../../core/services/product.service';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

interface DashboardStats {
  arrivalsToday: number;
  departuresToday: number;
  occupiedRooms: number;
  totalRooms: number;
  dirtyRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
  salesToday: number;
  openAccounts: number;
  lowStockProducts: number;
}

@Component({
  selector: 'fury-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = {
    arrivalsToday: 0,
    departuresToday: 0,
    occupiedRooms: 0,
    totalRooms: 0,
    dirtyRooms: 0,
    cleaningRooms: 0,
    maintenanceRooms: 0,
    salesToday: 0,
    openAccounts: 0,
    lowStockProducts: 0
  };

  occupancyRate = 0;
  loading = true;
  currentDate = new Date();

  // Gráficos
  roomStatusData: any[] = [];
  occupancyWeekData: any[] = [];

  // Disponibles, Ocupadas, Sucias, En Limpieza, Mantenimiento — derivado de la paleta Ocean
  colorScheme = {
    domain: ['#16A34A', '#115D8C', '#F59E0B', '#05DBF2', '#9498F2']
  };

  constructor(
    private router: Router,
    private bookingService: BookingService,
    private roomService: RoomService,
    private roomStatusService: RoomStatusService,
    private guestAccountService: GuestAccountService,
    private posService: POSService,
    private productService: ProductService
  ) {}

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadRoomStats(),
        this.loadBookingStats(),
        this.loadSalesStats(),
        this.loadAccountStats(),
        this.loadProductStats()
      ]);
      this.calculateOccupancy();
      this.prepareChartData();
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      this.loading = false;
    }
  }

  private async loadRoomStats() {
    const rooms$ = this.roomService.getAllRooms();
    const bookings$ = this.bookingService.getAllBookings();
    
    const roomsWithStatus = await firstValueFrom(
      this.roomStatusService.getRoomsWithStatus(rooms$, bookings$)
    );

    this.stats.totalRooms = roomsWithStatus.length;
    this.stats.occupiedRooms = roomsWithStatus.filter(r => r.displayStatus === 'occupied').length;
    this.stats.dirtyRooms = roomsWithStatus.filter(r => r.displayStatus === 'dirty').length;
    this.stats.cleaningRooms = roomsWithStatus.filter(r => r.displayStatus === 'cleaning').length;
    this.stats.maintenanceRooms = roomsWithStatus.filter(r => r.displayStatus === 'maintenance').length;
  }

  private async loadBookingStats() {
    const [arrivals, departures] = await Promise.all([
      firstValueFrom(this.bookingService.getArrivalsForToday()),
      firstValueFrom(this.bookingService.getDeparturesForToday())
    ]);

    this.stats.arrivalsToday = arrivals.length;
    this.stats.departuresToday = departures.length;
  }

  private async loadSalesStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await firstValueFrom(
      this.posService.getByDateRange(today, tomorrow)
    );

    this.stats.salesToday = sales.reduce((sum, s) => sum + s.total, 0);
  }

  private async loadAccountStats() {
    const accounts = await firstValueFrom(
      this.guestAccountService.getAll().pipe(
        map(accounts => accounts.filter(a => a.status === 'open'))
      )
    );

    this.stats.openAccounts = accounts.length;
  }

  private async loadProductStats() {
    const products = await firstValueFrom(this.productService.getAll());
    this.stats.lowStockProducts = products.filter(p => 
      p.currentStock <= p.minStock && p.isActive
    ).length;
  }

  private calculateOccupancy() {
    if (this.stats.totalRooms > 0) {
      this.occupancyRate = (this.stats.occupiedRooms / this.stats.totalRooms) * 100;
    }
  }

  private prepareChartData() {
    const availableRooms = this.stats.totalRooms - this.stats.occupiedRooms - this.stats.dirtyRooms - this.stats.cleaningRooms - this.stats.maintenanceRooms;
    
    this.roomStatusData = [
      { name: 'Disponibles', value: availableRooms },
      { name: 'Ocupadas', value: this.stats.occupiedRooms },
      { name: 'Sucias', value: this.stats.dirtyRooms },
      { name: 'En Limpieza', value: this.stats.cleaningRooms },
      { name: 'Mantenimiento', value: this.stats.maintenanceRooms }
    ].filter(item => item.value > 0);
  }

  // Navegación
  goToCheckIn() {
    this.router.navigate(['/front-desk']);
  }

  goToCheckOut() {
    this.router.navigate(['/front-desk']);
  }

  goToPOS() {
    this.router.navigate(['/pos']);
  }

  goToCashRegister() {
    this.router.navigate(['/cash-register']);
  }

  goToNewBooking() {
    this.router.navigate(['/bookings']);
  }

  goToNewGuest() {
    this.router.navigate(['/guests']);
  }

  goToHousekeeping() {
    this.router.navigate(['/housekeeping']);
  }

  goToRooms() {
    this.router.navigate(['/rooms']);
  }
}
