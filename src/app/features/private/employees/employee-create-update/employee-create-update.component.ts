import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { User } from '../../../../domain/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { StorageService } from '../../../../core/services/storage.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { ParameterOption } from '../../../../domain/models/parameter.model';

@Component({
  selector: 'fury-employee-create-update',
  templateUrl: './employee-create-update.component.html',
  styleUrls: ['./employee-create-update.component.scss']
})
export class EmployeeCreateUpdateComponent implements OnInit {
  form: FormGroup;
  mode: 'create' | 'update' = 'create';
  employeePositions: ParameterOption[] = [];
  employeeDepartments: ParameterOption[] = [];
  selectedFile: File | null = null;
  avatarPreview: string | null = null;
  isSubmitting = false;

  employeeRoles = [
    { value: 'manager', label: 'Gerente' },
    { value: 'receptionist', label: 'Recepcionista' },
    { value: 'housekeeper', label: 'Camarera' }
  ];

  genders = [
    { value: 'masculino', label: 'Masculino' },
    { value: 'femenino', label: 'Femenino' }
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public employee: User,
    private dialogRef: MatDialogRef<EmployeeCreateUpdateComponent>,
    private fb: FormBuilder,
    private userService: UserService,
    private storageService: StorageService,
    private parametersService: ParametersService
  ) {}

  ngOnInit() {
    this.mode = this.employee ? 'update' : 'create';
    
    this.parametersService.loaded$.subscribe(loaded => {
      if (loaded) {
        this.employeePositions = this.parametersService.getOptions('employeePositions');
        this.employeeDepartments = this.parametersService.getOptions('employeeDepartments');
      }
    });

    this.buildForm();

    if (this.employee?.avatarUrl) {
      this.avatarPreview = this.employee.avatarUrl;
    }
  }

  buildForm() {
    this.form = this.fb.group({
      firstName: [this.employee?.firstName || '', [Validators.required, Validators.maxLength(50)]],
      lastName: [this.employee?.lastName || '', [Validators.required, Validators.maxLength(50)]],
      email: [this.employee?.email || '', [Validators.required, Validators.email]],
      password: ['', this.mode === 'create' ? [Validators.required, Validators.minLength(6)] : []],
      document: [this.employee?.document || '', Validators.required],
      gender: [this.employee?.gender || '', Validators.required],
      role: [this.employee?.role || '', Validators.required],
      position: [this.employee?.position || '', Validators.required],
      department: [this.employee?.department || '', Validators.required],
      phone: [this.employee?.phone || '', Validators.required],
      salary: [this.employee?.salary || 0, [Validators.required, Validators.min(0)]],
      hireDate: [this.employee?.hireDate || new Date(), Validators.required],
      active: [this.employee?.active ?? true],
      emergencyContactName: [this.employee?.emergencyContact?.name || '', Validators.required],
      emergencyContactPhone: [this.employee?.emergencyContact?.phone || '', Validators.required],
      emergencyContactRelationship: [this.employee?.emergencyContact?.relationship || '', Validators.required]
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar() {
    this.selectedFile = null;
    this.avatarPreview = null;
  }

  async save() {
    if (this.form.invalid) {
      return;
    }

    this.isSubmitting = true;

    try {
      let avatarUrl = this.employee?.avatarUrl;

      if (this.selectedFile) {
        const uid = this.employee?.uid || 'temp';
        avatarUrl = await this.storageService.uploadUserAvatar(this.selectedFile, uid);
        if (this.employee?.avatarUrl) {
          await this.storageService.deleteUserAvatar(this.employee.avatarUrl);
        }
      }

      const formData = this.form.value;
      const userData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        document: formData.document,
        gender: formData.gender,
        role: formData.role,
        position: formData.position,
        department: formData.department,
        phone: formData.phone,
        salary: formData.salary,
        hireDate: formData.hireDate,
        active: formData.active,
        emergencyContact: {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelationship
        }
      };

      if (avatarUrl) {
        userData.avatarUrl = avatarUrl;
      }

      if (this.mode === 'create') {
        userData.password = formData.password;
        await this.userService.createUser(userData);
      } else {
        await this.userService.updateUser(this.employee.uid, userData);
      }

      this.dialogRef.close(userData);
    } catch (error: any) {
      this.isSubmitting = false;
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al guardar el empleado',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#f44336'
      });
    }
  }

  isCreateMode() {
    return this.mode === 'create';
  }
}
