import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../../../@fury/shared/material-components.module';
import { FuryCardModule } from '../../../../@fury/shared/card/card.module';
import { GuestAccountsRoutingModule } from './guest-accounts-routing.module';

import { GuestAccountsComponent } from './guest-accounts.component';
import { AccountsListComponent } from './accounts-list/accounts-list.component';
import { AccountDetailComponent } from './account-detail/account-detail.component';
import { AddChargeDialogComponent } from './add-charge-dialog/add-charge-dialog.component';
import { AddPaymentDialogComponent } from './add-payment-dialog/add-payment-dialog.component';
import { CreateInvoiceDialogComponent } from '../invoices/create-invoice-dialog/create-invoice-dialog.component';
import { InvoicesModule } from '../invoices/invoices.module';

@NgModule({
  declarations: [
    GuestAccountsComponent,
    AccountsListComponent,
    AccountDetailComponent,
    AddChargeDialogComponent,
    AddPaymentDialogComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    FuryCardModule,
    GuestAccountsRoutingModule,
    InvoicesModule
  ]
})
export class GuestAccountsModule { }
