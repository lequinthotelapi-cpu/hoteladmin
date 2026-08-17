/**
 * Catálogo de códigos de error compartido con Angular (src/app/core/utils/error-handler.ts).
 * Rangos reservados (igual que en Angular / CONTEXTO.md):
 *   LH-0001..0099  Autenticación      (hoy solo emitido por Firebase Auth en el cliente)
 *   LH-0100..0199  Sesión             (hoy solo emitido por AuthService en el cliente)
 *   LH-0200..0299  Permisos            <- las Functions sí emiten estos
 *   LH-0300..0399  Validación          <- reservado para Specs de negocio (05+)
 *   LH-0400..0499  Negocio             <- reservado para Specs de negocio (05+)
 *   LH-9999        Error genérico
 *
 * Este archivo NO duplica el catálogo completo de Angular (mensajes largos en español);
 * solo declara los códigos LH que una Cloud Function puede adjuntar a un HttpsError vía
 * `details.lhCode`, para que el cliente (Angular/Flutter/n8n) pueda resolverlos contra su
 * propio catálogo de mensajes sin depender del texto exacto que viaje en `error.message`.
 */
export const LH_CODES = {
  PERMISSION_DENIED: 'LH-0200',
  UNAUTHENTICATED: 'LH-0201',

  // SPEC-05 — crearReserva
  VALIDATION_INVALID_DATES: 'LH-0300',
  VALIDATION_INVALID_GUESTS: 'LH-0301',
  BOOKING_ROOM_NOT_FOUND: 'LH-0400',
  BOOKING_ROOM_INACTIVE: 'LH-0401',
  BOOKING_NOT_AVAILABLE: 'LH-0402',
  BOOKING_CAPACITY_EXCEEDED: 'LH-0403',
  BOOKING_GUEST_NOT_FOUND: 'LH-0404',

  UNKNOWN: 'LH-9999',
} as const;

export type LhCode = (typeof LH_CODES)[keyof typeof LH_CODES];

export interface BusinessErrorDetails {
  lhCode: LhCode;
}

export function withLhCode(lhCode: LhCode): BusinessErrorDetails {
  return { lhCode };
}
