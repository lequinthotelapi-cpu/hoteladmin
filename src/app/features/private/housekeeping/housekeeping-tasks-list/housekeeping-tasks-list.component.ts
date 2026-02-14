import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { HousekeepingService } from '../../../../core/services/housekeeping.service';
import { HousekeepingTask, TaskStatus } from '../../../../domain/models/housekeeping-task.model';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TaskCreateUpdateComponent } from '../task-create-update/task-create-update.component';

@Component({
  selector: 'app-housekeeping-tasks-list',
  templateUrl: './housekeeping-tasks-list.component.html',
  styleUrls: ['./housekeeping-tasks-list.component.scss']
})
export class HousekeepingTasksListComponent implements OnInit, OnDestroy {
  displayedColumns = ['roomNumber', 'floor', 'taskType', 'priority', 'status', 'assignedToName', 'scheduledDate', 'actions'];
  dataSource = new MatTableDataSource<HousekeepingTask>([]);
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  filterStatus: TaskStatus | 'all' = 'all';
  loading = true;
  currentUserId = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private housekeepingService: HousekeepingService,
    private alertService: AlertService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserId = user.uid;
    }
    
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadTasks(): void {
    this.loading = true;
    const observable = this.filterStatus === 'all' 
      ? this.housekeepingService.getAll()
      : this.housekeepingService.getByStatus(this.filterStatus);

    observable.pipe(takeUntil(this.destroy$)).subscribe({
      next: (tasks) => {
        this.dataSource.data = tasks;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.alertService.error('Error al cargar tareas');
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  onFilterStatusChange(): void {
    this.loadTasks();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(TaskCreateUpdateComponent, {
      width: '600px',
      data: { task: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTasks();
      }
    });
  }

  openEditDialog(task: HousekeepingTask): void {
    const dialogRef = this.dialog.open(TaskCreateUpdateComponent, {
      width: '600px',
      data: { task }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTasks();
      }
    });
  }

  async completeTask(task: HousekeepingTask): Promise<void> {
    // Si la tarea está pendiente, iniciarla automáticamente primero
    if (task.status === 'pending') {
      if (!task.assignedTo) {
        this.alertService.error('La tarea debe estar asignada a un empleado');
        return;
      }
      try {
        await this.housekeepingService.startTask(task.id!, this.currentUserId);
      } catch (error: any) {
        this.alertService.error(error.message || 'Error al iniciar tarea');
        return;
      }
    }

    const Swal = (await import('sweetalert2')).default;
    
    const { value: formValues } = await Swal.fire({
      title: 'Completar Tarea',
      html:
        '<label>Duración Real (minutos)</label>' +
        '<input id="duration" type="number" class="swal2-input" placeholder="30" min="1">' +
        '<label>Notas de Completación</label>' +
        '<textarea id="notes" class="swal2-textarea" placeholder="Notas opcionales"></textarea>' +
        '<label><input id="maintenance" type="checkbox"> Requiere mantenimiento</label>' +
        '<textarea id="maintenanceNotes" class="swal2-textarea" placeholder="Notas de mantenimiento" style="display:none"></textarea>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Completar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const maintenanceCheckbox = document.getElementById('maintenance') as HTMLInputElement;
        const maintenanceNotes = document.getElementById('maintenanceNotes') as HTMLTextAreaElement;
        maintenanceCheckbox?.addEventListener('change', () => {
          if (maintenanceNotes) {
            maintenanceNotes.style.display = maintenanceCheckbox.checked ? 'block' : 'none';
          }
        });
      },
      preConfirm: () => {
        const duration = (document.getElementById('duration') as HTMLInputElement).value;
        const notes = (document.getElementById('notes') as HTMLTextAreaElement).value;
        const maintenance = (document.getElementById('maintenance') as HTMLInputElement).checked;
        const maintenanceNotes = (document.getElementById('maintenanceNotes') as HTMLTextAreaElement).value;
        
        if (!duration || parseInt(duration) <= 0) {
          Swal.showValidationMessage('La duración debe ser mayor a 0');
          return false;
        }
        
        return { duration: parseInt(duration), notes, maintenance, maintenanceNotes };
      }
    });

    if (formValues) {
      try {
        await this.housekeepingService.completeTask(
          task.id!,
          {
            completedAt: new Date(),
            actualDuration: formValues.duration,
            completionNotes: formValues.notes,
            requiresMaintenance: formValues.maintenance,
            maintenanceNotes: formValues.maintenanceNotes,
            issuesFound: []
          },
          this.currentUserId
        );
        this.alertService.success('Tarea completada');
      } catch (error: any) {
        this.alertService.error(error.message || 'Error al completar tarea');
      }
    }
  }

  async cancelTask(task: HousekeepingTask): Promise<void> {
    const confirmed = await this.alertService.confirm(
      '¿Cancelar tarea?',
      `¿Estás seguro de cancelar la tarea de la habitación ${task.roomNumber}?`
    );

    if (confirmed) {
      try {
        await this.housekeepingService.cancelTask(task.id!, this.currentUserId);
        this.alertService.success('Tarea cancelada');
      } catch (error: any) {
        this.alertService.error(error.message || 'Error al cancelar tarea');
      }
    }
  }

  async deleteTask(task: HousekeepingTask): Promise<void> {
    const confirmed = await this.alertService.confirmDelete(
      `¿Eliminar tarea de la habitación ${task.roomNumber}?`
    );

    if (confirmed) {
      try {
        await this.housekeepingService.deleteTask(task.id!);
        this.alertService.success('Tarea eliminada');
      } catch (error: any) {
        this.alertService.error(error.message || 'Error al eliminar tarea');
      }
    }
  }

  getStatusColor(status: TaskStatus): string {
    const colors: Record<TaskStatus, string> = {
      'pending': '#fbbf24',
      'in-progress': '#3b82f6',
      'completed': '#10b981',
      'cancelled': '#6b7280'
    };
    return colors[status];
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'low': '#10b981',
      'normal': '#3b82f6',
      'high': '#f59e0b',
      'urgent': '#ef4444'
    };
    return colors[priority] || '#6b7280';
  }

  getTaskTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'cleaning': 'Limpieza',
      'maintenance': 'Mantenimiento',
      'inspection': 'Inspección',
      'deep-cleaning': 'Limpieza Profunda'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      'pending': 'Pendiente',
      'in-progress': 'En Progreso',
      'completed': 'Completada',
      'cancelled': 'Cancelada'
    };
    return labels[status];
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'low': 'Baja',
      'normal': 'Normal',
      'high': 'Alta',
      'urgent': 'Urgente'
    };
    return labels[priority] || priority;
  }
}
