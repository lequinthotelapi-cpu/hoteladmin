import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../@fury/shared/material-components.module';
import { FurySharedModule } from '../../../../@fury/fury-shared.module';
import { ListModule } from '../../../../@fury/shared/list/list.module';
import { BreadcrumbsModule } from '../../../../@fury/shared/breadcrumbs/breadcrumbs.module';
import { FuryCardModule } from '../../../../@fury/shared/card/card.module';

import { RoomsRoutingModule } from './rooms-routing.module';
import { RoomsComponent } from './rooms.component';
import { RoomsListComponent } from './rooms-list/rooms-list.component';
import { RoomsGridComponent } from './rooms-grid/rooms-grid.component';
import { RoomCreateUpdateComponent } from './room-create-update/room-create-update.component';
import { RoomMapActionsDialogComponent } from './room-map-actions-dialog/room-map-actions-dialog.component';

@NgModule({
  declarations: [
    RoomsComponent,
    RoomsListComponent,
    RoomsGridComponent,
    RoomCreateUpdateComponent,
    RoomMapActionsDialogComponent
  ],
  imports: [
    CommonModule,
    RoomsRoutingModule,
    ReactiveFormsModule,
    MaterialModule,
    FurySharedModule,
    ListModule,
    BreadcrumbsModule,
    FuryCardModule
  ]
})
export class RoomsModule { }
