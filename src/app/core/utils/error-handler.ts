export interface ErrorDetail {
  code: string;
  title: string;
  message: string;
  technicalMessage?: string;
}

export const ERROR_CATALOG: { [key: string]: ErrorDetail } = {
  // Errores de Autenticación (LH-0001 - LH-0099)
  'auth/invalid-credential': {
    code: 'LH-0001',
    title: 'Credenciales Incorrectas',
    message: 'El correo electrónico o la contraseña que ingresaste son incorrectos. Por favor, verifica tus datos e intenta nuevamente.',
    technicalMessage: 'Firebase: Error (auth/invalid-credential)'
  },
  'auth/user-not-found': {
    code: 'LH-0002',
    title: 'Usuario No Encontrado',
    message: 'No existe una cuenta asociada a este correo electrónico. Por favor, verifica el correo o regístrate.',
    technicalMessage: 'Firebase: Error (auth/user-not-found)'
  },
  'auth/wrong-password': {
    code: 'LH-0003',
    title: 'Contraseña Incorrecta',
    message: 'La contraseña ingresada es incorrecta. Por favor, intenta nuevamente o recupera tu contraseña.',
    technicalMessage: 'Firebase: Error (auth/wrong-password)'
  },
  'auth/email-already-in-use': {
    code: 'LH-0004',
    title: 'Correo Ya Registrado',
    message: 'Ya existe una cuenta con este correo electrónico. Por favor, inicia sesión o usa otro correo.',
    technicalMessage: 'Firebase: Error (auth/email-already-in-use)'
  },
  'auth/weak-password': {
    code: 'LH-0005',
    title: 'Contraseña Débil',
    message: 'La contraseña debe tener al menos 6 caracteres. Por favor, elige una contraseña más segura.',
    technicalMessage: 'Firebase: Error (auth/weak-password)'
  },
  'auth/invalid-email': {
    code: 'LH-0006',
    title: 'Correo Inválido',
    message: 'El formato del correo electrónico no es válido. Por favor, verifica e intenta nuevamente.',
    technicalMessage: 'Firebase: Error (auth/invalid-email)'
  },
  'auth/user-disabled': {
    code: 'LH-0007',
    title: 'Cuenta Deshabilitada',
    message: 'Tu cuenta ha sido deshabilitada. Por favor, contacta al administrador del sistema.',
    technicalMessage: 'Firebase: Error (auth/user-disabled)'
  },
  'auth/too-many-requests': {
    code: 'LH-0008',
    title: 'Demasiados Intentos',
    message: 'Has realizado demasiados intentos fallidos. Por favor, espera unos minutos e intenta nuevamente.',
    technicalMessage: 'Firebase: Error (auth/too-many-requests)'
  },
  'auth/network-request-failed': {
    code: 'LH-0009',
    title: 'Error de Conexión',
    message: 'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e intenta nuevamente.',
    technicalMessage: 'Firebase: Error (auth/network-request-failed)'
  },

  // Errores de Sesión (LH-0100 - LH-0199)
  'MAX_SESSIONS': {
    code: 'LH-0100',
    title: 'Límite de Sesiones Alcanzado',
    message: 'Has alcanzado el límite de sesiones activas permitidas. Por favor, cierra otra sesión e intenta nuevamente.',
    technicalMessage: 'MAX_SESSIONS'
  },
  'USER_INACTIVE': {
    code: 'LH-0101',
    title: 'Usuario Inactivo',
    message: 'Tu cuenta está inactiva. Por favor, contacta al administrador del sistema para activarla.',
    technicalMessage: 'USER_INACTIVE'
  },
  'USER_EXPIRED': {
    code: 'LH-0102',
    title: 'Cuenta Expirada',
    message: 'Tu cuenta ha expirado. Por favor, contacta al administrador del sistema para renovarla.',
    technicalMessage: 'USER_EXPIRED'
  },

  // Errores de Permisos (LH-0200 - LH-0299)
  'permission-denied': {
    code: 'LH-0200',
    title: 'Permisos Insuficientes',
    message: 'No tienes permisos para realizar esta acción. Por favor, contacta al administrador si necesitas acceso.',
    technicalMessage: 'Firestore: permission-denied'
  },
  'unauthenticated': {
    code: 'LH-0201',
    title: 'Sesión Expirada',
    message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    technicalMessage: 'Firestore: unauthenticated'
  },

  'UNKNOWN_ERROR': {
    code: 'LH-9999',
    title: 'Error Inesperado',
    message: 'Ha ocurrido un error inesperado. Por favor, intenta nuevamente o contacta al soporte técnico.',
    technicalMessage: 'UNKNOWN_ERROR'
  }
};

export class ErrorHandler {
  static getErrorDetail(error: any): ErrorDetail {
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error?.code) {
      errorCode = error.code;
    } else if (error?.message) {
      const match = error.message.match(/auth\/[\w-]+/);
      if (match) {
        errorCode = match[0];
      } else if (error.message.includes('MAX_SESSIONS')) {
        errorCode = 'MAX_SESSIONS';
      } else if (error.message.includes('USER_INACTIVE')) {
        errorCode = 'USER_INACTIVE';
      } else if (error.message.includes('USER_EXPIRED')) {
        errorCode = 'USER_EXPIRED';
      } else if (error.message.includes('permission-denied')) {
        errorCode = 'permission-denied';
      }
    }

    const errorDetail = ERROR_CATALOG[errorCode];
    
    if (errorDetail) {
      return errorDetail;
    }

    return {
      ...ERROR_CATALOG['UNKNOWN_ERROR'],
      technicalMessage: error?.message || 'Unknown error'
    };
  }

  static formatErrorMessage(error: any, includeCode: boolean = true): string {
    const detail = this.getErrorDetail(error);
    
    if (includeCode) {
      return `${detail.message}\n\nCódigo de error: ${detail.code}`;
    }
    
    return detail.message;
  }
}
