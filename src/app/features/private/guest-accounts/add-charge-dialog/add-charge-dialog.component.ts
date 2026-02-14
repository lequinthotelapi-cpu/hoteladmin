import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GuestAccountService } from '../../../../core/services/guest-account.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CreateChargeDto } from '../../../../domain/models/guest-account.model';

@Component({
  selector: 'fury-add-charge-dialog',
  templateUrl: './add-charge-dialog.component.html',
  styleUrls: ['./add-charge-dialog.component.scss']
})
export class AddChargeDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;

  chargeTypes = [
    { value: 'pos', label: 'Punto de Venta' },
    { value: 'service', label: 'Servicio' },
    { value: 'minibar', label: 'Minibar' },
    { value: 'laundry', label: 'Lavandería' },
    { value: 'spa', label: 'Spa' },
    { value: 'restaurant', label: 'Restaurante' },
    { value: 'other', label: 'Otro' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddChargeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { accountId: string },
    private guestAccountService: GuestAccountService,
    private alertService: AlertService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      type: ['pos', Validators.required],
      description: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reference: ['']
    });
  }

  get total(): number {
    const amount = this.form.get('amount')?.value || 0;
    const quantity = this.form.get('quantity')?.value || 1;
    return amount * quantity;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const userId = this.authService.getCurrentUser()?.uid || '';
      const dto: CreateChargeDto = this.form.value;
      
      await this.guestAccountService.addCharge(this.data.accountId, dto, userId);
      this.alertService.success('Cargo agregado exitosamente');
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
