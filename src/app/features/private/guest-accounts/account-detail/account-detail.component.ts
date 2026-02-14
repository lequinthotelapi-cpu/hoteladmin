import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { GuestAccountService } from '../../../../core/services/guest-account.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GuestAccount } from '../../../../domain/models/guest-account.model';
import { AddChargeDialogComponent } from '../add-charge-dialog/add-charge-dialog.component';
import { AddPaymentDialogComponent } from '../add-payment-dialog/add-payment-dialog.component';
import { CreateInvoiceDialogComponent } from '../../invoices/create-invoice-dialog/create-invoice-dialog.component';
import { InvoiceService } from '../../../../core/services/invoice.service';

@Component({
  selector: 'fury-account-detail',
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.scss']
})
export class AccountDetailComponent implements OnInit {
  account: GuestAccount | null = null;
  loading = false;
  chargesColumns = ['date', 'type', 'description', 'quantity', 'amount', 'total'];
  paymentsColumns = ['date', 'method', 'amount', 'reference'];

  hasInvoice = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private guestAccountService: GuestAccountService,
    private alertService: AlertService,
    private authService: AuthService,
    private dialog: MatDialog,
    private invoiceService: InvoiceService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAccount(id);
    }
  }

  loadAccount(id: string): void {
    this.loading = true;
    this.guestAccountService.getById(id).subscribe({
      next: (account) => {
        this.account = account;
        this.loading = false;
        this.checkInvoice(id);
      },
      error: (error) => {
        this.alertService.error('Error', 'No se pudo cargar la cuenta');
        this.router.navigate(['/guest-accounts']);
      }
    });
  }

  checkInvoice(accountId: string): void {
    this.invoiceService.getByReference(accountId).subscribe(invoice => {
      this.hasInvoice = !!invoice;
    });
  }

  addCharge(): void {
    if (!this.account) return;

    const dialogRef = this.dialog.open(AddChargeDialogComponent, {
      width: '500px',
      data: { accountId: this.account.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.account) {
        this.loadAccount(this.account.id!);
      }
    });
  }

  addPayment(): void {
    if (!this.account) return;

    const dialogRef = this.dialog.open(AddPaymentDialogComponent, {
      width: '500px',
      data: { 
        accountId: this.account.id,
        balance: this.account.balance
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.account) {
        this.loadAccount(this.account.id!);
      }
    });
  }

  async closeAccount(): Promise<void> {
    if (!this.account) return;

    if (this.account.balance > 0) {
      this.alertService.warning('Saldo Pendiente', 'No se puede cerrar una cuenta con saldo pendiente');
      return;
    }

    const confirmed = await this.alertService.confirm(
      'Cerrar Cuenta',
      '¿Está seguro de cerrar esta cuenta? Esta acción no se puede deshacer.'
    );

    if (confirmed) {
      const userId = this.authService.getCurrentUser()?.uid || '';
      try {
        await this.guestAccountService.closeAccount(this.account.id!, userId);
        this.alertService.success('Cuenta cerrada exitosamente');
        this.router.navigate(['/guest-accounts']);
      } catch (error: any) {
        this.alertService.error('Error', error.message);
      }
    }
  }

  getChargeTypeLabel(type: string): string {
    const labels: any = {
      'accommodation': 'Alojamiento',
      'pos': 'Punto de Venta',
      'service': 'Servicio',
      'minibar': 'Minibar',
      'laundry': 'Lavandería',
      'spa': 'Spa',
      'restaurant': 'Restaurante',
      'other': 'Otro'
    };
    return labels[type] || type;
  }

  getPaymentMethodLabel(method: string): string {
    const labels: any = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'deposit': 'Depósito'
    };
    return labels[method] || method;
  }

  generateInvoice(): void {
    if (!this.account) return;

    if (this.account.status !== 'closed') {
      this.alertService.warning('Solo se pueden facturar cuentas cerradas');
      return;
    }

    if (this.account.balance !== 0) {
      this.alertService.warning('La cuenta debe tener balance cero para facturar');
      return;
    }

    const dialogRef = this.dialog.open(CreateInvoiceDialogComponent, {
      width: '500px',
      data: { account: this.account }
    });

    dialogRef.afterClosed().subscribe(invoiceId => {
      if (invoiceId) {
        this.hasInvoice = true;
        this.router.navigate(['/invoices', invoiceId]);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/guest-accounts']);
  }
}
