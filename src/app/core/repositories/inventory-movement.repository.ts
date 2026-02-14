import { Observable } from 'rxjs';
import { InventoryMovement, CreateInventoryMovementData, UpdateInventoryMovementData } from '../../domain/models/inventory-movement.model';

export abstract class InventoryMovementRepository {
  abstract getAll(): Observable<InventoryMovement[]>;
  abstract getById(id: string): Observable<InventoryMovement | null>;
  abstract getByProduct(productId: string): Observable<InventoryMovement[]>;
  abstract create(data: CreateInventoryMovementData): Promise<string>;
  abstract update(id: string, data: UpdateInventoryMovementData): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
