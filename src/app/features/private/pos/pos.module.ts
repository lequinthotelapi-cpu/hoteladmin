import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared.module';
import { PosRoutingModule } from './pos-routing.module';
import { PosComponent } from './pos.component';

@NgModule({
  declarations: [
    PosComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    PosRoutingModule
  ]
})
export class PosModule { }
