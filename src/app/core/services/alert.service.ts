import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  success(message: string, title: string = '¡Éxito!') {
    return Swal.fire({
      icon: 'success',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#4caf50',
      timer: 3000,
      timerProgressBar: true
    });
  }

  error(message: string, title: string = 'Error') {
    return Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#f44336'
    });
  }

  warning(message: string, title: string = 'Advertencia') {
    return Swal.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#ff9800'
    });
  }

  info(message: string, title: string = 'Información') {
    return Swal.fire({
      icon: 'info',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#2196f3'
    });
  }

  async confirm(
    message: string, 
    title: string = '¿Estás seguro?',
    confirmText: string = 'Sí, continuar',
    cancelText: string = 'Cancelar'
  ): Promise<boolean> {
    const result = await Swal.fire({
      icon: 'question',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#2196f3',
      cancelButtonColor: '#9e9e9e',
      reverseButtons: true
    });
    return result.isConfirmed;
  }

  async confirmDelete(title: string = '¿Eliminar?', message: string = '¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.'): Promise<boolean> {
    const result = await Swal.fire({
      icon: 'warning',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f44336',
      cancelButtonColor: '#9e9e9e',
      reverseButtons: true
    });
    return result.isConfirmed;
  }

  loading(message: string = 'Procesando...') {
    Swal.fire({
      title: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  close() {
    Swal.close();
  }

  toast(message: string, icon: SweetAlertIcon = 'success') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    return Toast.fire({
      icon,
      title: message
    });
  }
}
