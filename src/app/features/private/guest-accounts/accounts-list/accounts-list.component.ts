import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GuestAccountService } from '../../../../core/services/guest-account.service';
import { GuestAccount, GuestAccountStatus } from '../../../../domain/models/guest-account.model';

@Component({
  selector: 'fury-accounts-list',
  templateUrl: './accounts-list.component.html',
  styleUrls: ['./accounts-list.component.scss']
})
export class AccountsListComponent implements OnInit {
  @Input() status!: GuestAccountStatus;
  
  accounts: GuestAccount[] = [];
  loading = false;
  displayedColumns = ['roomNumber', 'guestName', 'checkInDate', 'total', 'balance', 'actions'];

  constructor(
    private guestAccountService: GuestAccountService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading = true;
    this.guestAccountService.getByStatus(this.status).subscribe(accounts => {
      this.accounts = accounts;
      this.loading = false;
    });
  }

  viewAccount(account: GuestAccount): void {
    this.router.navigate(['/guest-accounts', account.id]);
  }
}
