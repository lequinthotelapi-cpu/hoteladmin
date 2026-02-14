import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CashRegister } from '../../../../domain/models/cash-register.model';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { AlertService } from '../../../../core/services/alert.service';

interface DialogData {
  cashRegister: CashRegister;
  userId: string;
  userName: string;
}

@Component({
  selector: 'fury-cash-register-close',
  templateUrl: './cash-register-close.component.html',
  styleUrls: ['./cash-register-close.component.scss']
})
export class CashRegisterCloseComponent implements OnInit {
  form: FormGroup;
  loading = false;
  difference = 0;
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private cashRegisterService: CashRegisterService,
    private alertService: AlertService,
    private dialogRef: MatDialogRef<CashRegisterCloseComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      finalAmount: [this.data.cashRegister.expectedAmount, [Validators.required, Validators.min(0)]],
      notes: ['']
    });

    this.form.get('finalAmount')?.valueChanges.subscribe(value => {
      this.difference = value - this.data.cashRegister.expectedAmount;
    });
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Confirmar si hay diferencia significativa
    if (Math.abs(this.difference) > 50) {
      const confirmed = await this.alertService.confirm(
        '¿Estás seguro?',
        `Hay una diferencia de ${this.difference >= 0 ? '+' : ''}${this.difference.toFixed(2)}. ¿Deseas continuar?`
      );
      if (!confirmed) return;
    }

    this.loading = true;

    try {
      await this.cashRegisterService.closeCashRegister(
        this.data.cashRegister.id,
        {
          finalAmount: this.form.value.finalAmount,
          notes: this.form.value.notes,
          closedBy: this.data.userName
        }
      );

      this.dialogRef.close(true);
    } catch (error: any) {
      this.alertService.error(error.message || 'Error al cerrar caja');
    } finally {
      this.loading = false;
    }
  }
}
