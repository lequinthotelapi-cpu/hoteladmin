import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { HousekeepingService } from '../../../../core/services/housekeeping.service';
import { UserService } from '../../../../core/services/user.service';
import { HousekeepingTask } from '../../../../domain/models/housekeeping-task.model';
import { User } from '../../../../domain/models/user.model';

interface EmployeeWithTasks {
  employee: User;
  tasks: HousekeepingTask[];
  pendingCount: number;
  inProgressCount: number;
}

@Component({
  selector: 'app-housekeeping-by-employee',
  templateUrl: './housekeeping-by-employee.component.html',
  styleUrls: ['./housekeeping-by-employee.component.scss']
})
export class HousekeepingByEmployeeComponent implements OnInit, OnDestroy {
  employeesWithTasks: EmployeeWithTasks[] = [];
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private housekeepingService: HousekeepingService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    combineLatest([
      this.userService.getUsersByRole('housekeeper'),
      this.housekeepingService.getAll()
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ([housekeepers, allTasks]) => {
        this.employeesWithTasks = housekeepers.map(employee => {
          const tasks = allTasks.filter(t => t.assignedTo === employee.uid && t.status !== 'completed' && t.status !== 'cancelled');
          return {
            employee,
            tasks,
            pendingCount: tasks.filter(t => t.status === 'pending').length,
            inProgressCount: tasks.filter(t => t.status === 'in-progress').length
          };
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': '#fbbf24',
      'in-progress': '#3b82f6'
    };
    return colors[status] || '#6b7280';
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
}
