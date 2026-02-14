import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { InventoryMovementRepository } from '../repositories/inventory-movement.repository';
import { ProductService } from './product.service';
import { InventoryMovement, CreateInventoryMovementData } from '../../domain/models/inventory-movement.model';

@Injectable()
export class InventoryMovementService {
  constructor(
    private movementRepository: InventoryMovementRepository,
    private productService: ProductService
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

  async create(data: CreateInventoryMovementData): Promise<string> {
    const product = await firstValueFrom(this.productService.getById(data.productId));
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    let quantityChange = 0;
    if (data.type === 'entry') {
      quantityChange = data.quantity;
    } else if (data.type === 'exit') {
      quantityChange = -data.quantity;
      if (product.currentStock < data.quantity) {
        throw new Error('Stock insuficiente para realizar la salida');
      }
    } else if (data.type === 'adjustment') {
      quantityChange = data.quantity;
    }

    const previousStock = product.currentStock;
    const newStock = previousStock + quantityChange;

    if (newStock < 0) {
      throw new Error('El stock no puede ser negativo');
    }

    const totalCost = data.unitCost ? data.unitCost * Math.abs(data.quantity) : undefined;

    const movementData = {
      ...data,
      productName: product.name,
      productCode: product.code,
      previousStock,
      newStock,
      totalCost,
      createdByName: 'Usuario'
    };

    const movementId = await this.movementRepository.create(movementData);

    await this.productService.update(data.productId, {
      currentStock: newStock,
      updatedBy: data.createdBy
    });

    return movementId;
  }

  async delete(id: string): Promise<void> {
    throw new Error('No se pueden eliminar movimientos de inventario por integridad de datos');
  }
}
