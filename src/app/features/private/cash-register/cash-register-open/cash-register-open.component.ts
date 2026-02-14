import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { AlertService } from '../../../../core/services/alert.service';

interface DialogData {
  userId: string;
  userName: string;
}

@Component({
  selector: 'fury-cash-register-open',
  templateUrl: './cash-register-open.component.html',
  styleUrls: ['./cash-register-open.component.scss']
})
export class CashRegisterOpenComponent implements OnInit {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private cashRegisterService: CashRegisterService,
    private alertService: AlertService,
    private dialogRef: MatDialogRef<CashRegisterOpenComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      initialAmount: [0, [Validators.required, Validators.min(0)]]
    });
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      await this.cashRegisterService.openCashRegister({
        userId: this.data.userId,
        userName: this.data.userName,
        initialAmount: this.form.value.initialAmount
      });

      this.dialogRef.close(true);
    } catch (error: any) {
      this.alertService.error(error.message || 'Error al abrir caja');
    } finally {
      this.loading = false;
    }
  }
}
