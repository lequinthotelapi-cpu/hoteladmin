import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Expense } from '../../../../domain/models/expense.model';
import { ExpenseService } from '../../../../core/services/expense.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StorageService } from '../../../../core/services/storage.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { ParameterOption } from '../../../../domain/models/parameter.model';

@Component({
  selector: 'fury-expense-create-update',
  templateUrl: './expense-create-update.component.html',
  styleUrls: ['./expense-create-update.component.scss']
})
export class ExpenseCreateUpdateComponent implements OnInit {
  form: FormGroup;
  mode: 'create' | 'update' = 'create';
  expenseCategories: ParameterOption[] = [];
  paymentMethods: ParameterOption[] = [];
  selectedFile: File | null = null;
  receiptPreview: string | null = null;
  isSubmitting = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public expense: Expense,
    private dialogRef: MatDialogRef<ExpenseCreateUpdateComponent>,
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private authService: AuthService,
    private storageService: StorageService,
    private parametersService: ParametersService
  ) {}

  ngOnInit() {
    this.mode = this.expense ? 'update' : 'create';
    this.expenseCategories = this.parametersService.getOptions('expenseCategories');
    this.paymentMethods = this.parametersService.getOptions('paymentMethods');
    this.buildForm();

    if (this.expense?.receiptUrl) {
      this.receiptPreview = this.expense.receiptUrl;
    }
  }

  buildForm() {
    this.form = this.fb.group({
      category: [this.expense?.category || '', Validators.required],
      description: [this.expense?.description || '', [Validators.required, Validators.maxLength(200)]],
      amount: [this.expense?.amount || 0, [Validators.required, Validators.min(0.01)]],
      date: [this.expense?.date || new Date(), Validators.required],
      paymentMethod: [this.expense?.paymentMethod || '', Validators.required],
      invoiceNumber: [this.expense?.invoiceNumber || ''],
      notes: [this.expense?.notes || '', Validators.maxLength(500)]
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
      
      let receiptUrl = this.expense?.receiptUrl || null;

      if (this.selectedFile) {
        receiptUrl = await this.storageService.uploadExpenseReceipt(this.selectedFile);
        if (this.expense?.receiptUrl) {
          await this.storageService.deleteExpenseReceipt(this.expense.receiptUrl);
        }
      }

      const formData: any = {
        ...this.form.value
      };

      if (receiptUrl) {
        formData.receiptUrl = receiptUrl;
      }

      if (this.mode === 'create') {
        console.log('Creando gasto con userId:', currentUser.uid, 'y método de pago:', formData.paymentMethod);
        const id = await this.expenseService.create({
          ...formData,
          createdBy: currentUser.uid
        });
        this.dialogRef.close({ id, ...formData });
      } else {
        await this.expenseService.update(this.expense.id, {
          ...formData,
          updatedBy: currentUser.uid
        });
        this.dialogRef.close({ ...this.expense, ...formData });
      }
    } catch (error: any) {
      this.isSubmitting = false;
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al guardar el gasto',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#f44336'
      });
    }
  }

  isCreateMode() {
    return this.mode === 'create';
  }
}
