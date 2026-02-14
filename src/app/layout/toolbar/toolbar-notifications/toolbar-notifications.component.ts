import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { LIST_FADE_ANIMATION } from '../../../../@fury/shared/list.animation';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { Notification } from '../../../domain/models/notification.model';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'fury-toolbar-notifications',
  templateUrl: './toolbar-notifications.component.html',
  styleUrls: ['./toolbar-notifications.component.scss'],
  animations: [...LIST_FADE_ANIMATION],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarNotificationsComponent implements OnInit, OnDestroy {

  notifications: Notification[] = [];
  unreadCount = 0;
  isOpen: boolean;
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      if (user) {
        // Subscribe to notifications
        const notifSub = this.notificationService.getUserNotifications(user.uid).subscribe(notifications => {
          this.notifications = notifications;
          this.cdr.markForCheck();
        });

        // Subscribe to unread count
        const countSub = this.notificationService.getUnreadCount(user.uid).subscribe(count => {
          this.unreadCount = count;
          this.cdr.markForCheck();
        });

        this.subscriptions.push(notifSub, countSub);
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async markAsRead(notification: Notification) {
    if (!notification.read && notification.id) {
      await this.notificationService.markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.isOpen = false;
    }
  }

  async dismiss(notification: Notification, event: Event) {
    event.stopPropagation();
    if (notification.id) {
      await this.notificationService.deleteNotification(notification.id);
    }
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  onClickOutside() {
    this.isOpen = false;
  }

  async markAllAsRead() {
    const user = await this.authService.getCurrentUser();
    if (user) {
      await this.notificationService.markAllAsRead(user.uid);
    }
  }

  getIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'check-in': 'login',
      'check-out': 'logout',
      'housekeeping': 'cleaning_services',
      'booking': 'event',
      'payment': 'payments',
      'inventory': 'inventory_2',
      'system': 'info'
    };
    return icons[type] || 'notifications';
  }

  getColorClass(priority: string): string {
    const colors: { [key: string]: string } = {
      'high': 'warn',
      'medium': 'accent',
      'low': ''
    };
    return colors[priority] || '';
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'hace unos segundos';
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`;
    return `hace ${Math.floor(seconds / 86400)} días`;
  }
}
