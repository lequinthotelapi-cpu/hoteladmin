import { Component, EventEmitter, HostBinding, Input, OnInit, Output } from '@angular/core';
import { map } from 'rxjs/operators';
import { ThemeService } from '../../../@fury/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'fury-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {

  @Input()
  @HostBinding('class.no-box-shadow')
  hasNavigation: boolean;

  @Output() openSidenav = new EventEmitter();
  @Output() openQuickPanel = new EventEmitter();

  topNavigation$ = this.themeService.config$.pipe(map(config => config.navigation === 'top'));

  constructor(
    private themeService: ThemeService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) { }

  ngOnInit() { }

  testNotification() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const testTypes = [
      { type: 'check-in' as const, title: 'Check-in Realizado', message: 'Habitación 101 - Juan Pérez', priority: 'high' as const },
      { type: 'housekeeping' as const, title: 'Nueva Tarea Asignada', message: 'Limpieza de habitación 205', priority: 'medium' as const },
      { type: 'booking' as const, title: 'Nueva Reserva', message: 'Reserva para 3 noches - María García', priority: 'medium' as const },
      { type: 'inventory' as const, title: 'Stock Bajo', message: 'Toallas: solo quedan 5 unidades', priority: 'high' as const },
    ];

    const random = testTypes[Math.floor(Math.random() * testTypes.length)];

    this.notificationService.createNotification(
      currentUser.uid,
      random.type,
      random.title,
      random.message,
      random.priority,
      '/dashboard'
    );
  }


}
