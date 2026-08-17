class FakeTimestamp {
  constructor(private date: Date) {}
  toDate() {
    return this.date;
  }
}

jest.mock('firebase-admin', () => {
  const firestoreFn: any = () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({ __ref: 'doc', collection: name, id }),
      where: (...args: any[]) => ({ __ref: 'query', collection: name, args }),
    }),
  });
  firestoreFn.Timestamp = FakeTimestamp;
  return { firestore: firestoreFn };
});

import { validarDisponibilidad } from './availability';

function fakeDocSnap(exists: boolean, data?: any) {
  return { exists, data: () => data };
}

function fakeQuerySnap(docs: Array<{ id: string; data: any }>) {
  return {
    forEach: (cb: (doc: { id: string; data: () => any }) => void) => {
      docs.forEach((d) => cb({ id: d.id, data: () => d.data }));
    },
  };
}

function makeTx(roomSnap: any, bookingsSnap: any) {
  const getMock = jest.fn().mockResolvedValueOnce(roomSnap).mockResolvedValueOnce(bookingsSnap);
  return { get: getMock } as any;
}

const ACTIVE_ROOM = { isActive: true };

describe('validarDisponibilidad — habitación', () => {
  it('no disponible si la habitación no existe', async () => {
    const tx = makeTx(fakeDocSnap(false), fakeQuerySnap([]));

    const result = await validarDisponibilidad(tx, 'room-1', new Date(2026, 7, 16), new Date(2026, 7, 18));

    expect(result).toEqual({ disponible: false, motivo: 'room-not-found' });
  });

  it('no disponible si la habitación está inactiva (isActive: false)', async () => {
    const tx = makeTx(fakeDocSnap(true, { isActive: false }), fakeQuerySnap([]));

    const result = await validarDisponibilidad(tx, 'room-1', new Date(2026, 7, 16), new Date(2026, 7, 18));

    expect(result).toEqual({ disponible: false, motivo: 'room-inactive' });
  });

  it('disponible si la habitación existe, está activa, y no hay reservas', async () => {
    const tx = makeTx(fakeDocSnap(true, ACTIVE_ROOM), fakeQuerySnap([]));

    const result = await validarDisponibilidad(tx, 'room-1', new Date(2026, 7, 16), new Date(2026, 7, 18));

    expect(result).toEqual({ disponible: true });
  });
});

describe('validarDisponibilidad — estados que NO bloquean (paridad con getOverlappingBookings)', () => {
  it.each(['pending', 'checked-out', 'cancelled', 'no-show'])('una reserva "%s" solapada no bloquea', async (status) => {
    const tx = makeTx(
      fakeDocSnap(true, ACTIVE_ROOM),
      fakeQuerySnap([
        {
          id: 'b1',
          data: { status, checkInDate: new Date(2026, 7, 16), checkOutDate: new Date(2026, 7, 18) },
        },
      ])
    );

    const result = await validarDisponibilidad(tx, 'room-1', new Date(2026, 7, 17), new Date(2026, 7, 19));

    expect(result).toEqual({ disponible: true });
  });

  it.each(['confirmed', 'checked-in'])('una reserva "%s" solapada SÍ bloquea', async (status) => {
    const tx = makeTx(
      fakeDocSnap(true, ACTIVE_ROOM),
      fakeQuerySnap([
        {
          id: 'b1',
          data: { status, checkInDate: new Date(2026, 7, 16), checkOutDate: new Date(2026, 7, 18) },
        },
      ])
    );

    const result = await validarDisponibilidad(tx, 'room-1', new Date(2026, 7, 17), new Date(2026, 7, 19));

    expect(result.disponible).toBe(false);
    expect(result.motivo).toBe('overlap');
    expect(result.conflictos).toHaveLength(1);
  });
});

describe('validarDisponibilidad — casos límite de solapamiento (paridad con booking-firebase.repository.ts)', () => {
  const existente = { checkInDate: new Date(2026, 7, 16), checkOutDate: new Date(2026, 7, 20) };

  function overlapCase(checkIn: Date, checkOut: Date) {
    return [checkIn, checkOut] as const;
  }

  it('fechas adyacentes (checkout = checkin existente) NO se solapan', async () => {
    const [checkIn, checkOut] = overlapCase(new Date(2026, 7, 12), new Date(2026, 7, 16));
    const tx = makeTx(fakeDocSnap(true, ACTIVE_ROOM), fakeQuerySnap([{ id: 'b1', data: { status: 'confirmed', ...existente } }]));

    const result = await validarDisponibilidad(tx, 'room-1', checkIn, checkOut);

    expect(result).toEqual({ disponible: true });
  });

  it('fechas adyacentes (checkin = checkout existente) NO se solapan', async () => {
    const [checkIn, checkOut] = overlapCase(new Date(2026, 7, 20), new Date(2026, 7, 23));
    const tx = makeTx(fakeDocSnap(true, ACTIVE_ROOM), fakeQuerySnap([{ id: 'b1', data: { status: 'confirmed', ...existente } }]));

    const result = await validarDisponibilidad(tx, 'room-1', checkIn, checkOut);

    expect(result).toEqual({ disponible: true });
  });

  it('solape parcial al inicio SÍ se solapa', async () => {
    const [checkIn, checkOut] = overlapCase(new Date(2026, 7, 14), new Date(2026, 7, 17));
    const tx = makeTx(fakeDocSnap(true, ACTIVE_ROOM), fakeQuerySnap([{ id: 'b1', data: { status: 'confirmed', ...existente } }]));

    const result = await validarDisponibilidad(tx, 'room-1', checkIn, checkOut);

    expect(result.disponible).toBe(false);
  });

  it('solape parcial al final SÍ se solapa', async () => {
    const [checkIn, checkOut] = overlapCase(new Date(2026, 7, 18), new Date(2026, 7, 22));
    const tx = makeTx(fakeDocSnap(true, ACTIVE_ROOM), fakeQuerySnap([{ id: 'b1', data: { status: 'confirmed', ...existente } }]));

    const result = await validarDisponibilidad(tx, 'room-1', checkIn, checkOut);

    expect(result.disponible).toBe(false);
  });

  it('rango idéntico SÍ se solapa', async () => {
    const tx = makeTx(fakeDocSnap(true, ACTIVE_ROOM), fakeQuerySnap([{ id: 'b1', data: { status: 'confirmed', ...existente } }]));

    const result = await validarDisponibilidad(tx, 'room-1', existente.checkInDate, existente.checkOutDate);

    expect(result.disponible).toBe(false);
  });

  it('nueva reserva contiene por completo a la existente SÍ se solapa', async () => {
    const [checkIn, checkOut] = overlapCase(new Date(2026, 7, 10), new Date(2026, 7, 25));
    const tx = makeTx(fakeDocSnap(true, ACTIVE_ROOM), fakeQuerySnap([{ id: 'b1', data: { status: 'confirmed', ...existente } }]));

    const result = await validarDisponibilidad(tx, 'room-1', checkIn, checkOut);

    expect(result.disponible).toBe(false);
  });
});

describe('validarDisponibilidad — excludeBookingId', () => {
  it('ignora la propia reserva al editarla (no choca consigo misma)', async () => {
    const tx = makeTx(
      fakeDocSnap(true, ACTIVE_ROOM),
      fakeQuerySnap([
        {
          id: 'b1',
          data: { status: 'confirmed', checkInDate: new Date(2026, 7, 16), checkOutDate: new Date(2026, 7, 20) },
        },
      ])
    );

    const result = await validarDisponibilidad(tx, 'room-1', new Date(2026, 7, 16), new Date(2026, 7, 20), 'b1');

    expect(result).toEqual({ disponible: true });
  });
});

describe('validarDisponibilidad — Timestamp de Firestore', () => {
  it('convierte correctamente checkInDate/checkOutDate almacenados como Timestamp', async () => {
    const tx = makeTx(
      fakeDocSnap(true, ACTIVE_ROOM),
      fakeQuerySnap([
        {
          id: 'b1',
          data: {
            status: 'confirmed',
            checkInDate: new FakeTimestamp(new Date(2026, 7, 16)),
            checkOutDate: new FakeTimestamp(new Date(2026, 7, 20)),
          },
        },
      ])
    );

    const result = await validarDisponibilidad(tx, 'room-1', new Date(2026, 7, 17), new Date(2026, 7, 19));

    expect(result.disponible).toBe(false);
  });
});

describe('validarDisponibilidad — paridad exacta con la fórmula actual de Angular', () => {
  // Réplica literal de booking-firebase.repository.ts:171-184 (filtrado + solapamiento).
  function angularOverlap(
    checkIn: Date,
    checkOut: Date,
    booking: { status: string; checkInDate: Date; checkOutDate: Date }
  ): boolean {
    if (!['confirmed', 'checked-in'].includes(booking.status)) return false;
    return checkIn < booking.checkOutDate && checkOut > booking.checkInDate;
  }

  it.each([
    ['sin solape antes', new Date(2026, 7, 10), new Date(2026, 7, 14)],
    ['sin solape después', new Date(2026, 7, 22), new Date(2026, 7, 25)],
    ['solape parcial inicio', new Date(2026, 7, 14), new Date(2026, 7, 17)],
    ['solape parcial final', new Date(2026, 7, 18), new Date(2026, 7, 22)],
    ['solape total', new Date(2026, 7, 10), new Date(2026, 7, 25)],
    ['rango idéntico', new Date(2026, 7, 16), new Date(2026, 7, 20)],
  ])('%s', async (_label, checkIn, checkOut) => {
    const existingBooking = { status: 'confirmed', checkInDate: new Date(2026, 7, 16), checkOutDate: new Date(2026, 7, 20) };
    const tx = makeTx(fakeDocSnap(true, ACTIVE_ROOM), fakeQuerySnap([{ id: 'b1', data: existingBooking }]));

    const result = await validarDisponibilidad(tx, 'room-1', checkIn, checkOut);
    const expectedOverlap = angularOverlap(checkIn, checkOut, existingBooking);

    expect(!result.disponible && result.motivo === 'overlap').toBe(expectedOverlap);
  });
});
