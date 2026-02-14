import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { BaseRepository } from './base.repository';

/**
 * Product Repository
 * Contract for product data operations
 */
export abstract class ProductRepository extends BaseRepository<Product> {
  // Add product-specific methods here
  abstract getByCategory(category: string): Observable<Product[]>;
  abstract getActiveProducts(): Observable<Product[]>;
}
