import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../shared/auth-context';
import { LH_CODES, withLhCode } from '../shared/errors';
import { calcularTotalesConImpuesto } from '../shared/pricing';
import { aplicarCargoCuenta } from '../guest-accounts/cargos-pagos';

/**
 * SPEC-11 — Venta POS transaccional.
 *
 * Reemplaza `POSService.createSale` (`pos.service.ts:21-83`): validaba stock
 * en un loop, y LUEGO lo descontaba en otro loop separado, sin transacción —
 * dos ventas concurrentes del mismo producto podían pasar ambas la
 * validación antes de que ninguna descontara stock.
 *
 * Hallazgo real (llevó a decisión del usuario antes de implementar): el
 * flujo "cargar a habitación" del POS (`pos.component.ts:202-224`) NO pasa
 * por `POSService.createSale` en absoluto — es código separado en el
 * COMPONENTE que llama `guestAccountService.addCharge` + un loop manual de
 * `productService.updateStock`, sin ninguna validación de stock suficiente
 * (a diferencia de la venta directa, que sí valida). Decisión del usuario:
 * unificar ambos flujos en esta única Function, agregando la validación de
 * stock que hoy falta en el camino de habitación. Esto es un cambio de
 * comportamiento real (una carga a habitación que hoy se acepta
 * silenciosamente incluso sin stock suficiente, ahora se rechaza).
 *
 * IVA 19% (no 13%): confirmado en `pos.component.ts:160`
 * (`this.subtotal * 0.19`), distinto del 13% usado en reservas/guest
 * accounts — específico de ventas POS, no un error de tipeo.
 *
 * "reutiliza agregarCargoCuenta (Spec 09) internamente": Firestore no
 * permite invocar otra Cloud Function dentro de una transacción de forma
 * atómica, así que la reutilización real es de la lógica compartida
 * `aplicarCargoCuenta` (extraída de `cargos-pagos.ts`), no de la Function
 * pública en sí.
 *
 * IMPORTANTE — orden de lecturas/escrituras: Firestore exige que TODAS las
 * lecturas de una transacción ocurran antes que CUALQUIER escritura. Por eso
 * se leen todos los productos (stock) y, según el caso, la caja abierta o la
 * cuenta de huésped, antes de decrementar stock o escribir venta/cargo.
 */

const POS_TAX_RATE = 0.19;
// /pos solo lo tienen receptionist/admin/superadmin en DEFAULT_ROLE_PERMISSIONS
// (manager no tiene acceso a la ruta POS) — a diferencia de otras Specs de
// bookings/guest-accounts, que sí incluyen manager.
const ALLOWED_ROLES = ['receptionist', 'admin', 'superadmin'] as const;

interface SaleItemInput {
  productId: string;
  quantity: number;
}

export const registrarVentaPOS = onCall(async (request) => {
  const caller = await requireRole(request.auth, [...ALLOWED_ROLES]);

  const { items, paymentMethod, tipoVenta, guestAccountId, createdByName } = request.data ?? {};

  if (!Array.isArray(items) || items.length === 0 || !paymentMethod || !tipoVenta) {
    throw new HttpsError(
      'invalid-argument',
      'items (no vacío), paymentMethod y tipoVenta son requeridos',
      withLhCode(LH_CODES.VALIDATION_INVALID_SALE)
    );
  }
  if (tipoVenta !== 'directa' && tipoVenta !== 'habitacion') {
    throw new HttpsError(
      'invalid-argument',
      'tipoVenta debe ser "directa" o "habitacion"',
      withLhCode(LH_CODES.VALIDATION_INVALID_SALE)
    );
  }
  if (tipoVenta === 'habitacion' && !guestAccountId) {
    throw new HttpsError(
      'invalid-argument',
      'guestAccountId es requerido para ventas a habitación',
      withLhCode(LH_CODES.VALIDATION_INVALID_SALE)
    );
  }
  for (const item of items as SaleItemInput[]) {
    if (!item.productId || !(item.quantity > 0)) {
      throw new HttpsError(
        'invalid-argument',
        'Cada item requiere productId y quantity (>0)',
        withLhCode(LH_CODES.VALIDATION_INVALID_SALE)
      );
    }
  }

  return admin.firestore().runTransaction(async (tx) => {
    // === LECTURAS (todas antes de cualquier escritura) ===
    const productRefs = (items as SaleItemInput[]).map((item) =>
      admin.firestore().collection('products').doc(item.productId)
    );
    const productSnaps = await tx.getAll(...productRefs);

    const saleItems: Array<{
      productId: string;
      productCode: string;
      productName: string;
      quantity: number;
      price: number;
      subtotal: number;
    }> = [];
    let subtotal = 0;

    for (let i = 0; i < items.length; i++) {
      const item: SaleItemInput = items[i];
      const snap = productSnaps[i];
      if (!snap.exists) {
        throw new HttpsError(
          'not-found',
          `Producto ${item.productId} no encontrado`,
          withLhCode(LH_CODES.PRODUCT_NOT_FOUND)
        );
      }
      const product = snap.data()!;
      if (!product.isActive) {
        throw new HttpsError(
          'failed-precondition',
          `Producto ${product.name} no está activo`,
          withLhCode(LH_CODES.PRODUCT_INACTIVE)
        );
      }
      if (product.currentStock < item.quantity) {
        throw new HttpsError(
          'failed-precondition',
          `Stock insuficiente de ${product.name}. Disponible: ${product.currentStock}`,
          withLhCode(LH_CODES.INSUFFICIENT_STOCK)
        );
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;
      saleItems.push({
        productId: item.productId,
        productCode: product.code,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal: itemSubtotal,
      });
    }

    const { tax, total } = calcularTotalesConImpuesto(subtotal, POS_TAX_RATE);

    let cashRegisterId: string | undefined;
    if (tipoVenta === 'directa') {
      const openRegisterSnap = await tx.get(
        admin
          .firestore()
          .collection('cashRegisters')
          .where('userId', '==', caller.uid)
          .where('status', '==', 'open')
          .limit(1)
      );
      if (openRegisterSnap.empty) {
        throw new HttpsError(
          'failed-precondition',
          'Debes tener una caja abierta para registrar ventas',
          withLhCode(LH_CODES.NO_OPEN_CASH_REGISTER)
        );
      }
      cashRegisterId = openRegisterSnap.docs[0].id;
    }

    // aplicarCargoCuenta hace su propia lectura (guestAccounts) + escritura;
    // debe llamarse aquí (antes del decremento de stock) para que su lectura
    // no quede después de ninguna escritura previa en la transacción.
    if (tipoVenta === 'habitacion') {
      const description = `POS: ${saleItems.map((i) => `${i.productName} x${i.quantity}`).join(', ')}`;
      await aplicarCargoCuenta(
        tx,
        guestAccountId,
        { tipo: 'pos', descripcion: description, monto: total, cantidad: 1 },
        caller.uid
      );
    }

    // === ESCRITURAS ===
    for (let i = 0; i < items.length; i++) {
      const product = productSnaps[i].data()!;
      tx.update(productRefs[i], {
        currentStock: product.currentStock - items[i].quantity,
        updatedBy: caller.uid,
      });
    }

    if (tipoVenta === 'directa') {
      const saleRef = admin.firestore().collection('sales').doc();
      tx.set(saleRef, {
        items: saleItems,
        subtotal,
        tax,
        total,
        paymentMethod,
        cashRegisterId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: caller.uid,
        createdByName: createdByName || caller.uid,
      });

      const transactionRef = admin.firestore().collection('transactions').doc();
      tx.set(transactionRef, {
        cashRegisterId,
        type: 'sale',
        amount: total,
        paymentMethod,
        description: `Venta #${saleRef.id}`,
        reference: saleRef.id,
        createdBy: caller.uid,
        createdByName: createdByName || caller.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { saleId: saleRef.id, total };
    }

    return { saleId: null, total };
  });
});
