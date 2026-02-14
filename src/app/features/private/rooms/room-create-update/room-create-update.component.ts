import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Room } from '../../../../domain/models/room.model';
import { RoomService } from '../../../../core/services/room.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'fury-room-create-update',
  templateUrl: './room-create-update.component.html',
  styleUrls: ['./room-create-update.component.scss']
})
export class RoomCreateUpdateComponent implements OnInit {
  form: FormGroup;
  mode: 'create' | 'edit';
  room: Room;
  
  roomTypes: any[] = [];
  bedTypes: any[] = [];
  roomStatuses: any[] = [];
  amenities: any[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<RoomCreateUpdateComponent>,
    private fb: FormBuilder,
    private roomService: RoomService,
    private parametersService: ParametersService,
    private alertService: AlertService,
    private authService: AuthService
  ) {
    this.mode = data.mode;
    this.room = data.room;
  }

  ngOnInit(): void {
    this.loadParameters();
    this.buildForm();
  }

  loadParameters(): void {
    this.roomTypes = this.parametersService.getOptions('roomTypes');
    this.bedTypes = this.parametersService.getOptions('bedTypes');
    this.roomStatuses = this.parametersService.getOptions('roomStatuses');
    this.amenities = this.parametersService.getOptions('amenities');
  }

  buildForm(): void {
    this.form = this.fb.group({
      roomNumber: [this.room?.roomNumber || '', Validators.required],
      floor: [this.room?.floor || this.data.defaultFloor || 1, [Validators.required, Validators.min(1)]],
      roomType: [this.room?.roomType || '', Validators.required],
      bedType: [this.room?.bedType || '', Validators.required],
      capacity: [this.room?.capacity || 1, [Validators.required, Validators.min(1)]],
      amenities: [this.room?.amenities || []],
      basePrice: [this.room?.basePrice || 0, [Validators.required, Validators.min(0)]],
      status: [this.room?.status || 'available', Validators.required],
      isActive: [this.room?.isActive !== undefined ? this.room.isActive : true],
      description: [this.room?.description || ''],
      notes: [this.room?.notes || '']
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.warning('Formulario incompleto', 'Por favor complete todos los campos requeridos');
      return;
    }

    this.alertService.loading('Guardando habitación...');

    try {
      const user = this.authService.getCurrentUser();
      const userId = user?.uid || '';
      const formValue = this.form.value;

      if (this.mode === 'create') {
        await this.roomService.createRoom(formValue, userId);
        this.alertService.success('Habitación creada', 'La habitación ha sido creada correctamente');
      } else {
        await this.roomService.updateRoom({ id: this.room.id, ...formValue }, userId);
        this.alertService.success('Habitación actualizada', 'La habitación ha sido actualizada correctamente');
      }

      this.dialogRef.close(true);
    } catch (error: any) {
      this.alertService.error('Error', error.message);
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  get isCreateMode(): boolean {
    return this.mode === 'create';
  }

  getAmenityLabel(value: string): string {
    const amenity = this.amenities.find(a => a.value === value);
    return amenity ? amenity.label : value;
  }
}
