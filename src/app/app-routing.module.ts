import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginGuard } from './core/guards/login.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./features/public/login/login.module').then(m => m.LoginModule),
    canActivate: [LoginGuard]
  },
  {
    path: 'register',
    loadChildren: () => import('./examples/authentication/register/register.module').then(m => m.RegisterModule),
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./examples/authentication/forgot-password/forgot-password.module').then(m => m.ForgotPasswordModule),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/private/dashboard/dashboard.module').then(m => m.DashboardModule),
      },
      {
        path: 'users',
        loadChildren: () => import('./features/private/users/users.module').then(m => m.UsersModule),
      },
      {
        path: 'parameters',
        loadChildren: () => import('./features/private/parameters/parameters.module').then(m => m.ParametersModule),
      },
      {
        path: 'guests',
        loadChildren: () => import('./features/private/guests/guests.module').then(m => m.GuestsModule),
      },
      {
        path: 'products',
        loadChildren: () => import('./features/private/products/products.module').then(m => m.ProductsModule),
      },
      {
        path: 'inventory',
        loadChildren: () => import('./features/private/inventory/inventory.module').then(m => m.InventoryModule),
      },
      {
        path: 'employees',
        loadChildren: () => import('./features/private/employees/employees.module').then(m => m.EmployeesModule),
      },
      {
        path: 'rooms',
        loadChildren: () => import('./features/private/rooms/rooms.module').then(m => m.RoomsModule),
      },
      {
        path: 'housekeeping',
        loadChildren: () => import('./features/private/housekeeping/housekeeping.module').then(m => m.HousekeepingModule),
      },
      {
        path: 'bookings',
        loadChildren: () => import('./features/private/bookings/bookings.module').then(m => m.BookingsModule),
      },
      {
        path: 'calendar',
        loadChildren: () => import('./features/private/calendar/calendar.module').then(m => m.CalendarAppModule),
      },
      {
        path: 'front-desk',
        loadChildren: () => import('./features/private/front-desk/front-desk.module').then(m => m.FrontDeskModule),
      },
      {
        path: 'guest-accounts',
        loadChildren: () => import('./features/private/guest-accounts/guest-accounts.module').then(m => m.GuestAccountsModule),
      },
      {
        path: 'transactions',
        loadChildren: () => import('./features/private/transactions/transactions.module').then(m => m.TransactionsModule),
      },
      {
        path: 'pos',
        loadChildren: () => import('./features/private/pos/pos.module').then(m => m.PosModule),
      },
      {
        path: 'cash-register',
        loadChildren: () => import('./features/private/cash-register/cash-register.module').then(m => m.CashRegisterModule),
      },
      {
        path: 'invoices',
        loadChildren: () => import('./features/private/invoices/invoices.module').then(m => m.InvoicesModule),
      },
      {
        path: 'reports',
        loadChildren: () => import('./features/private/reports/reports.module').then(m => m.ReportsModule),
      },
      {
        path: 'notifications',
        loadChildren: () => import('./features/private/notifications/notifications.module').then(m => m.NotificationsModule),
      },
      {
        path: 'permissions',
        loadChildren: () => import('./features/private/permissions/permissions.module').then(m => m.PermissionsModule),
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/private/profile/profile.module').then(m => m.ProfileModule),
      },
      {
        path: 'help',
        loadChildren: () => import('./features/private/help/help.module').then(m => m.HelpModule),
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    initialNavigation: 'enabledNonBlocking',
    preloadingStrategy: PreloadAllModules,
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
