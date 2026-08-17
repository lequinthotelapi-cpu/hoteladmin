import { calcularPrecioReserva, calcularTotalesConImpuesto } from './pricing';

// Réplica literal de BookingService.calculateNights (booking.service.ts:319-323),
// usada aquí solo para probar paridad — no es el código de producción.
function angularCalculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Réplica literal de GuestAccountService (guest-account.service.ts:59-61).
function angularTax(subtotal: number): { tax: number; total: number } {
  const tax = subtotal * 0.13;
  const total = subtotal + tax;
  return { tax, total };
}

describe('calcularPrecioReserva', () => {
  it('basePrice × noches, sin IVA', () => {
    const checkIn = new Date(2026, 7, 16);
    const checkOut = new Date(2026, 7, 19);

    const result = calcularPrecioReserva(100, checkIn, checkOut);

    expect(result).toEqual({ nights: 3, totalPrice: 300 });
  });

  it('redondea hacia arriba noches parciales (checkout con horas)', () => {
    const checkIn = new Date(2026, 7, 16, 15, 0);
    const checkOut = new Date(2026, 7, 17, 11, 0);

    const result = calcularPrecioReserva(80, checkIn, checkOut);

    expect(result.nights).toBe(1);
  });

  it('una sola noche', () => {
    const checkIn = new Date(2026, 7, 16);
    const checkOut = new Date(2026, 7, 17);

    expect(calcularPrecioReserva(150, checkIn, checkOut)).toEqual({ nights: 1, totalPrice: 150 });
  });

  it('replica el comportamiento actual con fechas invertidas (Math.abs, sin throw)', () => {
    const checkIn = new Date(2026, 7, 19);
    const checkOut = new Date(2026, 7, 16);

    const result = calcularPrecioReserva(100, checkIn, checkOut);

    expect(result).toEqual({ nights: 3, totalPrice: 300 });
  });

  it('paridad exacta con BookingService.calculateNights para un conjunto de fechas representativas', () => {
    const casos: [Date, Date][] = [
      [new Date(2026, 0, 1), new Date(2026, 0, 2)],
      [new Date(2026, 1, 27), new Date(2026, 2, 2)], // cruza fin de mes/febrero
      [new Date(2026, 11, 31), new Date(2027, 0, 3)], // cruza año
      [new Date(2026, 7, 16, 14, 30), new Date(2026, 7, 20, 10, 0)],
    ];

    for (const [checkIn, checkOut] of casos) {
      const { nights } = calcularPrecioReserva(75.5, checkIn, checkOut);
      expect(nights).toBe(angularCalculateNights(checkIn, checkOut));
    }
  });
});

describe('calcularTotalesConImpuesto', () => {
  it('13% de IVA sobre el subtotal, igual que GuestAccountService', () => {
    expect(calcularTotalesConImpuesto(300)).toEqual({ subtotal: 300, tax: 39, total: 339 });
  });

  it('paridad exacta con el cálculo actual de Angular para subtotales con decimales', () => {
    const subtotales = [0, 1, 99.99, 226.5, 1000.33, 12345.67];

    for (const subtotal of subtotales) {
      const result = calcularTotalesConImpuesto(subtotal);
      const angular = angularTax(subtotal);

      expect(result.tax).toBe(angular.tax);
      expect(result.total).toBe(angular.total);
    }
  });

  it('acepta una tasa de impuesto distinta a la default (parametrizable, sin usarse aún)', () => {
    expect(calcularTotalesConImpuesto(100, 0.1)).toEqual({ subtotal: 100, tax: 10, total: 110 });
  });
});
