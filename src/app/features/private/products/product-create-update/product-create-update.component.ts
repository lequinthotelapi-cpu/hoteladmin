import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Product } from '../../../../domain/models/product.model';
import { ProductService } from '../../../../core/services/product.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StorageService } from '../../../../core/services/storage.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { ParameterOption } from '../../../../domain/models/parameter.model';

@Component({
  selector: 'fury-product-create-update',
  templateUrl: './product-create-update.component.html',
  styleUrls: ['./product-create-update.component.scss']
})
export class ProductCreateUpdateComponent implements OnInit {
  form: FormGroup;
  mode: 'create' | 'update' = 'create';
  productCategories: ParameterOption[] = [];
  measurementUnits: ParameterOption[] = [];
  selectedFile: File | null = null;
  photoPreview: string | null = null;
  isSubmitting = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public product: Product,
    private dialogRef: MatDialogRef<ProductCreateUpdateComponent>,
    private fb: FormBuilder,
    private productService: ProductService,
    private authService: AuthService,
    private storageService: StorageService,
    private parametersService: ParametersService
  ) {}

  ngOnInit() {
    this.mode = this.product ? 'update' : 'create';
    
    this.parametersService.loaded$.subscribe(loaded => {
      if (loaded) {
        this.loadParameters();
        if (!this.form) {
          this.buildForm();
        }
      }
    });

    if (this.product?.photoUrl) {
      this.photoPreview = this.product.photoUrl;
    }
  }

  loadParameters() {
    this.productCategories = this.parametersService.getOptions('productCategories');
    this.measurementUnits = this.parametersService.getOptions('measurementUnits');
    console.log('Categories:', this.productCategories);
    console.log('Units:', this.measurementUnits);
  }

  buildForm() {
    this.form = this.fb.group({
      code: [this.product?.code || '', [Validators.required, Validators.maxLength(50)]],
      name: [this.product?.name || '', [Validators.required, Validators.maxLength(200)]],
      description: [this.product?.description || '', Validators.maxLength(500)],
      category: [this.product?.category || '', Validators.required],
      measurementUnit: [this.product?.measurementUnit || '', Validators.required],
      currentStock: [this.product?.currentStock || 0, [Validators.required, Validators.min(0)]],
      minStock: [this.product?.minStock || 0, [Validators.required, Validators.min(0)]],
      cost: [this.product?.cost || 0, [Validators.required, Validators.min(0)]],
      price: [this.product?.price || 0, [Validators.required, Validators.min(0)]],
      isActive: [this.product?.isActive ?? true]
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto() {
    this.selectedFile = null;
    this.photoPreview = null;
  }

  async save() {
    if (this.form.invalid) {
      return;
    }

    this.isSubmitting = true;

    try {
      const currentUser = this.authService.getCurrentUser();
      let photoUrl = this.product?.photoUrl || null;

      if (this.selectedFile) {
        photoUrl = await this.storageService.uploadProductPhoto(this.selectedFile);
        if (this.product?.photoUrl) {
          await this.storageService.deleteProductPhoto(this.product.photoUrl);
        }
      }

      const formData: any = {
        ...this.form.value
      };

      if (photoUrl) {
        formData.photoUrl = photoUrl;
      }

      if (this.mode === 'create') {
        const id = await this.productService.create({
          ...formData,
          createdBy: currentUser.uid
        });
        this.dialogRef.close({ id, ...formData });
      } else {
        await this.productService.update(this.product.id, {
          ...formData,
          updatedBy: currentUser.uid
        });
        this.dialogRef.close({ ...this.product, ...formData });
      }
    } catch (error: any) {
      this.isSubmitting = false;
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al guardar el producto',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#f44336'
      });
    }
  }

  isCreateMode() {
    return this.mode === 'create';
  }
}
