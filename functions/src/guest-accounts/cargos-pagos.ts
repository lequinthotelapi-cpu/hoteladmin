import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../shared/auth-context';
import { LH_CODES, withLhCode } from '../shared/errors';
import { calcularTotalesConImpuesto } from '../shared/pricing';

/**
 * SPEC-09 — Cargos, pagos y cierre de Guest Account.
 *
 * Reemplaza el patrón actual de `GuestAccountService.addCharge/addPayment`
 * (`guest-account.service.ts:86-173`): leer el documento completo → mutar el
 * array `charges[]`/`payments[]` en memoria → sobrescribir completo, sin
 * transacción — dos cargos/pagos simultáneos pueden perderse (el segundo
 * sobrescribe basado en una lectura desactualizada). Aquí el read-modify-write
 * ocurre dentro de una `runTransaction`, así que un conflicto real fuerza un
 * reintento con una lectura fresca en vez de perder el primero.
 *
 * Réplica bit a bit de `calculateTotals` (`guest-account.service.ts:195-203`):
 * `subtotal` = suma de `charge.total`, IVA 13% sobre ese subtotal (vía
 * `calcularTotalesConImpuesto`, SPEC-03), `paid` = suma de `payment.amount`,
 * `balance` = total - paid.
 *
 * Task 09.1 (confirmado contra el código real): el flujo POS "cargar a
 * habitación" (`pos.component.ts:208-213`) llama al mismo
 * `GuestAccountService.addCharge` que el diálogo manual de cargos — no hay
 * un camino separado. Al adaptar el servicio (Task 09.3) para llamar a
 * `agregarCargoCuenta`, el flujo POS queda cubierto automáticamente sin
 * tocar `pos.component.ts`.
 *
 * Fuera de alcance (no lo pide el Spec, no se tocó): `GuestAccountService.
 * removeCharge` no tiene ningún caller en la UI hoy — código muerto, no se
 * centralizó.
 */

export function calcularTotalesCuenta(charges: Array<{ total: number }>, payments: Array<{ amount: number }>) {
  const subtotal = charges.reduce((sum, c) => sum + c.total, 0);
  const { tax, total } = calcularTotalesConImpuesto(subtotal);
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = total - paid;

  return { subtotal, tax, total, paid, balance };
}

const ALLOWED_ROLES = ['receptionist', 'manager', 'admin', 'superadmin'] as const;

export interface CargoInput {
  tipo: string;
  descripcion: string;
  monto: number;
  cantidad: number;
  referencia?: string;
}

/**
 * Lógica central de "agregar cargo", extraída para que SPEC-11
 * (`registrarVentaPOS`, tipoVenta 'habitacion') pueda reutilizarla dentro de
 * su propia transacción (leyendo/escribiendo la cuenta junto con el stock de
 * productos), tal como pide el Spec ("reutiliza agregarCargoCuenta
 * internamente") — Firestore no permite invocar OTRA Cloud Function desde
 * dentro de una transacción de forma atómica, así que la reutilización real
 * es a nivel de esta función compartida, no de la Function pública.
 */
export async function aplicarCargoCuenta(
  tx: admin.firestore.Transaction,
  accountId: string,
  cargo: CargoInput,
  callerUid: string
) {
  const ref = admin.firestore().collection('guestAccounts').doc(accountId);
  const snap = await tx.get(ref);
  if (!snap.exists) {
    throw new HttpsError('not-found', 'La cuenta no existe', withLhCode(LH_CODES.ACCOUNT_NOT_FOUND));
  }
  const account = snap.data()!;

  if (account.status !== 'open') {
    throw new HttpsError(
      'failed-precondition',
      'No se pueden agregar cargos a una cuenta cerrada',
      withLhCode(LH_CODES.ACCOUNT_NOT_OPEN)
    );
  }

  const charge = {
    accountId,
    type: cargo.tipo,
    description: cargo.descripcion,
    amount: cargo.monto,
    quantity: cargo.cantidad,
    total: cargo.monto * cargo.cantidad,
    // new Date(), no serverTimestamp(): no soportado dentro de un array (ver SPEC-07).
    date: new Date(),
    createdBy: callerUid,
    createdAt: new Date(),
    ...(cargo.referencia ? { reference: cargo.referencia } : {}),
  };

  const updatedCharges = [...(account.charges || []), charge];
  const totales = calcularTotalesCuenta(updatedCharges, account.payments || []);

  tx.update(ref, {
    charges: updatedCharges,
    ...totales,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: callerUid,
  });

  return totales;
}

export const agregarCargoCuenta = onCall(async (request) => {
  const caller = await requireRole(request.auth, [...ALLOWED_ROLES]);

  const { accountId, tipo, descripcion, monto, cantidad, referencia } = request.data ?? {};
  if (!accountId || !tipo || !descripcion || !(monto > 0) || !(cantidad > 0)) {
    throw new HttpsError(
      'invalid-argument',
      'accountId, tipo, descripcion, monto (>0) y cantidad (>0) son requeridos',
      withLhCode(LH_CODES.VALIDATION_INVALID_CHARGE)
    );
  }

  return admin.firestore().runTransaction(async (tx) => {
    const totales = await aplicarCargoCuenta(tx, accountId, { tipo, descripcion, monto, cantidad, referencia }, caller.uid);
    return { accountId, ...totales };
  });
});

export const agregarPagoCuenta = onCall(async (request) => {
  const caller = await requireRole(request.auth, [...ALLOWED_ROLES]);

  const { accountId, monto, metodoPago, referencia, notas } = request.data ?? {};
  if (!accountId || !metodoPago || !(monto > 0)) {
    throw new HttpsError(
      'invalid-argument',
      'accountId, metodoPago y monto (>0) son requeridos',
      withLhCode(LH_CODES.VALIDATION_INVALID_PAYMENT)
    );
  }

  return admin.firestore().runTransaction(async (tx) => {
    const ref = admin.firestore().collection('guestAccounts').doc(accountId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'La cuenta no existe', withLhCode(LH_CODES.ACCOUNT_NOT_FOUND));
    }
    const account = snap.data()!;

    if (account.status !== 'open') {
      throw new HttpsError(
        'failed-precondition',
        'No se pueden agregar pagos a una cuenta cerrada',
        withLhCode(LH_CODES.ACCOUNT_NOT_OPEN)
      );
    }

    if (monto > account.balance) {
      throw new HttpsError(
        'failed-precondition',
        'El monto del pago excede el saldo pendiente',
        withLhCode(LH_CODES.PAYMENT_EXCEEDS_BALANCE)
      );
    }

    const payment = {
      accountId,
      method: metodoPago,
      amount: monto,
      date: new Date(),
      createdBy: caller.uid,
      createdAt: new Date(),
      ...(referencia ? { reference: referencia } : {}),
      ...(notas ? { notes: notas } : {}),
    };

    const updatedPayments = [...(account.payments || []), payment];
    const totales = calcularTotalesCuenta(account.charges || [], updatedPayments);

    tx.update(ref, {
      payments: updatedPayments,
      ...totales,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: caller.uid,
    });

    return { accountId, ...totales };
  });
});

export const cerrarCuenta = onCall(async (request) => {
  const caller = await requireRole(request.auth, [...ALLOWED_ROLES]);

  const { accountId } = request.data ?? {};
  if (!accountId) {
    throw new HttpsError('invalid-argument', 'accountId es requerido', withLhCode(LH_CODES.ACCOUNT_NOT_FOUND));
  }

  return admin.firestore().runTransaction(async (tx) => {
    const ref = admin.firestore().collection('guestAccounts').doc(accountId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'La cuenta no existe', withLhCode(LH_CODES.ACCOUNT_NOT_FOUND));
    }
    const account = snap.data()!;

    if (account.status === 'closed') {
      throw new HttpsError(
        'failed-precondition',
        'La cuenta ya está cerrada',
        withLhCode(LH_CODES.ACCOUNT_ALREADY_CLOSED)
      );
    }

    if (account.balance > 0) {
      throw new HttpsError(
        'failed-precondition',
        'No se puede cerrar una cuenta con saldo pendiente',
        withLhCode(LH_CODES.ACCOUNT_HAS_BALANCE)
      );
    }

    tx.update(ref, {
      status: 'closed',
      checkOutDate: admin.firestore.FieldValue.serverTimestamp(),
      closedAt: admin.firestore.FieldValue.serverTimestamp(),
      closedBy: caller.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: caller.uid,
    });

    return { accountId, status: 'closed' as const };
  });
});
