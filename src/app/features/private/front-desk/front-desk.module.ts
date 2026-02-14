import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../@fury/shared/material-components.module';
import { FuryCardModule } from '../../../../@fury/shared/card/card.module';
import { FrontDeskRoutingModule } from './front-desk-routing.module';
import { FrontDeskComponent } from './front-desk.component';
import { ArrivalsListComponent } from './arrivals-list/arrivals-list.component';
import { DeparturesListComponent } from './departures-list/departures-list.component';
import { InHouseListComponent } from './in-house-list/in-house-list.component';
import { CheckInDialogComponent } from './check-in-dialog/check-in-dialog.component';
import { CheckOutDialogComponent } from './check-out-dialog/check-out-dialog.component';

@NgModule({
  declarations: [
    FrontDeskComponent,
    ArrivalsListComponent,
    DeparturesListComponent,
    InHouseListComponent,
    CheckInDialogComponent,
    CheckOutDialogComponent
  ],
  imports: [
    CommonModule,
    FrontDeskRoutingModule,
    MaterialModule,
    FuryCardModule
  ]
})
export class FrontDeskModule {}
