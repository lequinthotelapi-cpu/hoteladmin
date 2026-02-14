import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { HelpRoutingModule } from './help-routing.module';
import { HelpComponent } from './help.component';

@NgModule({
  declarations: [
    HelpComponent
  ],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    HelpRoutingModule
  ]
})
export class HelpModule { }
