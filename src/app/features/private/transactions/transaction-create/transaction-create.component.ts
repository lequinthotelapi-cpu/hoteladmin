import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TransactionService } from '../../../../core/services/transaction.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StorageService } from '../../../../core/services/storage.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { ParameterOption } from '../../../../domain/models/parameter.model';

@Component({
  selector: 'fury-transaction-create',
  templateUrl: './transaction-create.component.html',
  styleUrls: ['./transaction-create.component.scss']
})
export class TransactionCreateComponent implements OnInit {
  form: FormGroup;
  expenseCategories: ParameterOption[] = [];
  paymentMethods: ParameterOption[] = [];
  selectedFile: File | null = null;
  receiptPreview: string | null = null;
  isSubmitting = false;

  transactionTypes = [
    { value: 'expense', label: 'Gasto' },
    { value: 'deposit', label: 'Depósito' },
    { value: 'withdrawal', label: 'Retiro' }
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { cashRegisterId: string; userId: string },
    private dialogRef: MatDialogRef<TransactionCreateComponent>,
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private authService: AuthService,
    private storageService: StorageService,
    private parametersService: ParametersService
  ) {}

  ngOnInit() {
    this.expenseCategories = this.parametersService.getOptions('expenseCategories');
    this.paymentMethods = this.parametersService.getOptions('paymentMethods');
    this.buildForm();
  }

  buildForm() {
    this.form = this.fb.group({
      type: ['expense', Validators.required],
      category: [''],
      description: ['', [Validators.required, Validators.maxLength(200)]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['', Validators.required],
      invoiceNumber: [''],
      notes: ['', Validators.maxLength(500)]
    });

    this.form.get('type')?.valueChanges.subscribe(type => {
      if (type === 'expense') {
        this.form.get('category')?.setValidators(Validators.required);
      } else {
        this.form.get('category')?.clearValidators();
      }
      this.form.get('category')?.updateValueAndValidity();
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.receiptPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeReceipt() {
    this.selectedFile = null;
    this.receiptPreview = null;
  }

  async save() {
    if (this.form.invalid) {
      return;
    }

    this.isSubmitting = true;

    try {
      const currentUser = await this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      let receiptUrl = null;
      if (this.selectedFile) {
        receiptUrl = await this.storageService.uploadExpenseReceipt(this.selectedFile);
      }

      const user = await this.authService.getUserData(currentUser.uid);
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';

      await this.transactionService.createTransaction({
        cashRegisterId: this.data.cashRegisterId,
        type: this.form.value.type,
        amount: this.form.value.amount,
        paymentMethod: this.form.value.paymentMethod,
        category: this.form.value.category,
        description: this.form.value.description,
        invoiceNumber: this.form.value.invoiceNumber,
        receiptUrl: receiptUrl || undefined,
        createdBy: currentUser.uid,
        createdByName: userName
      });

      this.dialogRef.close(true);
    } catch (error: any) {
      this.isSubmitting = false;
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al guardar el movimiento',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#f44336'
      });
    }
  }
}
