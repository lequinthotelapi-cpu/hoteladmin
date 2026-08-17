/**
 * SPEC-03 — Cálculo centralizado de pricing/IVA.
 *
 * Funciones puras, sin efectos secundarios ni acceso a Firestore/auth, pensadas para
 * ser reutilizadas por Spec 05 (crearReserva), Spec 09 (cargos de Guest Account) y
 * Spec 10 (facturación) — y opcionalmente por Angular si Spec 13 decide compartir código.
 *
 * Decisión del usuario (Task 03.1, ver SPEC-03): `calcularPrecioReserva` NO incluye IVA —
 * replica exactamente el comportamiento actual de `booking.service.ts` (informativo, sin
 * impuesto). El IVA solo se aplica al cobrar, vía `calcularTotalesConImpuesto`, igual que
 * hoy en `guest-account.service.ts`.
 *
 * Uso previsto:
 *   const { nights, totalPrice } = calcularPrecioReserva(basePrice, checkIn, checkOut);
 *   const { subtotal, tax, total } = calcularTotalesConImpuesto(subtotal);
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TAX_RATE = 0.13;

export interface PrecioReserva {
  nights: number;
  totalPrice: number;
}

export interface TotalesConImpuesto {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * basePrice × noches, sin IVA. Replica bit a bit `BookingService.calculateNights`
 * (`booking.service.ts:319-323`): usa `Math.abs()` sobre la diferencia de fechas y
 * NO valida `checkOut > checkIn` — el código actual tampoco lo hace, así que fechas
 * invertidas producen el mismo número de noches que hoy (no se introduce un throw
 * nuevo que hoy no existe).
 */
export function calcularPrecioReserva(basePrice: number, checkIn: Date, checkOut: Date): PrecioReserva {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  const nights = Math.ceil(diffTime / MS_PER_DAY);
  const totalPrice = basePrice * nights;

  return { nights, totalPrice };
}

/**
 * Aplica IVA (13% por defecto) sobre un subtotal. Replica bit a bit
 * `GuestAccountService` (`guest-account.service.ts:59-61,196-198`): `tax = subtotal * 0.13`,
 * `total = subtotal + tax`. `taxRate` es parametrizable en la firma pero se mantiene
 * hardcodeado en 0.13 igual que hoy — no se propone parametrizarlo vía
 * `ParametersService` en esta Spec.
 */
export function calcularTotalesConImpuesto(subtotal: number, taxRate: number = DEFAULT_TAX_RATE): TotalesConImpuesto {
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return { subtotal, tax, total };
}
