import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { User, CreateUserData, UpdateUserData, UserRole } from '../../../../domain/models/user.model';
import { UserService } from '../../../../core/services/user.service';
import { StorageService } from '../../../../core/services/storage.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { ParameterOption } from '../../../../domain/models/parameter.model';

interface DialogData {
  mode: 'create' | 'update';
  user?: User;
}

@Component({
  selector: 'fury-user-create-update',
  templateUrl: './user-create-update.component.html',
  styleUrls: ['./user-create-update.component.scss']
})
export class UserCreateUpdateComponent implements OnInit {
  form: FormGroup;
  mode: 'create' | 'update';
  loading = false;
  avatarFile: File | null = null;
  avatarPreview: string | null = null;
  showEmployeeFields = false;
  employeePositions: ParameterOption[] = [];
  employeeDepartments: ParameterOption[] = [];

  roles: UserRole[] = ['superadmin', 'admin', 'manager', 'receptionist', 'housekeeper', 'guest'];
  genders = ['masculino', 'femenino'];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private storageService: StorageService,
    private alertService: AlertService,
    private parametersService: ParametersService,
    private dialogRef: MatDialogRef<UserCreateUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.mode = data.mode;
  }

  ngOnInit() {
    this.parametersService.loaded$.subscribe(loaded => {
      if (loaded) {
        this.employeePositions = this.parametersService.getOptions('employeePositions');
        this.employeeDepartments = this.parametersService.getOptions('employeeDepartments');
      }
    });

    this.buildForm();
    if (this.mode === 'update' && this.data.user) {
      this.form.patchValue(this.data.user);
      if (this.data.user.emergencyContact) {
        this.form.patchValue({
          emergencyContactName: this.data.user.emergencyContact.name,
          emergencyContactPhone: this.data.user.emergencyContact.phone,
          emergencyContactRelationship: this.data.user.emergencyContact.relationship
        });
      }
      this.avatarPreview = this.data.user.avatarUrl || null;
      this.checkEmployeeRole(this.data.user.role);
    }

    this.form.get('role')?.valueChanges.subscribe(role => {
      this.checkEmployeeRole(role);
    });
  }

  checkEmployeeRole(role: string) {
    this.showEmployeeFields = ['manager', 'receptionist', 'housekeeper'].includes(role);
    if (this.showEmployeeFields) {
      this.form.get('position')?.setValidators(Validators.required);
      this.form.get('department')?.setValidators(Validators.required);
      this.form.get('phone')?.setValidators(Validators.required);
      this.form.get('salary')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('hireDate')?.setValidators(Validators.required);
      this.form.get('emergencyContactName')?.setValidators(Validators.required);
      this.form.get('emergencyContactPhone')?.setValidators(Validators.required);
      this.form.get('emergencyContactRelationship')?.setValidators(Validators.required);
    } else {
      this.form.get('position')?.clearValidators();
      this.form.get('department')?.clearValidators();
      this.form.get('phone')?.clearValidators();
      this.form.get('salary')?.clearValidators();
      this.form.get('hireDate')?.clearValidators();
      this.form.get('emergencyContactName')?.clearValidators();
      this.form.get('emergencyContactPhone')?.clearValidators();
      this.form.get('emergencyContactRelationship')?.clearValidators();
    }
    this.form.get('position')?.updateValueAndValidity();
    this.form.get('department')?.updateValueAndValidity();
    this.form.get('phone')?.updateValueAndValidity();
    this.form.get('salary')?.updateValueAndValidity();
    this.form.get('hireDate')?.updateValueAndValidity();
    this.form.get('emergencyContactName')?.updateValueAndValidity();
    this.form.get('emergencyContactPhone')?.updateValueAndValidity();
    this.form.get('emergencyContactRelationship')?.updateValueAndValidity();
  }

  buildForm() {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [this.mode === 'create' ? '' : null, this.mode === 'create' ? [Validators.required, Validators.minLength(6)] : []],
      document: ['', Validators.required],
      gender: ['masculino', Validators.required],
      role: ['guest', Validators.required],
      active: [true],
      maxSessions: [1, [Validators.required, Validators.min(1)]],
      activeUntil: [null],
      position: [''],
      department: [''],
      phone: [''],
      salary: [0],
      hireDate: [new Date()],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      emergencyContactRelationship: ['']
    });

    if (this.mode === 'update') {
      this.form.get('email')?.disable();
      this.form.get('password')?.clearValidators();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.avatarFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      let avatarUrl = this.data.user?.avatarUrl;
      const formData = this.form.getRawValue();

      const userData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        document: formData.document,
        gender: formData.gender,
        role: formData.role,
        active: formData.active,
        maxSessions: formData.maxSessions,
        activeUntil: formData.activeUntil
      };

      if (this.showEmployeeFields) {
        userData.position = formData.position;
        userData.department = formData.department;
        userData.phone = formData.phone;
        userData.salary = formData.salary;
        userData.hireDate = formData.hireDate;
        userData.emergencyContact = {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelationship
        };
      }

      if (this.mode === 'create') {
        userData.password = formData.password;
        const user = await this.userService.createUser(userData);
        
        if (this.avatarFile) {
          avatarUrl = await this.storageService.uploadUserAvatar(this.avatarFile, user.uid);
          await this.userService.updateUser(user.uid, { avatarUrl });
        }
      } else {
        if (this.avatarFile) {
          avatarUrl = await this.storageService.uploadUserAvatar(this.avatarFile, this.data.user!.uid);
          userData.avatarUrl = avatarUrl;
        }
        
        delete userData.email;
        delete userData.password;
        await this.userService.updateUser(this.data.user!.uid, userData);
      }

      this.dialogRef.close(true);
    } catch (error: any) {
      this.alertService.error(error.message || 'Error al guardar usuario');
    } finally {
      this.loading = false;
    }
  }
}
