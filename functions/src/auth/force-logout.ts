import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../shared/auth-context';

/**
 * Cloud Function para forzar logout de un usuario
 * Solo admin y superadmin pueden ejecutar esta función
 */
export const forceLogoutUser = onCall(
  async (request) => {
    // Validar autenticación y permisos (solo admin/superadmin)
    const caller = await requireRole(request.auth, ['admin', 'superadmin']);

    const uid = request.data.uid;

    if (!uid) {
      throw new HttpsError('invalid-argument', 'UID de usuario requerido');
    }

    // No permitir forzar logout de superadmin
    const targetDoc = await admin.firestore().collection('users').doc(uid).get();
    const targetRole = targetDoc.data()?.role;

    if (targetRole === 'superadmin' && caller.role !== 'superadmin') {
      throw new HttpsError('permission-denied', 'No puedes forzar logout de un superadmin');
    }

    try {
      // Revocar todos los refresh tokens
      await admin.auth().revokeRefreshTokens(uid);

      // Resetear sesiones en Firestore
      await admin.firestore().collection('users').doc(uid).update({
        activeSessionsCount: 0,
        hasActiveSession: false,
        sessions: {}
      });

      return {
        success: true,
        message: 'Usuario desconectado exitosamente'
      };
    } catch (error: any) {
      console.error('Error al forzar logout:', error);
      throw new HttpsError('internal', 'Error al forzar logout: ' + error.message);
    }
  }
);
