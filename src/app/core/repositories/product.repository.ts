import { Observable } from 'rxjs';
import { Product, CreateProductData, UpdateProductData } from '../../domain/models/product.model';

export abstract class ProductRepository {
  abstract getAll(): Observable<Product[]>;
  abstract getById(id: string): Observable<Product | null>;
  abstract create(data: CreateProductData): Promise<string>;
  abstract update(id: string, data: UpdateProductData): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract searchByCode(code: string): Observable<Product[]>;
  abstract getLowStockProducts(): Observable<Product[]>;
}
