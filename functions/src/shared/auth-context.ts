import * as admin from 'firebase-admin';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { LH_CODES, withLhCode } from './errors';

/**
 * Debe coincidir exactamente con src/app/core/models/user-role.enum.ts (Angular).
 * Si ese enum cambia, actualizar aquí también.
 */
export type UserRole = 'superadmin' | 'admin' | 'manager' | 'receptionist' | 'housekeeper' | 'guest';

export interface AuthContext {
  uid: string;
  role: UserRole;
}

/**
 * Verifica que el caller esté autenticado y tenga uno de los roles permitidos,
 * leyendo el rol desde users/{uid} (mismo patrón que forceLogoutUser, no custom claims).
 * Lanza HttpsError si no cumple; nunca devuelve un contexto inválido.
 */
export async function requireRole(
  auth: CallableRequest['auth'],
  allowedRoles: UserRole[]
): Promise<AuthContext> {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado', withLhCode(LH_CODES.UNAUTHENTICATED));
  }

  const uid = auth.uid;
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  const role = userDoc.data()?.role as UserRole | undefined;

  if (!role || !allowedRoles.includes(role)) {
    throw new HttpsError(
      'permission-denied',
      'No tienes permisos para realizar esta acción',
      withLhCode(LH_CODES.PERMISSION_DENIED)
    );
  }

  return { uid, role };
}
