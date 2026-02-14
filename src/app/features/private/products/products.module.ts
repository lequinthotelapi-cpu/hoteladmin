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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { FurySharedModule } from '../../../../@fury/fury-shared.module';
import { ListModule } from '../../../../@fury/shared/list/list.module';
import { BreadcrumbsModule } from '../../../../@fury/shared/breadcrumbs/breadcrumbs.module';
import { FuryCardModule } from '../../../../@fury/shared/card/card.module';
import { ProductsListComponent } from './products-list/products-list.component';
import { ProductCreateUpdateComponent } from './product-create-update/product-create-update.component';
import { ProductRepository } from '../../../core/repositories/product.repository';
import { ProductFirebaseRepository } from '../../../core/repositories/product-firebase.repository';
import { ProductService } from '../../../core/services/product.service';

const routes: Routes = [
  {
    path: '',
    component: ProductsListComponent
  }
];

@NgModule({
  declarations: [
    ProductsListComponent,
    ProductCreateUpdateComponent
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
    MatSlideToggleModule,
    MatStepperModule,
    MatChipsModule,
    MatBadgeModule,
    FurySharedModule,
    ListModule,
    BreadcrumbsModule,
    FuryCardModule
  ],
  providers: [
    { provide: ProductRepository, useClass: ProductFirebaseRepository },
    ProductService
  ]
})
export class ProductsModule { }
