import { Injectable } from '@angular/core';
import { Observable, map, combineLatest, of, firstValueFrom } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { HousekeepingTaskRepository } from '../../domain/repositories/housekeeping-task.repository';
import { HousekeepingTaskFirebaseRepository } from '../repositories/housekeeping-task-firebase.repository';
import { 
  HousekeepingTask, 
  CreateHousekeepingTaskDto, 
  UpdateHousekeepingTaskDto,
  StartTaskDto,
  CompleteTaskDto,
  DashboardStats,
  EmployeeStats,
  TaskStatus,
  TaskType,
  TaskPriority
} from '../../domain/models/housekeeping-task.model';
import { RoomService } from './room.service';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class HousekeepingService {
  private repository: HousekeepingTaskRepository;

  constructor(
    private firebaseRepository: HousekeepingTaskFirebaseRepository,
    private roomService: RoomService,
    private notificationService: NotificationService,
    private userService: UserService
  ) {
    this.repository = this.firebaseRepository;
  }

  // CRUD básico
  getAll(): Observable<HousekeepingTask[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<HousekeepingTask | undefined> {
    return this.repository.getById(id);
  }

  getByRoom(roomId: string): Observable<HousekeepingTask[]> {
    return this.repository.getByRoom(roomId);
  }

  getByEmployee(employeeId: string): Observable<HousekeepingTask[]> {
    return this.repository.getByEmployee(employeeId);
  }

  getByStatus(status: TaskStatus): Observable<HousekeepingTask[]> {
    return this.repository.getByStatus(status);
  }

  getPendingTasks(): Observable<HousekeepingTask[]> {
    return this.repository.getPendingTasks();
  }

  getInProgressTasks(): Observable<HousekeepingTask[]> {
    return this.repository.getInProgressTasks();
  }

  getCompletedToday(): Observable<HousekeepingTask[]> {
    return this.repository.getCompletedToday();
  }

  getOverdueTasks(): Observable<HousekeepingTask[]> {
    return this.repository.getOverdueTasks();
  }

  async createTask(dto: CreateHousekeepingTaskDto, userId: string): Promise<string> {
    // Validaciones
    if (dto.estimatedDuration <= 0) {
      throw new Error('La duración estimada debe ser mayor a 0');
    }

    if (dto.scheduledDate < new Date()) {
      console.warn('La fecha programada es en el pasado');
    }

    const taskId = await this.repository.create(dto, userId);
    
    // Cambiar estado de habitación según el tipo de tarea
    if (dto.taskType === 'cleaning' || dto.taskType === 'deep-cleaning') {
      await this.roomService.changeRoomStatus(dto.roomId, 'cleaning', userId);
    } else if (dto.taskType === 'maintenance') {
      await this.roomService.changeRoomStatus(dto.roomId, 'maintenance', userId);
    }
    
    return taskId;
  }

  async updateTask(id: string, dto: UpdateHousekeepingTaskDto, userId: string): Promise<void> {
    await this.repository.update(id, dto, userId);
  }

  async deleteTask(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  // Métodos especiales

  /**
   * Crear tarea automáticamente después de checkout
   */
  async createTaskFromCheckout(
    roomId: string,
    roomNumber: string,
    floor: number,
    userId: string
  ): Promise<string> {
    const dto: CreateHousekeepingTaskDto = {
      roomId,
      roomNumber,
      floor,
      taskType: 'cleaning',
      priority: 'high',
      scheduledDate: new Date(),
      estimatedDuration: 30,
      notes: 'Limpieza después de checkout'
    };

    const taskId = await this.createTask(dto, userId);
    
    // Cambiar estado de habitación a "cleaning"
    await this.roomService.changeRoomStatus(roomId, 'cleaning', userId);

    return taskId;
  }

  /**
   * Asignar tarea a un empleado
   */
  async assignTask(
    taskId: string,
    employeeId: string,
    employeeName: string,
    userId: string
  ): Promise<void> {
    const dto: UpdateHousekeepingTaskDto = {
      assignedTo: employeeId,
      assignedToName: employeeName
    };

    await this.updateTask(taskId, dto, userId);

    // Actualizar assignedHousekeeperId en la habitación
    const task = await firstValueFrom(this.getById(taskId));
    if (task) {
      await this.roomService.assignHousekeeper(task.roomId, employeeId, userId);
      
      // Notificar al empleado
      const taskTypeLabel = this.getTaskTypeLabel(task.taskType);
      await this.notificationService.notifyHousekeepingTask(
        employeeId,
        task.roomNumber,
        taskTypeLabel
      );
    }
  }

  private getTaskTypeLabel(type: TaskType): string {
    const labels: { [key: string]: string } = {
      'cleaning': 'Limpieza',
      'maintenance': 'Mantenimiento',
      'inspection': 'Inspección',
      'deep-cleaning': 'Limpieza Profunda'
    };
    return labels[type] || type;
  }

  /**
   * Iniciar tarea
   */
  async startTask(taskId: string, userId: string): Promise<void> {
    const task = await firstValueFrom(this.getById(taskId));
    
    if (!task) {
      throw new Error('Tarea no encontrada');
    }

    if (task.status !== 'pending') {
      throw new Error('Solo se pueden iniciar tareas pendientes');
    }

    if (!task.assignedTo) {
      throw new Error('La tarea debe estar asignada a un empleado');
    }

    // Actualizar estado
    await this.repository.updateStatus(taskId, 'in-progress', userId);
    
    // Actualizar startedAt usando el repository
    const updateData: any = {
      startedAt: new Date()
    };
    await this.repository.update(taskId, updateData, userId);
  }

  /**
   * Completar tarea
   */
  async completeTask(
    taskId: string,
    dto: CompleteTaskDto,
    userId: string
  ): Promise<void> {
    const task = await firstValueFrom(this.getById(taskId));
    
    if (!task) {
      throw new Error('Tarea no encontrada');
    }

    if (task.status !== 'in-progress') {
      throw new Error('Solo se pueden completar tareas en progreso');
    }

    if (dto.actualDuration <= 0) {
      throw new Error('La duración real debe ser mayor a 0');
    }

    // Actualizar tarea usando el repository
    const updateData: any = {
      status: 'completed',
      completedAt: dto.completedAt,
      actualDuration: dto.actualDuration,
      completionNotes: dto.completionNotes || null,
      issuesFound: dto.issuesFound || []
    };
    
    await this.repository.update(taskId, updateData, userId);

    // Si requiere mantenimiento, crear nueva tarea
    if (dto.requiresMaintenance) {
      await this.createMaintenanceTask(
        task.roomId,
        task.roomNumber,
        task.floor,
        dto.maintenanceNotes || 'Requiere mantenimiento',
        userId
      );
    } else {
      // Si no requiere mantenimiento, marcar habitación como disponible
      await this.roomService.changeRoomStatus(task.roomId, 'available', userId);
      await this.roomService.assignHousekeeper(task.roomId, '', userId); // Limpiar asignación
    }
  }

  /**
   * Crear tarea de mantenimiento
   */
  async createMaintenanceTask(
    roomId: string,
    roomNumber: string,
    floor: number,
    notes: string,
    userId: string
  ): Promise<string> {
    const dto: CreateHousekeepingTaskDto = {
      roomId,
      roomNumber,
      floor,
      taskType: 'maintenance',
      priority: 'high',
      scheduledDate: new Date(),
      estimatedDuration: 60,
      notes
    };

    const taskId = await this.createTask(dto, userId);
    
    // Cambiar estado de habitación a "maintenance"
    await this.roomService.changeRoomStatus(roomId, 'maintenance', userId);

    return taskId;
  }

  /**
   * Cancelar tarea
   */
  async cancelTask(taskId: string, userId: string): Promise<void> {
    const task = await firstValueFrom(this.getById(taskId));
    
    if (!task) {
      throw new Error('Tarea no encontrada');
    }

    if (task.status === 'completed') {
      throw new Error('No se puede cancelar una tarea completada');
    }

    await this.repository.updateStatus(taskId, 'cancelled', userId);

    // Limpiar asignación de housekeeper en la habitación
    if (task.assignedTo) {
      await this.roomService.assignHousekeeper(task.roomId, '', userId);
    }
  }

  /**
   * Obtener estadísticas para el dashboard
   */
  getDashboardStats(): Observable<DashboardStats> {
    return combineLatest([
      this.getPendingTasks(),
      this.getInProgressTasks(),
      this.getCompletedToday(),
      this.getOverdueTasks(),
      this.getAll()
    ]).pipe(
      map(([pending, inProgress, completedToday, overdue, allTasks]) => {
        // Calcular duración promedio
        const completedTasks = allTasks.filter(t => t.status === 'completed' && t.actualDuration);
        const averageDuration = completedTasks.length > 0
          ? completedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTasks.length
          : 0;

        // Estadísticas por empleado
        const employeeMap = new Map<string, EmployeeStats>();
        allTasks.forEach(task => {
          if (task.assignedTo) {
            if (!employeeMap.has(task.assignedTo)) {
              employeeMap.set(task.assignedTo, {
                employeeId: task.assignedTo,
                employeeName: task.assignedToName || 'Sin nombre',
                tasksAssigned: 0,
                tasksCompleted: 0,
                tasksInProgress: 0,
                averageDuration: 0,
                completionRate: 0
              });
            }

            const stats = employeeMap.get(task.assignedTo)!;
            stats.tasksAssigned++;
            
            if (task.status === 'completed') {
              stats.tasksCompleted++;
            } else if (task.status === 'in-progress') {
              stats.tasksInProgress++;
            }
          }
        });

        // Calcular completion rate y duración promedio por empleado
        const employeeStats = Array.from(employeeMap.values()).map(stats => {
          stats.completionRate = stats.tasksAssigned > 0
            ? (stats.tasksCompleted / stats.tasksAssigned) * 100
            : 0;

          const employeeTasks = completedTasks.filter(t => t.assignedTo === stats.employeeId);
          stats.averageDuration = employeeTasks.length > 0
            ? employeeTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / employeeTasks.length
            : 0;

          return stats;
        });

        // Tareas por prioridad
        const tasksByPriority = {
          low: allTasks.filter(t => t.priority === 'low' && t.status !== 'completed').length,
          normal: allTasks.filter(t => t.priority === 'normal' && t.status !== 'completed').length,
          high: allTasks.filter(t => t.priority === 'high' && t.status !== 'completed').length,
          urgent: allTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length
        };

        // Tareas por tipo
        const tasksByType = {
          cleaning: allTasks.filter(t => t.taskType === 'cleaning' && t.status !== 'completed').length,
          maintenance: allTasks.filter(t => t.taskType === 'maintenance' && t.status !== 'completed').length,
          inspection: allTasks.filter(t => t.taskType === 'inspection' && t.status !== 'completed').length,
          deepCleaning: allTasks.filter(t => t.taskType === 'deep-cleaning' && t.status !== 'completed').length
        };

        return {
          totalPending: pending.length,
          totalInProgress: inProgress.length,
          totalCompletedToday: completedToday.length,
          totalOverdue: overdue.length,
          averageDuration: Math.round(averageDuration),
          employeeStats,
          tasksByPriority,
          tasksByType
        };
      })
    );
  }
}
