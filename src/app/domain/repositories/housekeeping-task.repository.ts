import { Observable } from 'rxjs';
import { HousekeepingTask, CreateHousekeepingTaskDto, UpdateHousekeepingTaskDto, TaskStatus } from '../models/housekeeping-task.model';

export abstract class HousekeepingTaskRepository {
  abstract getAll(): Observable<HousekeepingTask[]>;
  abstract getById(id: string): Observable<HousekeepingTask | undefined>;
  abstract getByRoom(roomId: string): Observable<HousekeepingTask[]>;
  abstract getByEmployee(employeeId: string): Observable<HousekeepingTask[]>;
  abstract getByStatus(status: TaskStatus): Observable<HousekeepingTask[]>;
  abstract getByDateRange(startDate: Date, endDate: Date): Observable<HousekeepingTask[]>;
  abstract getPendingTasks(): Observable<HousekeepingTask[]>;
  abstract getInProgressTasks(): Observable<HousekeepingTask[]>;
  abstract getCompletedToday(): Observable<HousekeepingTask[]>;
  abstract getOverdueTasks(): Observable<HousekeepingTask[]>;
  abstract create(dto: CreateHousekeepingTaskDto, userId: string): Promise<string>;
  abstract update(id: string, dto: UpdateHousekeepingTaskDto, userId: string): Promise<void>;
  abstract updateStatus(id: string, status: TaskStatus, userId: string): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
