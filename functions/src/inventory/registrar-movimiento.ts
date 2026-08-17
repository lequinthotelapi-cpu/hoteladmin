import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireRole } from '../shared/auth-context';
import { LH_CODES, withLhCode } from '../shared/errors';

/**
 * SPEC-15 — Movimiento de inventario transaccional.
 *
 * Reemplaza `InventoryMovementService.create()`
 * (`inventory-movement.service.ts:26-71`): leía el producto suelto (fuera de
 * transacción), calculaba el nuevo stock en memoria del cliente, y escribía
 * el movimiento y la actualización de stock en dos llamadas Firestore
 * completamente separadas, sin transacción — dos movimientos concurrentes
 * sobre el mismo producto pueden pisarse (lost update) o dejar pasar una
 * salida sin stock suficiente. Mismo patrón de riesgo ya corregido en
 * `crearReserva` (SPEC-05) y `registrarVentaPOS` (SPEC-11).
 *
 * Validación de producto activo: NUEVA (confirmada con el usuario) — el
 * código cliente original no la tenía.
 *
 * `quantity` siempre es > 0 (mismo `Validators.min(1)` que ya tenía el
 * formulario Angular, ahora también server-side). Para `type: 'adjustment'`
 * la fórmula es idéntica a `entry` (suma la cantidad) — el modelo de datos
 * original (`CreateInventoryMovementData.quantity: number`) permitía en
 * teoría un ajuste negativo, pero la UI real nunca lo produce (el form no
 * permite quantity <= 0), así que no es un comportamiento a preservar.
 */

const ALLOWED_ROLES = ['admin', 'superadmin'] as const;
const MOVEMENT_TYPES = ['entry', 'exit', 'adjustment'] as const;
type MovementType = (typeof MOVEMENT_TYPES)[number];

interface RegistrarMovimientoInput {
  productId: string;
  type: MovementType;
  reason: string;
  quantity: number;
  unitCost?: number;
  supplierId?: string;
  invoiceNumber?: string;
  notes?: string;
  createdByName?: string;
}

export const registrarMovimientoInventario = onCall(async (request) => {
  const caller = await requireRole(request.auth, [...ALLOWED_ROLES]);

  const { productId, type, reason, quantity, unitCost, supplierId, invoiceNumber, notes, createdByName } =
    (request.data ?? {}) as Partial<RegistrarMovimientoInput>;

  if (!productId || !type || !reason || !(quantity! > 0)) {
    throw new HttpsError(
      'invalid-argument',
      'productId, type, reason y quantity (>0) son requeridos',
      withLhCode(LH_CODES.VALIDATION_INVALID_MOVEMENT)
    );
  }
  if (!MOVEMENT_TYPES.includes(type)) {
    throw new HttpsError(
      'invalid-argument',
      'type debe ser "entry", "exit" o "adjustment"',
      withLhCode(LH_CODES.VALIDATION_INVALID_MOVEMENT)
    );
  }
  const validatedQuantity: number = quantity!;

  return admin.firestore().runTransaction(async (tx) => {
    const productRef = admin.firestore().collection('products').doc(productId);
    const productSnap = await tx.get(productRef);

    if (!productSnap.exists) {
      throw new HttpsError(
        'not-found',
        `Producto ${productId} no encontrado`,
        withLhCode(LH_CODES.PRODUCT_NOT_FOUND)
      );
    }
    const product = productSnap.data()!;
    if (!product.isActive) {
      throw new HttpsError(
        'failed-precondition',
        `Producto ${product.name} no está activo`,
        withLhCode(LH_CODES.PRODUCT_INACTIVE)
      );
    }

    let quantityChange = 0;
    if (type === 'entry') {
      quantityChange = validatedQuantity;
    } else if (type === 'exit') {
      quantityChange = -validatedQuantity;
      if (product.currentStock < validatedQuantity) {
        throw new HttpsError(
          'failed-precondition',
          `Stock insuficiente de ${product.name}. Disponible: ${product.currentStock}`,
          withLhCode(LH_CODES.INSUFFICIENT_STOCK)
        );
      }
    } else {
      quantityChange = validatedQuantity;
    }

    // `quantity` siempre es > 0 (validado arriba) y 'exit' ya validó stock
    // suficiente, así que newStock nunca puede quedar negativo aquí para
    // ningún tipo de movimiento.
    const previousStock = product.currentStock;
    const newStock = previousStock + quantityChange;

    const totalCost = unitCost ? unitCost * Math.abs(validatedQuantity) : undefined;

    const movementRef = admin.firestore().collection('inventoryMovements').doc();
    const movementData: Record<string, unknown> = {
      productId,
      productName: product.name,
      productCode: product.code,
      type,
      reason,
      quantity: validatedQuantity,
      previousStock,
      newStock,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: caller.uid,
      createdByName: createdByName || caller.uid,
    };
    if (unitCost !== undefined) {
      movementData.unitCost = unitCost;
    }
    if (totalCost !== undefined) {
      movementData.totalCost = totalCost;
    }
    if (supplierId) {
      movementData.supplierId = supplierId;
    }
    if (invoiceNumber) {
      movementData.invoiceNumber = invoiceNumber;
    }
    if (notes) {
      movementData.notes = notes;
    }

    tx.set(movementRef, movementData);
    tx.update(productRef, {
      currentStock: newStock,
      updatedBy: caller.uid,
      updatedAt: new Date(),
    });

    return { movementId: movementRef.id, newStock };
  });
});
