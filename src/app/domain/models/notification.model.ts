export type NotificationType = 'check-in' | 'check-out' | 'housekeeping' | 'booking' | 'payment' | 'inventory' | 'system';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  priority: NotificationPriority;
  metadata?: {
    bookingId?: string;
    taskId?: string;
    roomId?: string;
    productId?: string;
  };
}
