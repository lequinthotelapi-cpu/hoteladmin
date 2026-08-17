import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../shared/auth-context';
import { LH_CODES, withLhCode } from '../shared/errors';
import { getNextSequence } from '../shared/counters';

/**
 * SPEC-10 — Emisión de factura centralizada.
 *
 * Reemplaza `InvoiceService.createInvoiceFromGuestAccount`
 * (`invoice.service.ts:76-125`): numeración no atómica (contar documentos del
 * mes + 1, ver SPEC-02) y sin transacción — dos emisiones simultáneas podrían
 * colisionar en número o duplicar la factura de una misma referencia.
 *
 * Alcance real (verificado contra el código, no asumido del texto del Spec):
 * la única vía de creación de factura que existe hoy en la UI es
 * `createInvoiceFromGuestAccount` (`create-invoice-dialog.component.ts:52`),
 * siempre con `type: 'guest_account'`. No hay ningún flujo de facturación de
 * venta POS en la UI actual, a pesar de que `CreateInvoiceDto.type` acepta
 * `'pos'` en el modelo — no existe una implementación de referencia que
 * replicar para ese caso. Por eso `emitirFactura` solo soporta
 * `tipo: 'guest_account'` por ahora; `'pos'` devuelve un error claro
 * (`INVOICE_TYPE_NOT_SUPPORTED`) en vez de inventar una lógica sin
 * precedente real.
 */

export const emitirFactura = onCall(async (request) => {
  const caller = await requireRole(request.auth, ['receptionist', 'manager', 'admin', 'superadmin']);

  const { referenceId, tipo, clientName, clientTaxId, clientAddress, clientEmail, clientPhone } =
    request.data ?? {};

  if (!referenceId || !tipo || !clientName || !clientTaxId) {
    throw new HttpsError(
      'invalid-argument',
      'referenceId, tipo, clientName y clientTaxId son requeridos',
      withLhCode(LH_CODES.VALIDATION_INVALID_INVOICE)
    );
  }

  if (tipo !== 'guest_account') {
    throw new HttpsError(
      'failed-precondition',
      `Facturación de tipo "${tipo}" no está implementada todavía`,
      withLhCode(LH_CODES.INVOICE_TYPE_NOT_SUPPORTED)
    );
  }

  return admin.firestore().runTransaction(async (tx) => {
    const existingInvoiceSnap = await tx.get(
      admin.firestore().collection('invoices').where('referenceId', '==', referenceId).limit(1)
    );
    if (!existingInvoiceSnap.empty) {
      throw new HttpsError(
        'already-exists',
        'Ya existe una factura para esta referencia',
        withLhCode(LH_CODES.INVOICE_DUPLICATE_REFERENCE)
      );
    }

    const accountRef = admin.firestore().collection('guestAccounts').doc(referenceId);
    const accountSnap = await tx.get(accountRef);
    if (!accountSnap.exists) {
      throw new HttpsError('not-found', 'Cuenta de huésped no encontrada', withLhCode(LH_CODES.ACCOUNT_NOT_FOUND));
    }
    const account = accountSnap.data()!;

    if (account.status !== 'closed') {
      throw new HttpsError(
        'failed-precondition',
        'Solo se pueden facturar cuentas cerradas',
        withLhCode(LH_CODES.INVOICE_ACCOUNT_NOT_CLOSED)
      );
    }
    if (account.balance !== 0) {
      throw new HttpsError(
        'failed-precondition',
        'La cuenta debe tener balance cero para facturar',
        withLhCode(LH_CODES.INVOICE_ACCOUNT_HAS_BALANCE)
      );
    }

    const items = (account.charges || []).map((charge: any) => ({
      description: charge.description,
      quantity: charge.quantity,
      unitPrice: charge.amount,
      subtotal: charge.total,
    }));

    const { numero: invoiceNumber } = await getNextSequence(tx, 'invoice', new Date());

    const invoiceRef = admin.firestore().collection('invoices').doc();
    tx.set(invoiceRef, {
      invoiceNumber,
      type: tipo,
      referenceId,
      clientName,
      clientTaxId,
      ...(clientAddress ? { clientAddress } : {}),
      ...(clientEmail ? { clientEmail } : {}),
      ...(clientPhone ? { clientPhone } : {}),
      items,
      subtotal: account.subtotal,
      tax: account.tax,
      total: account.total,
      status: 'active',
      issuedAt: admin.firestore.FieldValue.serverTimestamp(),
      issuedBy: caller.uid,
    });

    return { invoiceId: invoiceRef.id, invoiceNumber };
  });
});

export const cancelarFactura = onCall(async (request) => {
  const caller = await requireRole(request.auth, ['receptionist', 'manager', 'admin', 'superadmin']);

  const { invoiceId, motivo } = request.data ?? {};
  if (!invoiceId || !motivo) {
    throw new HttpsError(
      'invalid-argument',
      'invoiceId y motivo son requeridos',
      withLhCode(LH_CODES.VALIDATION_INVALID_INVOICE)
    );
  }

  return admin.firestore().runTransaction(async (tx) => {
    const ref = admin.firestore().collection('invoices').doc(invoiceId);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Factura no encontrada', withLhCode(LH_CODES.INVOICE_NOT_FOUND));
    }
    const invoice = snap.data()!;

    if (invoice.status === 'cancelled') {
      throw new HttpsError(
        'failed-precondition',
        'La factura ya está cancelada',
        withLhCode(LH_CODES.INVOICE_ALREADY_CANCELLED)
      );
    }

    tx.update(ref, {
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: caller.uid,
      cancelReason: motivo,
    });

    return { invoiceId, status: 'cancelled' as const };
  });
});
