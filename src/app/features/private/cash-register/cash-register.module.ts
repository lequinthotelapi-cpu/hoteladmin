import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared.module';
import { CashRegisterRoutingModule } from './cash-register-routing.module';
import { CashRegisterComponent } from './cash-register.component';
import { CashRegisterOpenComponent } from './cash-register-open/cash-register-open.component';
import { CashRegisterCloseComponent } from './cash-register-close/cash-register-close.component';
import { CashRegisterDetailComponent } from './cash-register-detail/cash-register-detail.component';
import { CashTransactionCreateComponent } from './cash-transaction-create/cash-transaction-create.component';

@NgModule({
  declarations: [
    CashRegisterComponent,
    CashRegisterOpenComponent,
    CashRegisterCloseComponent,
    CashRegisterDetailComponent,
    CashTransactionCreateComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    CashRegisterRoutingModule
  ]
})
export class CashRegisterModule { }
