import * as admin from 'firebase-admin';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { LH_CODES, withLhCode } from './errors';

/**
 * Los primeros 6 valores deben coincidir exactamente con
 * src/app/core/models/user-role.enum.ts (Angular). Si ese enum cambia,
 * actualizar aquí también.
 *
 * 'ai-agent' (SPEC-14) es deliberadamente EXCLUSIVO de functions/ — no existe
 * en el UserRole de Angular ni en rolePermissions. El agente nunca inicia
 * sesión en la SPA (autentica vía email+password directo con Firebase Auth
 * para obtener un ID token, invocado desde n8n), así que no necesita
 * aparecer en ningún selector de rol de la UI de administración de usuarios
 * — agregarlo al enum de Angular hubiera arriesgado que apareciera ahí por
 * accidente. Cada Function decide explícitamente si acepta 'ai-agent' en su
 * propia lista de roles permitidos (lista blanca, no heredado por defecto).
 */
export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'manager'
  | 'receptionist'
  | 'housekeeper'
  | 'guest'
  | 'ai-agent';

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
