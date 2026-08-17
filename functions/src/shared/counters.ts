import * as admin from 'firebase-admin';

/**
 * SPEC-02 — Contador atómico centralizado.
 *
 * Reemplaza la generación no atómica de bookingNumber (aleatorio, booking.service.ts)
 * e invoiceNumber (conteo de documentos + 1, invoice.service.ts) por un contador
 * atómico server-side vía runTransaction, preservando exactamente el formato visible
 * actual: BK-YYYYMMDD-XXX (reinicio diario) y FAC-YYYYMM-XXXX (reinicio mensual).
 *
 * Uso previsto (Spec 05 y Spec 10, no expuesta como callable propia todavía):
 *   const { numero } = await getNextSequence(tx, tipo, fecha);
 *
 * IMPORTANTE (ajuste hecho al integrarla en Spec 05, ver addendum en
 * SPEC-02-contador-atomico.md): recibe la `Transaction` activa del caller en vez de
 * abrir la suya propia. Si abriera su propia transacción y se llamara desde dentro
 * de la transacción de `crearReserva`, serían dos transacciones independientes y sin
 * coordinar: el contador podría incrementarse igual aunque la reserva fallara/se
 * reintentara, rompiendo la atomicidad que esta Spec existe para garantizar.
 */

export type CounterType = 'booking' | 'invoice';

export interface NextSequenceResult {
  numero: string;
  sequence: number;
  periodo: string;
}

/**
 * Deriva el período de reinicio del contador según el tipo:
 * booking se reinicia por día (YYYYMMDD), invoice por mes (YYYYMM) — igual que hoy en Angular.
 */
export function derivePeriod(tipo: CounterType, fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');

  if (tipo === 'booking') {
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  return `${year}${month}`;
}

/** Replica exactamente el formato actual de booking.service.ts: `BK-${YYYYMMDD}-${secuencia 3 dígitos}`. */
export function formatBookingNumber(sequence: number, periodoYYYYMMDD: string): string {
  return `BK-${periodoYYYYMMDD}-${String(sequence).padStart(3, '0')}`;
}

/** Replica exactamente el formato actual de invoice.service.ts: `FAC-${YYYYMM}-${secuencia 4 dígitos}`. */
export function formatInvoiceNumber(sequence: number, periodoYYYYMM: string): string {
  return `FAC-${periodoYYYYMM}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Incrementa atómicamente el contador de `tipo` para el período derivado de `fecha`
 * (documento `counters/{tipo}_{periodo}`) y devuelve el número siguiente ya formateado.
 * El contador nunca retrocede ni repite un valor ya emitido: cada llamada, incluso
 * concurrente, obtiene un valor único (garantizado por la transacción del caller).
 */
export async function getNextSequence(
  tx: admin.firestore.Transaction,
  tipo: CounterType,
  fecha: Date
): Promise<NextSequenceResult> {
  const periodo = derivePeriod(tipo, fecha);
  const counterRef = admin.firestore().doc(`counters/${tipo}_${periodo}`);

  const snap = await tx.get(counterRef);
  const current = (snap.data()?.value as number | undefined) ?? 0;
  const sequence = current + 1;
  tx.set(counterRef, { value: sequence }, { merge: true });

  const numero = tipo === 'booking' ? formatBookingNumber(sequence, periodo) : formatInvoiceNumber(sequence, periodo);

  return { numero, sequence, periodo };
}
