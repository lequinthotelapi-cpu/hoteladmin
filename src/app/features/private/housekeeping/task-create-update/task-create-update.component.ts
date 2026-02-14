import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HousekeepingService } from '../../../../core/services/housekeeping.service';
import { RoomService } from '../../../../core/services/room.service';
import { UserService } from '../../../../core/services/user.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HousekeepingTask, CreateHousekeepingTaskDto, UpdateHousekeepingTaskDto } from '../../../../domain/models/housekeeping-task.model';
import { Room } from '../../../../domain/models/room.model';
import { User } from '../../../../domain/models/user.model';
import { ParameterOption } from '../../../../domain/models/parameter.model';

@Component({
  selector: 'app-task-create-update',
  templateUrl: './task-create-update.component.html',
  styleUrls: ['./task-create-update.component.scss']
})
export class TaskCreateUpdateComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  loading = false;
  currentUserId = '';

  rooms: Room[] = [];
  housekeepers: User[] = [];
  taskTypes: ParameterOption[] = [];
  taskPriorities: ParameterOption[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TaskCreateUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      task: HousekeepingTask | null,
      prefilledRoom?: { id: string, roomNumber: string, floor: number }
    },
    private housekeepingService: HousekeepingService,
    private roomService: RoomService,
    private userService: UserService,
    private parametersService: ParametersService,
    private alertService: AlertService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId = user.uid;
    }

    this.isEditMode = !!this.data.task;
    
    // Cargar datos inmediatamente si los parámetros ya están cargados
    if (this.parametersService.isLoaded()) {
      this.loadData();
      this.buildForm();
    } else {
      // Esperar a que los parámetros estén cargados
      this.parametersService.loaded$.subscribe(loaded => {
        if (loaded && this.taskTypes.length === 0) {
          this.loadData();
          this.buildForm();
        }
      });
    }
  }

  loadData(): void {
    this.roomService.getAll().subscribe(rooms => {
      this.rooms = rooms.filter(r => r.isActive);
    });

    this.userService.getUsersByRole('housekeeper').subscribe(users => {
      this.housekeepers = users.filter(u => u.active);
    });

    this.taskTypes = this.parametersService.getOptions('taskTypes');
    this.taskPriorities = this.parametersService.getOptions('taskPriorities');
  }

  buildForm(): void {
    const task = this.data.task;
    const prefilledRoom = this.data.prefilledRoom;

    this.form = this.fb.group({
      roomId: [task?.roomId || prefilledRoom?.id || '', Validators.required],
      taskType: [task?.taskType || 'cleaning', Validators.required],
      priority: [task?.priority || 'normal', Validators.required],
      scheduledDate: [task?.scheduledDate || new Date(), Validators.required],
      estimatedDuration: [task?.estimatedDuration || 30, [Validators.required, Validators.min(1)]],
      assignedTo: [task?.assignedTo || ''],
      notes: [task?.notes || '']
    });

    // Si hay habitación pre-seleccionada, deshabilitar el campo
    if (prefilledRoom && !this.isEditMode) {
      this.form.get('roomId')?.disable();
    }
  }

  onRoomChange(): void {
    const roomId = this.form.get('roomId')?.value;
    const room = this.rooms.find(r => r.id === roomId);
    // Aquí podrías ajustar la duración estimada según el tipo de habitación
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      // Obtener el valor real del roomId (puede estar deshabilitado)
      const formValue = this.form.getRawValue();
      const room = this.rooms.find(r => r.id === formValue.roomId) || this.data.prefilledRoom;
      const housekeeper = this.housekeepers.find(h => h.uid === formValue.assignedTo);

      if (this.isEditMode) {
        const dto: UpdateHousekeepingTaskDto = {
          priority: formValue.priority,
          scheduledDate: formValue.scheduledDate,
          notes: formValue.notes,
          assignedTo: formValue.assignedTo || undefined,
          assignedToName: housekeeper ? `${housekeeper.firstName} ${housekeeper.lastName}` : undefined
        };

        await this.housekeepingService.updateTask(this.data.task!.id!, dto, this.currentUserId);
        this.alertService.success('Tarea actualizada');
      } else {
        const dto: CreateHousekeepingTaskDto = {
          roomId: formValue.roomId,
          roomNumber: room!.roomNumber,
          floor: room!.floor,
          taskType: formValue.taskType,
          priority: formValue.priority,
          scheduledDate: formValue.scheduledDate,
          estimatedDuration: formValue.estimatedDuration,
          notes: formValue.notes,
          assignedTo: formValue.assignedTo || undefined,
          assignedToName: housekeeper ? `${housekeeper.firstName} ${housekeeper.lastName}` : undefined
        };

        await this.housekeepingService.createTask(dto, this.currentUserId);
        this.alertService.success('Tarea creada');
      }

      this.dialogRef.close(true);
    } catch (error: any) {
      this.alertService.error(error.message || 'Error al guardar tarea');
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
