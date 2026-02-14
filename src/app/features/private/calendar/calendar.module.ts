import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/moment';
import * as moment from 'moment';
import { MaterialModule } from '../../../../@fury/shared/material-components.module';
import { ScrollbarModule } from '../../../../@fury/shared/scrollbar/scrollbar.module';
import { CalendarRoutingModule } from './calendar-routing.module';
import { CalendarComponent } from './calendar.component';
import { CalendarEventDetailComponent } from './calendar-event-detail/calendar-event-detail.component';

export function momentAdapterFactory() {
  return adapterFactory(moment);
}

@NgModule({
  imports: [
    CommonModule,
    CalendarRoutingModule,
    MaterialModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: momentAdapterFactory
    }),
    ScrollbarModule
  ],
  declarations: [
    CalendarComponent,
    CalendarEventDetailComponent
  ]
})
export class CalendarAppModule {}
