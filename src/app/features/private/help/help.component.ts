import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'fury-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss']
})
export class HelpComponent implements OnInit {
  userRole: string = '';
  modules: any[] = [];

  allModules = {
    superadmin: [
      { name: 'Dashboard', desc: 'Vista general con métricas y KPIs del hotel', icon: 'dashboard' },
      { name: 'Recepción', desc: 'Gestión de check-in/check-out y front desk', icon: 'desk' },
      { name: 'Habitaciones', desc: 'Administración de habitaciones y estados', icon: 'hotel' },
      { name: 'Reservas', desc: 'Gestión completa de reservas y bookings', icon: 'event' },
      { name: 'Calendario', desc: 'Vista de calendario con disponibilidad', icon: 'calendar_month' },
      { name: 'Housekeeping', desc: 'Gestión de tareas de limpieza', icon: 'cleaning_services' },
      { name: 'Cuentas', desc: 'Folios y cuentas de huéspedes', icon: 'receipt_long' },
      { name: 'POS', desc: 'Punto de venta para productos y servicios', icon: 'shopping_cart' },
      { name: 'Caja', desc: 'Gestión de cajas registradoras', icon: 'point_of_sale' },
      { name: 'Movimientos', desc: 'Transacciones financieras', icon: 'account_balance_wallet' },
      { name: 'Facturas', desc: 'Generación y gestión de facturas', icon: 'receipt' },
      { name: 'Reportes', desc: 'Dashboard financiero con RevPAR, ADR, ocupación', icon: 'assessment' },
      { name: 'Productos', desc: 'Catálogo de productos y servicios', icon: 'inventory_2' },
      { name: 'Inventario', desc: 'Control de stock y movimientos', icon: 'receipt_long' },
      { name: 'Huéspedes', desc: 'Base de datos de clientes', icon: 'person' },
      { name: 'Empleados', desc: 'Gestión de personal', icon: 'badge' },
      { name: 'Usuarios', desc: 'Administración de usuarios del sistema', icon: 'people' },
      { name: 'Parámetros', desc: 'Configuración general del sistema', icon: 'settings' },
      { name: 'Notificaciones', desc: 'Envío de notificaciones a usuarios', icon: 'notifications' },
      { name: 'Permisos', desc: 'Gestión de permisos por rol', icon: 'lock' }
    ],
    admin: [
      { name: 'Dashboard', desc: 'Vista general con métricas del hotel', icon: 'dashboard' },
      { name: 'Recepción', desc: 'Gestión de check-in/check-out', icon: 'desk' },
      { name: 'Habitaciones', desc: 'Administración de habitaciones', icon: 'hotel' },
      { name: 'Reservas', desc: 'Gestión de reservas', icon: 'event' },
      { name: 'Calendario', desc: 'Vista de disponibilidad', icon: 'calendar_month' },
      { name: 'Housekeeping', desc: 'Tareas de limpieza', icon: 'cleaning_services' },
      { name: 'Cuentas', desc: 'Folios de huéspedes', icon: 'receipt_long' },
      { name: 'POS', desc: 'Punto de venta', icon: 'shopping_cart' },
      { name: 'Caja', desc: 'Cajas registradoras', icon: 'point_of_sale' },
      { name: 'Movimientos', desc: 'Transacciones', icon: 'account_balance_wallet' },
      { name: 'Facturas', desc: 'Facturación', icon: 'receipt' },
      { name: 'Reportes', desc: 'Reportes financieros', icon: 'assessment' },
      { name: 'Productos', desc: 'Catálogo de productos', icon: 'inventory_2' },
      { name: 'Inventario', desc: 'Control de stock', icon: 'receipt_long' },
      { name: 'Huéspedes', desc: 'Base de clientes', icon: 'person' },
      { name: 'Empleados', desc: 'Gestión de personal', icon: 'badge' },
      { name: 'Parámetros', desc: 'Configuración', icon: 'settings' },
      { name: 'Notificaciones', desc: 'Notificaciones', icon: 'notifications' }
    ],
    receptionist: [
      { name: 'Dashboard', desc: 'Vista general del hotel', icon: 'dashboard' },
      { name: 'Recepción', desc: 'Check-in y check-out de huéspedes', icon: 'desk' },
      { name: 'Habitaciones', desc: 'Consulta de habitaciones disponibles', icon: 'hotel' },
      { name: 'Reservas', desc: 'Crear y gestionar reservas', icon: 'event' },
      { name: 'Calendario', desc: 'Ver disponibilidad', icon: 'calendar_month' },
      { name: 'Huéspedes', desc: 'Registro de clientes', icon: 'person' },
      { name: 'Cuentas', desc: 'Gestión de folios', icon: 'receipt_long' },
      { name: 'POS', desc: 'Venta de productos', icon: 'shopping_cart' },
      { name: 'Facturas', desc: 'Generar facturas', icon: 'receipt' }
    ],
    housekeeper: [
      { name: 'Dashboard', desc: 'Vista de tareas del día', icon: 'dashboard' },
      { name: 'Housekeeping', desc: 'Mis tareas de limpieza asignadas', icon: 'cleaning_services' },
      { name: 'Habitaciones', desc: 'Ver estado de habitaciones', icon: 'hotel' }
    ],
    manager: [
      { name: 'Dashboard', desc: 'Métricas y KPIs', icon: 'dashboard' },
      { name: 'Reportes', desc: 'Análisis financiero completo', icon: 'assessment' },
      { name: 'Reservas', desc: 'Supervisión de reservas', icon: 'event' },
      { name: 'Habitaciones', desc: 'Estado de habitaciones', icon: 'hotel' },
      { name: 'Cuentas', desc: 'Revisión de cuentas', icon: 'receipt_long' },
      { name: 'Facturas', desc: 'Facturación', icon: 'receipt' },
      { name: 'Caja', desc: 'Supervisión de cajas', icon: 'point_of_sale' },
      { name: 'Movimientos', desc: 'Transacciones', icon: 'account_balance_wallet' },
      { name: 'Empleados', desc: 'Gestión de personal', icon: 'badge' }
    ]
  };

  constructor(private authService: AuthService) {}

  async ngOnInit() {
    const firebaseUser = this.authService.getCurrentUser();
    if (firebaseUser) {
      const userData = await this.authService.getUserData(firebaseUser.uid);
      this.userRole = userData?.role || '';
      this.modules = this.allModules[this.userRole] || [];
    }
  }

  hasModule(moduleName: string): boolean {
    return this.modules.some(m => m.name === moduleName);
  }

  hasAnyModule(moduleNames: string[]): boolean {
    return moduleNames.some(name => this.hasModule(name));
  }
}
