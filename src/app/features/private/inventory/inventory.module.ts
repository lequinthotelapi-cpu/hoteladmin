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
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { FurySharedModule } from '../../../../@fury/fury-shared.module';
import { ListModule } from '../../../../@fury/shared/list/list.module';
import { BreadcrumbsModule } from '../../../../@fury/shared/breadcrumbs/breadcrumbs.module';
import { FuryCardModule } from '../../../../@fury/shared/card/card.module';
import { MovementsListComponent } from './movements-list/movements-list.component';
import { MovementCreateComponent } from './movement-create/movement-create.component';
import { InventoryDashboardComponent } from './inventory-dashboard/inventory-dashboard.component';
import { InventoryMovementRepository } from '../../../core/repositories/inventory-movement.repository';
import { InventoryMovementFirebaseRepository } from '../../../core/repositories/inventory-movement-firebase.repository';
import { ExpenseRepository } from '../../../core/repositories/expense.repository';
import { ExpenseFirebaseRepository } from '../../../core/repositories/expense-firebase.repository';
import { ProductRepository } from '../../../core/repositories/product.repository';
import { ProductFirebaseRepository } from '../../../core/repositories/product-firebase.repository';
import { InventoryMovementService } from '../../../core/services/inventory-movement.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { ProductService } from '../../../core/services/product.service';

const routes: Routes = [
  {
    path: '',
    component: InventoryDashboardComponent
  }
];

@NgModule({
  declarations: [
    MovementsListComponent,
    MovementCreateComponent,
    InventoryDashboardComponent
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
    MatBadgeModule,
    FurySharedModule,
    ListModule,
    BreadcrumbsModule,
    FuryCardModule
  ],
  providers: [
    { provide: InventoryMovementRepository, useClass: InventoryMovementFirebaseRepository },
    { provide: ProductRepository, useClass: ProductFirebaseRepository },
    InventoryMovementService,
    ProductService
  ]
})
export class InventoryModule { }
