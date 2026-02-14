import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../domain/models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'fury-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  form: FormGroup;
  users: User[] = [];
  loading = false;

  notificationTypes = [
    { value: 'check-in', label: 'Check-in' },
    { value: 'check-out', label: 'Check-out' },
    { value: 'housekeeping', label: 'Limpieza' },
    { value: 'booking', label: 'Reserva' },
    { value: 'payment', label: 'Pago' },
    { value: 'inventory', label: 'Inventario' },
    { value: 'system', label: 'Sistema' }
  ];

  priorities = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' }
  ];

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      userId: ['', Validators.required],
      type: ['system', Validators.required],
      title: ['', Validators.required],
      message: ['', Validators.required],
      priority: ['medium', Validators.required],
      actionUrl: ['']
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.userService.getAllUsers().subscribe(users => {
      this.users = users;
    });
  }

  async sendNotification() {
    if (this.form.invalid) return;

    this.loading = true;
    const formValue = this.form.value;

    try {
      await this.notificationService.createNotification(
        formValue.userId,
        formValue.type,
        formValue.title,
        formValue.message,
        formValue.priority,
        formValue.actionUrl || undefined
      );

      this.snackBar.open('Notificación enviada correctamente', 'Cerrar', { duration: 3000 });
      this.form.patchValue({ title: '', message: '', actionUrl: '' });
    } catch (error) {
      this.snackBar.open('Error al enviar notificación', 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  async sendToAll() {
    if (!this.form.get('type')?.value || !this.form.get('title')?.value || !this.form.get('message')?.value) {
      this.snackBar.open('Complete los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading = true;
    const formValue = this.form.value;

    try {
      const promises = this.users.map(user =>
        this.notificationService.createNotification(
          user.uid,
          formValue.type,
          formValue.title,
          formValue.message,
          formValue.priority,
          formValue.actionUrl || undefined
        )
      );

      await Promise.all(promises);
      this.snackBar.open(`Notificación enviada a ${this.users.length} usuarios`, 'Cerrar', { duration: 3000 });
      this.form.patchValue({ title: '', message: '', actionUrl: '' });
    } catch (error) {
      this.snackBar.open('Error al enviar notificaciones', 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }
}
