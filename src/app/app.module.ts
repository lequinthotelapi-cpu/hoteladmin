import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LayoutModule } from './layout/layout.module';
import { PendingInterceptorModule } from '../@fury/shared/loading-indicator/pending-interceptor.module';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions } from '@angular/material/form-field';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBarConfig } from '@angular/material/snack-bar';

import { environment } from '../environments/environment';
// 🔥 AngularFire imports
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideFunctions, getFunctions } from '@angular/fire/functions';

// Core Module
import { CoreModule } from './core/core.module';

// Repository Pattern
import { UserRepository } from './domain/repositories/user.repository';
import { FirebaseUserRepository } from './infrastructure/repositories/firebase-user.repository';
import { ProductRepository } from './domain/repositories/product.repository';
import { FirebaseProductRepository } from './infrastructure/repositories/firebase-product.repository';
import { NotificationRepository } from './domain/repositories/notification.repository';
import { NotificationFirebaseRepository } from './infrastructure/repositories/notification-firebase.repository';
import { RolePermissionRepository } from './domain/repositories/role-permission.repository';
import { RolePermissionFirebaseRepository } from './infrastructure/repositories/role-permission-firebase.repository';

@NgModule({
  imports: [
    // Angular Core Module
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,

    // Core Module (Singleton services, guards)
    CoreModule,

    // Fury Core Modules
    AppRoutingModule,

    // Layout Module (Sidenav, Toolbar, Quickpanel, Content)
    LayoutModule,

    // Displays Loading Bar when a Route Request or HTTP Request is pending
    PendingInterceptorModule,

    // 🔥 Firebase config
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideMessaging(() => getMessaging()),
    provideStorage(() => getStorage()),
    provideFunctions(() => getFunctions())
  ],
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: 'fill'
      } as MatFormFieldDefaultOptions
    },
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom'
      } as MatSnackBarConfig
    },
    // Repository Pattern - Dependency Injection
    { provide: UserRepository, useClass: FirebaseUserRepository },
    { provide: ProductRepository, useClass: FirebaseProductRepository },
    { provide: NotificationRepository, useClass: NotificationFirebaseRepository },
    { provide: RolePermissionRepository, useClass: RolePermissionFirebaseRepository }
  ]
})
export class AppModule {
}
