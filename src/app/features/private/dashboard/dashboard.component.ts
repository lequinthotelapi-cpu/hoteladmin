import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { RoomService } from '../../../core/services/room.service';
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

  colorScheme = {
    domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5']
  };

  constructor(
    private router: Router,
    private bookingService: BookingService,
    private roomService: RoomService,
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
    const rooms = await firstValueFrom(
      this.roomService.getAll().pipe(
        map(rooms => rooms.filter(r => r.isActive))
      )
    );

    this.stats.totalRooms = rooms.length;
    this.stats.occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
    this.stats.dirtyRooms = rooms.filter(r => r.status === 'dirty').length;
    this.stats.maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;
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
    this.roomStatusData = [
      { name: 'Disponibles', value: this.stats.totalRooms - this.stats.occupiedRooms - this.stats.dirtyRooms - this.stats.maintenanceRooms },
      { name: 'Ocupadas', value: this.stats.occupiedRooms },
      { name: 'Sucias', value: this.stats.dirtyRooms },
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
