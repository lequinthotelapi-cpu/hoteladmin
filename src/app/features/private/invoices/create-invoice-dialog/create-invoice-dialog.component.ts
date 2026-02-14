import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GuestAccount } from '../../../../domain/models/guest-account.model';
import { InvoiceService } from '../../../../core/services/invoice.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
  selector: 'fury-create-invoice-dialog',
  templateUrl: './create-invoice-dialog.component.html',
  styleUrls: ['./create-invoice-dialog.component.scss']
})
export class CreateInvoiceDialogComponent implements OnInit {
  form: FormGroup;
  processing = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { account: GuestAccount },
    private dialogRef: MatDialogRef<CreateInvoiceDialogComponent>,
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private authService: AuthService,
    private alertService: AlertService
  ) {
    this.form = this.fb.group({
      clientName: [data.account.guestName, Validators.required],
      clientTaxId: ['', Validators.required],
      clientAddress: [''],
      clientEmail: ['', Validators.email],
      clientPhone: ['']
    });
  }

  ngOnInit() {}

  async submit() {
    if (this.form.invalid) {
      this.alertService.error('Por favor completa todos los campos requeridos');
      return;
    }

    this.processing = true;

    try {
      const firebaseUser = await this.authService.getCurrentUser();
      if (!firebaseUser) throw new Error('Usuario no autenticado');

      const user = await this.authService.getUserData(firebaseUser.uid);
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';

      const invoiceId = await this.invoiceService.createInvoiceFromGuestAccount(
        this.data.account.id!,
        this.form.value,
        firebaseUser.uid,
        userName
      );

      this.alertService.success('Factura generada exitosamente');
      this.dialogRef.close(invoiceId);
    } catch (error: any) {
      console.error('Error al generar factura:', error);
      this.alertService.error(error.message || 'Error al generar factura');
      this.processing = false;
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
