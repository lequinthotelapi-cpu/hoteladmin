import { Observable } from 'rxjs';

/**
 * Base Repository Interface
 * Generic contract for CRUD operations on any entity
 * 
 * @template T - Entity type (e.g., User, Product, Order)
 */
export abstract class BaseRepository<T> {
  /**
   * Get all entities
   */
  abstract getAll(): Observable<T[]>;

  /**
   * Get entity by ID
   * @param id - Entity unique identifier
   */
  abstract getById(id: string): Observable<T | null>;

  /**
   * Query entities by field value
   * @param field - Field name to query
   * @param value - Value to match
   */
  abstract getByField(field: string, value: any): Observable<T[]>;

  /**
   * Create new entity
   * @param entity - Entity to create
   * @returns Promise with the created entity ID
   */
  abstract create(entity: T): Promise<string>;

  /**
   * Update existing entity
   * @param id - Entity ID
   * @param entity - Partial entity with fields to update
   */
  abstract update(id: string, entity: Partial<T>): Promise<void>;

  /**
   * Delete entity
   * @param id - Entity ID
   */
  abstract delete(id: string): Promise<void>;
}
