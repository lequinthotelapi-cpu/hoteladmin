import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';

import { HousekeepingRoutingModule } from './housekeeping-routing.module';
import { HousekeepingContainerComponent } from './housekeeping-container/housekeeping-container.component';
import { HousekeepingDashboardComponent } from './housekeeping-dashboard/housekeeping-dashboard.component';
import { HousekeepingTasksListComponent } from './housekeeping-tasks-list/housekeeping-tasks-list.component';
import { HousekeepingByEmployeeComponent } from './housekeeping-by-employee/housekeeping-by-employee.component';
import { TaskCreateUpdateComponent } from './task-create-update/task-create-update.component';

@NgModule({
  declarations: [
    HousekeepingContainerComponent,
    HousekeepingDashboardComponent,
    HousekeepingTasksListComponent,
    HousekeepingByEmployeeComponent,
    TaskCreateUpdateComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HousekeepingRoutingModule,
    MatTabsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDialogModule,
    MatCheckboxModule,
    MatMenuModule
  ]
})
export class HousekeepingModule { }
