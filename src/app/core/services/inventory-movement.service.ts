import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { InventoryMovementRepository } from '../repositories/inventory-movement.repository';
import { InventoryMovement, CreateInventoryMovementData } from '../../domain/models/inventory-movement.model';

@Injectable()
export class InventoryMovementService {
  constructor(
    private movementRepository: InventoryMovementRepository,
    private functions: Functions
  ) {}

  getAll(): Observable<InventoryMovement[]> {
    return this.movementRepository.getAll();
  }

  getById(id: string): Observable<InventoryMovement | null> {
    return this.movementRepository.getById(id);
  }

  getByProduct(productId: string): Observable<InventoryMovement[]> {
    return this.movementRepository.getByProduct(productId);
  }

  // SPEC-15: delega en la Cloud Function registrarMovimientoInventario
  // (transaccional — valida y actualiza el stock del producto atómicamente
  // junto con el registro del movimiento, en vez de dos escrituras sueltas).
  async create(data: CreateInventoryMovementData): Promise<string> {
    const registrarMovimientoFn = httpsCallable(this.functions, 'registrarMovimientoInventario');
    try {
      const response: any = await registrarMovimientoFn({
        productId: data.productId,
        type: data.type,
        reason: data.reason,
        quantity: data.quantity,
        unitCost: data.unitCost,
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes
      });
      return response.data.movementId;
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo registrar el movimiento de inventario');
    }
  }

  async delete(id: string): Promise<void> {
    throw new Error('No se pueden eliminar movimientos de inventario por integridad de datos');
  }
}
