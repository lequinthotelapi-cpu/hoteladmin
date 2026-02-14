import { Observable } from 'rxjs';
import { Notification } from '../models/notification.model';

export abstract class NotificationRepository {
  abstract create(notification: Notification): Promise<string>;
  abstract getByUserId(userId: string): Observable<Notification[]>;
  abstract getUnreadCount(userId: string): Observable<number>;
  abstract markAsRead(notificationId: string): Promise<void>;
  abstract markAllAsRead(userId: string): Promise<void>;
  abstract delete(notificationId: string): Promise<void>;
}
