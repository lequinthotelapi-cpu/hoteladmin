import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { ProductFirebaseRepository } from '../repositories/product-firebase.repository';
import { Product, CreateProductData, UpdateProductData } from '../../domain/models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private productRepository: ProductFirebaseRepository) {}

  getAll(): Observable<Product[]> {
    return this.productRepository.getAll();
  }

  getById(id: string): Observable<Product | null> {
    return this.productRepository.getById(id);
  }

  getLowStockProducts(): Observable<Product[]> {
    return this.productRepository.getLowStockProducts();
  }

  async create(data: CreateProductData): Promise<string> {
    await this.validateCode(data.code);
    this.validateStock(data.currentStock, data.minStock);
    this.validatePrices(data.cost, data.price);
    return this.productRepository.create(data);
  }

  async update(id: string, data: UpdateProductData): Promise<void> {
    if (data.code) {
      await this.validateCode(data.code, id);
    }
    if (data.currentStock !== undefined && data.minStock !== undefined) {
      this.validateStock(data.currentStock, data.minStock);
    }
    if (data.cost !== undefined && data.price !== undefined) {
      this.validatePrices(data.cost, data.price);
    }
    return this.productRepository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.productRepository.delete(id);
  }

  async adjustStock(id: string, quantity: number, userId: string, reason: string): Promise<void> {
    const product = await firstValueFrom(this.productRepository.getById(id));
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const newStock = product.currentStock + quantity;
    if (newStock < 0) {
      throw new Error('Stock insuficiente');
    }

    await this.productRepository.update(id, {
      currentStock: newStock,
      updatedBy: userId
    });
  }

  async updateStock(id: string, newStock: number, userId: string): Promise<void> {
    if (newStock < 0) {
      throw new Error('Stock insuficiente');
    }

    await this.productRepository.update(id, {
      currentStock: newStock,
      updatedBy: userId
    });
  }

  private async validateCode(code: string, excludeId?: string): Promise<void> {
    const products = await firstValueFrom(this.productRepository.searchByCode(code));
    const exists = products.some(p => p.id !== excludeId);
    if (exists) {
      throw new Error('El código del producto ya existe');
    }
  }

  private validateStock(currentStock: number, minStock: number): void {
    if (currentStock < 0) {
      throw new Error('El stock actual no puede ser negativo');
    }
    if (minStock < 0) {
      throw new Error('El stock mínimo no puede ser negativo');
    }
  }

  private validatePrices(cost: number, price: number): void {
    if (cost < 0) {
      throw new Error('El costo no puede ser negativo');
    }
    if (price < 0) {
      throw new Error('El precio no puede ser negativo');
    }
    if (price < cost) {
      throw new Error('El precio de venta debe ser mayor o igual al costo');
    }
  }
}
