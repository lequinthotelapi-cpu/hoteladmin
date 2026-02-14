import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { HousekeepingService } from '../../../../core/services/housekeeping.service';
import { DashboardStats } from '../../../../domain/models/housekeeping-task.model';

@Component({
  selector: 'app-housekeeping-dashboard',
  templateUrl: './housekeeping-dashboard.component.html',
  styleUrls: ['./housekeeping-dashboard.component.scss']
})
export class HousekeepingDashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(private housekeepingService: HousekeepingService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStats(): void {
    this.loading = true;
    this.housekeepingService.getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
          this.loading = false;
        }
      });
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      low: '#10b981',
      normal: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    };
    return colors[priority] || '#6b7280';
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      cleaning: 'cleaning_services',
      maintenance: 'build',
      inspection: 'search',
      deepCleaning: 'auto_awesome'
    };
    return icons[type] || 'task';
  }
}
