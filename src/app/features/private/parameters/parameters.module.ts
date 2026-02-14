import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { FurySharedModule } from '../../../../@fury/fury-shared.module';
import { BreadcrumbsModule } from '../../../../@fury/shared/breadcrumbs/breadcrumbs.module';
import { PageLayoutModule } from '../../../../@fury/shared/page-layout/page-layout.module';

import { ParametersRoutingModule } from './parameters-routing.module';
import { ParametersListComponent } from './parameters-list/parameters-list.component';
import { ParameterEditComponent } from './parameter-edit/parameter-edit.component';

@NgModule({
  declarations: [
    ParametersListComponent,
    ParameterEditComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ParametersRoutingModule,
    DragDropModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    FurySharedModule,
    BreadcrumbsModule,
    PageLayoutModule
  ]
})
export class ParametersModule { }
