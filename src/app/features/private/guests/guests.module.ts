import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatStepperModule } from '@angular/material/stepper';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { FurySharedModule } from '../../../../@fury/fury-shared.module';
import { ListModule } from '../../../../@fury/shared/list/list.module';
import { BreadcrumbsModule } from '../../../../@fury/shared/breadcrumbs/breadcrumbs.module';
import { FuryCardModule } from '../../../../@fury/shared/card/card.module';
import { PageLayoutModule } from '../../../../@fury/shared/page-layout/page-layout.module';

import { GuestsListComponent } from './guests-list/guests-list.component';
import { GuestCreateUpdateComponent } from './guest-create-update/guest-create-update.component';
import { GuestRepository } from '../../../core/repositories/guest.repository';
import { GuestFirebaseRepository } from '../../../core/repositories/guest-firebase.repository';
import { GuestService } from '../../../core/services/guest.service';

const routes: Routes = [
  {
    path: '',
    component: GuestsListComponent
  }
];

@NgModule({
  declarations: [
    GuestsListComponent,
    GuestCreateUpdateComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatMenuModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatPaginatorModule,
    MatSortModule,
    MatTabsModule,
    MatStepperModule,
    MatAutocompleteModule,
    FurySharedModule,
    ListModule,
    BreadcrumbsModule,
    FuryCardModule,
    PageLayoutModule
  ],
  providers: [
    { provide: GuestRepository, useClass: GuestFirebaseRepository },
    GuestService
  ]
})
export class GuestsModule { }
