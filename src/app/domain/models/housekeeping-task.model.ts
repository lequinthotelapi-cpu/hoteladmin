export type TaskType = 'cleaning' | 'maintenance' | 'inspection' | 'deep-cleaning';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ChecklistItem {
  item: string;
  completed: boolean;
  order: number;
}

export interface HousekeepingTask {
  id?: string;
  
  // Relaciones
  roomId: string;
  roomNumber: string;
  floor: number;
  assignedTo?: string;
  assignedToName?: string;
  
  // Tipo de tarea
  taskType: TaskType;
  
  // Estado
  status: TaskStatus;
  priority: TaskPriority;
  
  // Tiempos
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number; // minutos
  actualDuration?: number; // minutos
  
  // Detalles
  notes?: string;
  completionNotes?: string;
  issuesFound?: string[];
  
  // Checklist
  checklist?: ChecklistItem[];
  
  // Auditoría
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface CreateHousekeepingTaskDto {
  roomId: string;
  roomNumber: string;
  floor: number;
  taskType: TaskType;
  priority: TaskPriority;
  scheduledDate: Date;
  estimatedDuration: number;
  notes?: string;
  assignedTo?: string;
  assignedToName?: string;
  checklist?: ChecklistItem[];
}

export interface UpdateHousekeepingTaskDto {
  assignedTo?: string;
  assignedToName?: string;
  priority?: TaskPriority;
  scheduledDate?: Date;
  notes?: string;
  checklist?: ChecklistItem[];
}

export interface StartTaskDto {
  startedAt: Date;
}

export interface CompleteTaskDto {
  completedAt: Date;
  actualDuration: number;
  completionNotes?: string;
  issuesFound?: string[];
  requiresMaintenance?: boolean;
  maintenanceNotes?: string;
}

export interface DashboardStats {
  totalPending: number;
  totalInProgress: number;
  totalCompletedToday: number;
  totalOverdue: number;
  averageDuration: number;
  employeeStats: EmployeeStats[];
  tasksByPriority: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
  tasksByType: {
    cleaning: number;
    maintenance: number;
    inspection: number;
    deepCleaning: number;
  };
}

export interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  averageDuration: number;
  completionRate: number;
}
