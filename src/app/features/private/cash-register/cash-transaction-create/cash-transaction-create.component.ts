import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CashTransactionType } from '../../../../domain/models/cash-transaction.model';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { ParameterOption } from '../../../../domain/models/parameter.model';

interface DialogData {
  type: 'deposit' | 'withdrawal';
  cashRegisterId: string;
  userId: string;
  userName: string;
}

@Component({
  selector: 'fury-cash-transaction-create',
  templateUrl: './cash-transaction-create.component.html',
  styleUrls: ['./cash-transaction-create.component.scss']
})
export class CashTransactionCreateComponent implements OnInit {
  form: FormGroup;
  loading = false;
  paymentMethods: ParameterOption[] = [];

  constructor(
    private fb: FormBuilder,
    private cashRegisterService: CashRegisterService,
    private alertService: AlertService,
    private parametersService: ParametersService,
    private dialogRef: MatDialogRef<CashTransactionCreateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit() {
    this.paymentMethods = this.parametersService.getOptions('paymentMethods');
    this.buildForm();
  }

  buildForm() {
    this.form = this.fb.group({
      amount: [0, [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['efectivo', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  getTitle(): string {
    return this.data.type === 'deposit' ? 'Registrar Depósito' : 'Registrar Retiro';
  }

  getIcon(): string {
    return this.data.type === 'deposit' ? 'add_circle' : 'remove_circle';
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      console.log('Registrando transacción:', {
        cashRegisterId: this.data.cashRegisterId,
        type: this.data.type,
        amount: this.form.value.amount
      });

      await this.cashRegisterService.addTransaction({
        cashRegisterId: this.data.cashRegisterId,
        type: this.data.type,
        amount: this.form.value.amount,
        paymentMethod: this.form.value.paymentMethod,
        description: this.form.value.description,
        createdBy: this.data.userId,
        createdByName: this.data.userName
      });

      console.log('Transacción registrada exitosamente');
      this.dialogRef.close(true);
    } catch (error: any) {
      console.error('Error al registrar transacción:', error);
      this.alertService.error(error.message || 'Error al registrar transacción');
      this.loading = false;
    }
  }
}
