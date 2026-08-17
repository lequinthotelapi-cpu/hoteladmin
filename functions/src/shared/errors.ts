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

  // SPEC-06 — confirmarReserva / cancelarReserva
  VALIDATION_MISSING_BOOKING_ID: 'LH-0302',
  BOOKING_NOT_FOUND: 'LH-0405',
  BOOKING_NOT_PENDING: 'LH-0406',
  BOOKING_NOT_CANCELLABLE: 'LH-0407',

  // SPEC-07 — registrarCheckIn
  BOOKING_NOT_CONFIRMED: 'LH-0408',
  ROOM_NOT_READY_FOR_CHECKIN: 'LH-0409',

  // SPEC-08 — registrarCheckOut
  BOOKING_NOT_CHECKED_IN: 'LH-0410',

  // SPEC-09 — agregarCargoCuenta / agregarPagoCuenta / cerrarCuenta
  VALIDATION_INVALID_CHARGE: 'LH-0303',
  VALIDATION_INVALID_PAYMENT: 'LH-0304',
  ACCOUNT_NOT_FOUND: 'LH-0411',
  ACCOUNT_NOT_OPEN: 'LH-0412',
  PAYMENT_EXCEEDS_BALANCE: 'LH-0413',
  ACCOUNT_ALREADY_CLOSED: 'LH-0414',
  ACCOUNT_HAS_BALANCE: 'LH-0415',

  // SPEC-10 — emitirFactura / cancelarFactura
  VALIDATION_INVALID_INVOICE: 'LH-0305',
  INVOICE_DUPLICATE_REFERENCE: 'LH-0416',
  INVOICE_ACCOUNT_NOT_CLOSED: 'LH-0417',
  INVOICE_ACCOUNT_HAS_BALANCE: 'LH-0418',
  INVOICE_TYPE_NOT_SUPPORTED: 'LH-0419',
  INVOICE_NOT_FOUND: 'LH-0420',
  INVOICE_ALREADY_CANCELLED: 'LH-0421',

  // SPEC-11 — registrarVentaPOS
  VALIDATION_INVALID_SALE: 'LH-0306',
  NO_OPEN_CASH_REGISTER: 'LH-0422',
  PRODUCT_NOT_FOUND: 'LH-0423',
  PRODUCT_INACTIVE: 'LH-0424',
  INSUFFICIENT_STOCK: 'LH-0425',

  // SPEC-15 — registrarMovimientoInventario
  VALIDATION_INVALID_MOVEMENT: 'LH-0307',

  UNKNOWN: 'LH-9999',
} as const;

export type LhCode = (typeof LH_CODES)[keyof typeof LH_CODES];

export interface BusinessErrorDetails {
  lhCode: LhCode;
}

export function withLhCode(lhCode: LhCode): BusinessErrorDetails {
  return { lhCode };
}
