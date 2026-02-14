import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Notification, NotificationType, NotificationPriority } from '../../domain/models/notification.model';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private repository: NotificationRepository,
    private snackBar: MatSnackBar
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'medium',
    actionUrl?: string,
    metadata?: any
  ): Promise<string> {
    const notification: Notification = {
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
      priority,
      actionUrl,
      metadata
    };

    const id = await this.repository.create(notification);

    // Show SweetAlert for high priority, SnackBar for others
    if (priority === 'high') {
      this.showAlert(title, message, actionUrl);
    } else {
      this.showSnackBar(title, message, actionUrl);
    }

    return id;
  }

  getUserNotifications(userId: string): Observable<Notification[]> {
    return this.repository.getByUserId(userId);
  }

  getUnreadCount(userId: string): Observable<number> {
    return this.repository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.repository.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repository.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.repository.delete(notificationId);
  }

  private showSnackBar(title: string, message: string, actionUrl?: string): void {
    this.snackBar.open(`${title}: ${message}`, actionUrl ? 'Ver' : 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['notification-snackbar']
    });
  }

  private showAlert(title: string, message: string, actionUrl?: string): void {
    Swal.fire({
      title: title,
      text: message,
      icon: 'warning',
      confirmButtonText: actionUrl ? 'Ver' : 'Aceptar',
      confirmButtonColor: '#115D8C',
      showCancelButton: !!actionUrl,
      cancelButtonText: 'Cerrar'
    }).then((result) => {
      if (result.isConfirmed && actionUrl) {
        window.location.href = actionUrl;
      }
    });
  }

  // Helper methods for creating specific notification types
  async notifyCheckIn(userId: string, bookingNumber: string, guestName: string, roomNumber: string): Promise<string> {
    return this.createNotification(
      userId,
      'check-in',
      'Check-in Pendiente',
      `${guestName} - Habitación ${roomNumber}`,
      'high',
      `/bookings`,
      { bookingId: bookingNumber }
    );
  }

  async notifyCheckOut(userId: string, bookingNumber: string, guestName: string, roomNumber: string): Promise<string> {
    return this.createNotification(
      userId,
      'check-out',
      'Check-out Pendiente',
      `${guestName} - Habitación ${roomNumber}`,
      'high',
      `/bookings`,
      { bookingId: bookingNumber }
    );
  }

  async notifyHousekeepingTask(userId: string, roomNumber: string, taskType: string): Promise<string> {
    return this.createNotification(
      userId,
      'housekeeping',
      'Nueva Tarea Asignada',
      `${taskType} - Habitación ${roomNumber}`,
      'medium',
      `/housekeeping`
    );
  }

  async notifyNewBooking(userId: string, bookingNumber: string, guestName: string): Promise<string> {
    return this.createNotification(
      userId,
      'booking',
      'Nueva Reserva',
      `Reserva ${bookingNumber} - ${guestName}`,
      'medium',
      `/bookings`
    );
  }

  async notifyPaymentReceived(userId: string, amount: number, guestName: string): Promise<string> {
    return this.createNotification(
      userId,
      'payment',
      'Pago Recibido',
      `$${amount.toFixed(2)} de ${guestName}`,
      'low',
      `/guest-accounts`
    );
  }

  async notifyLowStock(userId: string, productName: string, currentStock: number): Promise<string> {
    return this.createNotification(
      userId,
      'inventory',
      'Stock Bajo',
      `${productName}: ${currentStock} unidades`,
      'high',
      `/products`
    );
  }
}
