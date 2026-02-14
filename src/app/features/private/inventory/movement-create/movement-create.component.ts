import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { Product } from '../../../../domain/models/product.model';
import { InventoryMovementService } from '../../../../core/services/inventory-movement.service';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { ParameterOption } from '../../../../domain/models/parameter.model';

@Component({
  selector: 'fury-movement-create',
  templateUrl: './movement-create.component.html',
  styleUrls: ['./movement-create.component.scss']
})
export class MovementCreateComponent implements OnInit {
  form: FormGroup;
  products$: Observable<Product[]>;
  movementReasons: ParameterOption[] = [];
  isSubmitting = false;

  movementTypes = [
    { value: 'entry', label: 'Entrada' },
    { value: 'exit', label: 'Salida' },
    { value: 'adjustment', label: 'Ajuste' }
  ];

  constructor(
    private dialogRef: MatDialogRef<MovementCreateComponent>,
    private fb: FormBuilder,
    private movementService: InventoryMovementService,
    private productService: ProductService,
    private authService: AuthService,
    private parametersService: ParametersService
  ) {}

  ngOnInit() {
    this.products$ = this.productService.getAll();
    
    this.parametersService.loaded$.subscribe(loaded => {
      if (loaded) {
        this.movementReasons = this.parametersService.getOptions('movementReasons');
        console.log('Movement Reasons:', this.movementReasons);
      }
    });
    
    this.buildForm();
  }

  buildForm() {
    this.form = this.fb.group({
      productId: ['', Validators.required],
      type: ['', Validators.required],
      reason: ['', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      unitCost: [0, Validators.min(0)],
      invoiceNumber: [''],
      notes: ['', Validators.maxLength(500)]
    });
  }

  async save() {
    if (this.form.invalid) {
      return;
    }

    this.isSubmitting = true;

    try {
      const currentUser = this.authService.getCurrentUser();
      const formData = this.form.value;

      const data: any = {
        productId: formData.productId,
        type: formData.type,
        reason: formData.reason,
        quantity: formData.quantity,
        notes: formData.notes,
        createdBy: currentUser.uid
      };

      if (formData.unitCost > 0) {
        data.unitCost = formData.unitCost;
      }

      if (formData.invoiceNumber) {
        data.invoiceNumber = formData.invoiceNumber;
      }

      await this.movementService.create(data);
      this.dialogRef.close(data);
    } catch (error: any) {
      this.isSubmitting = false;
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al registrar el movimiento',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#f44336'
      });
    }
  }
}
