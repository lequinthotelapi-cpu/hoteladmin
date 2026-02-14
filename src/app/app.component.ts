import { DOCUMENT } from '@angular/common';
import { Component, Inject, Renderer2, OnDestroy } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { SidenavService } from './layout/sidenav/sidenav.service';
import { ThemeService } from '../@fury/services/theme.service';
import { ActivatedRoute } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Platform } from '@angular/cdk/platform';
import { SplashScreenService } from '../@fury/services/splash-screen.service';
import { NotificationService } from './core/services/notification.service';
import { ParametersService } from './core/services/parameters.service';
import { PermissionService } from './core/services/permission.service';
import { AuthService } from './core/services/auth.service';
import { Subject } from 'rxjs';

@Component({
  selector: 'fury-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private sidenavService: SidenavService,
              private iconRegistry: MatIconRegistry,
              private renderer: Renderer2,
              private themeService: ThemeService,
              @Inject(DOCUMENT) private document: Document,
              private platform: Platform,
              private route: ActivatedRoute,
              private splashScreenService: SplashScreenService,
              private notificationService: NotificationService,
              private parametersService: ParametersService,
              private permissionService: PermissionService,
              private authService: AuthService) {
    this.route.queryParamMap.pipe(
      filter(queryParamMap => queryParamMap.has('style'))
    ).subscribe(queryParamMap => this.themeService.setStyle(queryParamMap.get('style')));

    this.iconRegistry.setDefaultFontSetClass('material-icons-outlined');
    
    // Set Ocean theme as default
    this.themeService.setTheme('fury-ocean');
    
    this.themeService.theme$.subscribe(theme => {
      if (theme[0]) {
        this.renderer.removeClass(this.document.body, theme[0]);
      }

      this.renderer.addClass(this.document.body, theme[1]);
    });

    if (this.platform.BLINK) {
      this.renderer.addClass(this.document.body, 'is-blink');
    }

    this.sidenavService.addItems([
      // OPERACIONES
      {
        name: 'OPERACIONES',
        position: 5,
        type: 'subheading',
        customClass: 'first-subheading'
      },
      {
        name: 'Dashboard',
        routeOrFunction: '/',
        icon: 'dashboard',
        position: 10,
        pathMatchExact: true
      },
      {
        name: 'Recepción',
        routeOrFunction: '/front-desk',
        icon: 'desk',
        position: 11,
      },
      {
        name: 'Habitaciones',
        routeOrFunction: '/rooms',
        icon: 'hotel',
        position: 12,
      },
      {
        name: 'Reservas',
        routeOrFunction: '/bookings',
        icon: 'event',
        position: 13,
      },
      {
        name: 'Calendario',
        routeOrFunction: '/calendar',
        icon: 'calendar_month',
        position: 14,
      },
      {
        name: 'Housekeeping',
        routeOrFunction: '/housekeeping',
        icon: 'cleaning_services',
        position: 15,
      },
      
      // FINANZAS
      {
        name: 'FINANZAS',
        type: 'subheading',
        position: 20
      },
      {
        name: 'Cuentas',
        routeOrFunction: '/guest-accounts',
        icon: 'receipt_long',
        position: 21,
      },
      {
        name: 'POS',
        routeOrFunction: '/pos',
        icon: 'shopping_cart',
        position: 22,
      },
      {
        name: 'Caja',
        routeOrFunction: '/cash-register',
        icon: 'point_of_sale',
        position: 23,
      },
      {
        name: 'Movimientos',
        routeOrFunction: '/transactions',
        icon: 'account_balance_wallet',
        position: 24,
      },
      {
        name: 'Facturas',
        routeOrFunction: '/invoices',
        icon: 'receipt',
        position: 25,
      },
      {
        name: 'Reportes',
        routeOrFunction: '/reports',
        icon: 'assessment',
        position: 26,
      },
      
      // INVENTARIO
      {
        name: 'INVENTARIO',
        type: 'subheading',
        position: 30
      },
      {
        name: 'Productos',
        routeOrFunction: '/products',
        icon: 'inventory_2',
        position: 31,
      },
      {
        name: 'Inventario',
        routeOrFunction: '/inventory',
        icon: 'receipt_long',
        position: 32,
      },
      
      // ADMINISTRACIÓN
      {
        name: 'ADMINISTRACIÓN',
        type: 'subheading',
        position: 40
      },
      {
        name: 'Huéspedes',
        routeOrFunction: '/guests',
        icon: 'person',
        position: 41,
      },
      {
        name: 'Usuarios',
        routeOrFunction: '/users',
        icon: 'people',
        position: 42,
      },
      {
        name: 'Parámetros',
        routeOrFunction: '/parameters',
        icon: 'settings',
        position: 43,
      },
      {
        name: 'Notificaciones',
        routeOrFunction: '/notifications',
        icon: 'notifications',
        position: 44,
      },
      {
        name: 'Permisos',
        routeOrFunction: '/permissions',
        icon: 'lock',
        position: 45,
      },
      
      // EXAMPLES
      {
        name: 'EXAMPLES',
        type: 'subheading',
        position: 100
      },
      {
        name: 'All-In-One Table',
        routeOrFunction: '/tables/all-in-one-table',
        icon: 'assignment',
        badge: '22',
        badgeColor: '#2196F3',
        position: 101,
      },
      {
        name: 'Calendar',
        routeOrFunction: '/apps/calendar',
        icon: 'date_range',
        position: 102
      },
      {
        name: 'Inbox',
        routeOrFunction: '/apps/inbox',
        icon: 'inbox',
        position: 103
      },
      {
        name: 'Chat',
        routeOrFunction: '/apps/chat',
        icon: 'chat',
        position: 104,
        badge: '14',
        badgeColor: '#009688'
      },
      {
        name: 'Components',
        routeOrFunction: '/components',
        icon: 'layers',
        position: 105
      },
      {
        name: 'Forms',
        icon: 'description',
        position: 106,
        subItems: [
          {
            name: 'Form Elements',
            routeOrFunction: '/forms/form-elements',
            position: 10
          },
          {
            name: 'Form Wizard',
            routeOrFunction: '/forms/form-wizard',
            position: 15
          }
        ]
      },
      {
        name: 'Drag & Drop',
        routeOrFunction: '/drag-and-drop',
        icon: 'mouse',
        position: 107
      },
      {
        name: 'WYSIWYG Editor',
        routeOrFunction: '/editor',
        icon: 'format_shapes',
        position: 108
      },
      {
        name: 'Authentication',
        icon: 'lock',
        position: 109,
        subItems: [
          {
            name: 'Login Page',
            routeOrFunction: '/login',
            position: 5
          },
          {
            name: 'Register Page',
            routeOrFunction: '/register',
            position: 10
          },
          {
            name: 'Forgot Password',
            routeOrFunction: '/forgot-password',
            position: 15
          }
        ]
      },
      {
        name: 'Page Layouts',
        icon: 'view_compact',
        position: 110,
        subItems: [
          {
            name: 'Simple',
            routeOrFunction: '/page-layouts/simple',
            position: 5
          },
          {
            name: 'Simple Tabbed',
            routeOrFunction: '/page-layouts/simple-tabbed',
            position: 5
          },
          {
            name: 'Card',
            routeOrFunction: '/page-layouts/card',
            position: 10
          },
          {
            name: 'Card Tabbed',
            routeOrFunction: '/page-layouts/card-tabbed',
            position: 15
          },
        ],
        badge: '4',
        badgeColor: '#4CAF50'
      },
      {
        name: 'Coming Soon',
        routeOrFunction: '/coming-soon',
        icon: 'watch_later',
        position: 111
      },
      {
        name: 'Blank',
        routeOrFunction: '/blank',
        icon: 'picture_in_picture',
        position: 112
      },
      {
        name: 'Material Icons',
        routeOrFunction: '/icons',
        icon: 'grade',
        position: 113
      },
      {
        name: 'Multi-Level Menu',
        icon: 'menu',
        position: 114,
        subItems: [
          {
            name: 'Level 1',
            subItems: [
              {
                name: 'Level 2',
                subItems: [
                  {
                    name: 'Level 3',
                    subItems: [
                      {
                        name: 'Level 4',
                        subItems: [
                          {
                            name: 'Level 5',
                            routeOrFunction: '/level1/level2/level3/level4/level5'
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);
  }

  ngOnInit() {
    // Cargar parámetros y permisos solo cuando el usuario esté autenticado
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.parametersService.loadAllParameters().catch(err => {
            console.error('Error loading parameters:', err);
          });
          this.permissionService.initializeDefaultPermissions().catch(err => {
            console.error('Error loading permissions:', err);
          });
        }
      });
    
    // Comentado temporalmente hasta configurar Service Worker
    // this.notificationService.listenForegroundMessages();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
