import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../@fury/shared/material-components.module';
import { FurySharedModule } from '../../../../@fury/fury-shared.module';
import { FuryCardModule } from '../../../../@fury/shared/card/card.module';
import { BreadcrumbsModule } from '../../../../@fury/shared/breadcrumbs/breadcrumbs.module';
import { PageLayoutModule } from '../../../../@fury/shared/page-layout/page-layout.module';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/moment';
import * as moment from 'moment';

import { BookingsRoutingModule } from './bookings-routing.module';
import { BookingsComponent } from './bookings.component';
import { BookingsListComponent } from './bookings-list/bookings-list.component';
import { BookingsCalendarComponent } from './bookings-calendar/bookings-calendar.component';
import { BookingsArrivalsComponent } from './bookings-arrivals/bookings-arrivals.component';
import { BookingsDeparturesComponent } from './bookings-departures/bookings-departures.component';
import { BookingCreateUpdateComponent } from './booking-create-update/booking-create-update.component';

export function momentAdapterFactory() {
  return adapterFactory(moment);
}

@NgModule({
  declarations: [
    BookingsComponent,
    BookingsListComponent,
    BookingsCalendarComponent,
    BookingsArrivalsComponent,
    BookingsDeparturesComponent,
    BookingCreateUpdateComponent
  ],
  imports: [
    CommonModule,
    BookingsRoutingModule,
    ReactiveFormsModule,
    MaterialModule,
    FurySharedModule,
    FuryCardModule,
    BreadcrumbsModule,
    PageLayoutModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: momentAdapterFactory
    })
  ]
})
export class BookingsModule { }
