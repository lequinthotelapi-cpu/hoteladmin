import { Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { Product } from '../../domain/models/product.model';
import { BaseFirestoreRepository } from './base-firestore.repository';

/**
 * Firebase Product Repository Implementation
 * Implements product data operations using Firestore
 */
@Injectable({
  providedIn: 'root'
})
export class FirebaseProductRepository 
  extends BaseFirestoreRepository<Product> 
  implements ProductRepository {

  protected collectionName = 'products';

  constructor(firestore: Firestore) {
    super(firestore);
  }

  // Implement product-specific methods
  getByCategory(category: string): Observable<Product[]> {
    return this.getByField('category', category);
  }

  getActiveProducts(): Observable<Product[]> {
    return this.getByField('active', true);
  }
}
