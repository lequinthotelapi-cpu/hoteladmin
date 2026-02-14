import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GuestAccountsComponent } from './guest-accounts.component';
import { AccountDetailComponent } from './account-detail/account-detail.component';

const routes: Routes = [
  {
    path: '',
    component: GuestAccountsComponent
  },
  {
    path: ':id',
    component: AccountDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GuestAccountsRoutingModule { }
