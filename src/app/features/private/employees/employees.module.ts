import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { FurySharedModule } from '../../../../@fury/fury-shared.module';
import { ListModule } from '../../../../@fury/shared/list/list.module';
import { BreadcrumbsModule } from '../../../../@fury/shared/breadcrumbs/breadcrumbs.module';
import { FuryCardModule } from '../../../../@fury/shared/card/card.module';
import { EmployeesListComponent } from './employees-list/employees-list.component';
import { EmployeeCreateUpdateComponent } from './employee-create-update/employee-create-update.component';

const routes: Routes = [
  {
    path: '',
    component: EmployeesListComponent
  }
];

@NgModule({
  declarations: [
    EmployeesListComponent,
    EmployeeCreateUpdateComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatMenuModule,
    FurySharedModule,
    ListModule,
    BreadcrumbsModule,
    FuryCardModule
  ]
})
export class EmployeesModule { }
