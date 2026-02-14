import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GuestAccountService } from '../../../core/services/guest-account.service';
import { GuestAccount } from '../../../domain/models/guest-account.model';

@Component({
  selector: 'fury-guest-accounts',
  templateUrl: './guest-accounts.component.html',
  styleUrls: ['./guest-accounts.component.scss']
})
export class GuestAccountsComponent implements OnInit {
  selectedTab = 0;

  constructor(
    private guestAccountService: GuestAccountService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  viewAccount(account: GuestAccount): void {
    this.router.navigate(['/guest-accounts', account.id]);
  }
}
