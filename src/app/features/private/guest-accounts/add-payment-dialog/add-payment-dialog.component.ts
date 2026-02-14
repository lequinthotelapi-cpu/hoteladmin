import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GuestAccountService } from '../../../../core/services/guest-account.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CreatePaymentDto } from '../../../../domain/models/guest-account.model';

@Component({
  selector: 'fury-add-payment-dialog',
  templateUrl: './add-payment-dialog.component.html',
  styleUrls: ['./add-payment-dialog.component.scss']
})
export class AddPaymentDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;

  paymentMethods = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'deposit', label: 'Depósito' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddPaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { accountId: string, balance: number },
    private guestAccountService: GuestAccountService,
    private alertService: AlertService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      method: ['cash', Validators.required],
      amount: [this.data.balance, [Validators.required, Validators.min(0.01), Validators.max(this.data.balance)]],
      reference: [''],
      notes: ['']
    });
  }

  payFull(): void {
    this.form.patchValue({ amount: this.data.balance });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const userId = this.authService.getCurrentUser()?.uid || '';
      const dto: CreatePaymentDto = this.form.value;
      
      await this.guestAccountService.addPayment(this.data.accountId, dto, userId);
      this.alertService.success('Pago registrado exitosamente');
      this.dialogRef.close(true);
    } catch (error: any) {
      this.alertService.error('Error', error.message);
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
