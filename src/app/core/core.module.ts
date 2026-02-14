import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';
import { RoleGuard } from './guards/role.guard';

// Services
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { MessagingService } from './services/messaging.service';
import { BookingService } from './services/booking.service';
import { GuestService } from './services/guest.service';
import { RoomService } from './services/room.service';

// Repositories
import { BookingRepository } from '../domain/repositories/booking.repository';
import { FirebaseBookingRepository } from './repositories/booking-firebase.repository';
import { GuestRepository } from './repositories/guest.repository';
import { GuestFirebaseRepository } from './repositories/guest-firebase.repository';
import { RoomRepository } from '../domain/repositories/room.repository';
import { RoomFirebaseRepository } from './repositories/room-firebase.repository';

@NgModule({
  imports: [CommonModule],
  providers: [
    // Guards
    AuthGuard,
    LoginGuard,
    RoleGuard,
    
    // Services
    AuthService,
    NotificationService,
    MessagingService,
    BookingService,
    GuestService,
    RoomService,
    
    // Repositories
    { provide: BookingRepository, useClass: FirebaseBookingRepository },
    FirebaseBookingRepository,
    { provide: GuestRepository, useClass: GuestFirebaseRepository },
    GuestFirebaseRepository,
    { provide: RoomRepository, useClass: RoomFirebaseRepository },
    RoomFirebaseRepository
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error(
        'CoreModule is already loaded. Import it in the AppModule only'
      );
    }
  }
}
