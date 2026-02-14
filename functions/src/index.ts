import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();

/**
 * Cloud Function para forzar logout de un usuario
 * Solo admin y superadmin pueden ejecutar esta función
 */
export const forceLogoutUser = onCall(
  async (request) => {
    // Validar autenticación
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    // Validar permisos (solo admin/superadmin)
    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    const callerRole = callerDoc.data()?.role;

    if (callerRole !== 'admin' && callerRole !== 'superadmin') {
      throw new HttpsError('permission-denied', 'No tienes permisos para realizar esta acción');
    }

    const uid = request.data.uid;

    if (!uid) {
      throw new HttpsError('invalid-argument', 'UID de usuario requerido');
    }

    // No permitir forzar logout de superadmin
    const targetDoc = await admin.firestore().collection('users').doc(uid).get();
    const targetRole = targetDoc.data()?.role;

    if (targetRole === 'superadmin' && callerRole !== 'superadmin') {
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
