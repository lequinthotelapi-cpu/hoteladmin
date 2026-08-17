const setMock = jest.fn();
const getMock = jest.fn();

jest.mock('firebase-admin', () => ({
  firestore: () => ({
    doc: () => ({}),
  }),
}));

const fakeTx = { get: getMock, set: setMock } as any;

import { derivePeriod, formatBookingNumber, formatInvoiceNumber, getNextSequence } from './counters';

describe('derivePeriod', () => {
  it('booking se reinicia por día (YYYYMMDD)', () => {
    expect(derivePeriod('booking', new Date(2026, 7, 16))).toBe('20260816');
    expect(derivePeriod('booking', new Date(2026, 0, 5))).toBe('20260105');
  });

  it('invoice se reinicia por mes (YYYYMM)', () => {
    expect(derivePeriod('invoice', new Date(2026, 7, 16))).toBe('202608');
    expect(derivePeriod('invoice', new Date(2026, 7, 31))).toBe('202608');
  });
});

describe('formatBookingNumber', () => {
  it('replica exactamente el formato actual de booking.service.ts (BK-YYYYMMDD-XXX, 3 dígitos)', () => {
    expect(formatBookingNumber(1, '20260816')).toBe('BK-20260816-001');
    expect(formatBookingNumber(23, '20260816')).toBe('BK-20260816-023');
    expect(formatBookingNumber(999, '20260816')).toBe('BK-20260816-999');
  });

  it('no trunca si la secuencia supera 3 dígitos (comportamiento definido, no colisiona)', () => {
    expect(formatBookingNumber(1000, '20260816')).toBe('BK-20260816-1000');
  });
});

describe('formatInvoiceNumber', () => {
  it('replica exactamente el formato actual de invoice.service.ts (FAC-YYYYMM-XXXX, 4 dígitos)', () => {
    expect(formatInvoiceNumber(1, '202608')).toBe('FAC-202608-0001');
    expect(formatInvoiceNumber(42, '202608')).toBe('FAC-202608-0042');
    expect(formatInvoiceNumber(9999, '202608')).toBe('FAC-202608-9999');
  });
});

describe('getNextSequence', () => {
  beforeEach(() => {
    setMock.mockReset();
    getMock.mockReset();
  });

  it('empieza en 1 cuando el contador no existe todavía', async () => {
    getMock.mockResolvedValue({ data: () => undefined });

    const result = await getNextSequence(fakeTx, 'booking', new Date(2026, 7, 16));

    expect(result).toEqual({ numero: 'BK-20260816-001', sequence: 1, periodo: '20260816' });
    expect(setMock).toHaveBeenCalledWith(expect.anything(), { value: 1 }, { merge: true });
  });

  it('incrementa a partir del valor existente del contador', async () => {
    getMock.mockResolvedValue({ data: () => ({ value: 41 }) });

    const result = await getNextSequence(fakeTx, 'invoice', new Date(2026, 7, 16));

    expect(result).toEqual({ numero: 'FAC-202608-0042', sequence: 42, periodo: '202608' });
  });

  it('usa la transacción del caller en vez de abrir una propia (recibe tx.get/tx.set directamente)', async () => {
    getMock.mockResolvedValue({ data: () => undefined });

    await getNextSequence(fakeTx, 'booking', new Date(2026, 7, 16));

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledTimes(1);
  });
});
