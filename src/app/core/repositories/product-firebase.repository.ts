import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductRepository } from './product.repository';
import { Product, CreateProductData, UpdateProductData } from '../../domain/models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductFirebaseRepository implements ProductRepository {
  private collectionName = 'products';

  constructor(private firestore: Firestore) {}

  private convertTimestamps(data: any): Product {
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt
    };
  }

  getAll(): Observable<Product[]> {
    const productsCollection = collection(this.firestore, this.collectionName);
    return collectionData(productsCollection, { idField: 'id' }).pipe(
      map((products: any[]) => products.map(p => this.convertTimestamps(p)))
    );
  }

  getById(id: string): Observable<Product | null> {
    const productDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(productDoc, { idField: 'id' }).pipe(
      map((product: any) => product ? this.convertTimestamps(product) : null)
    );
  }

  async create(data: CreateProductData): Promise<string> {
    const productsCollection = collection(this.firestore, this.collectionName);
    const docRef = await addDoc(productsCollection, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  }

  async update(id: string, data: UpdateProductData): Promise<void> {
    const productDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    await updateDoc(productDoc, {
      ...data,
      updatedAt: new Date()
    });
  }

  async delete(id: string): Promise<void> {
    const productDoc = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(productDoc);
  }

  searchByCode(code: string): Observable<Product[]> {
    const productsCollection = collection(this.firestore, this.collectionName);
    const q = query(productsCollection, where('code', '==', code));
    return collectionData(q, { idField: 'id' }).pipe(
      map((products: any[]) => products.map(p => this.convertTimestamps(p)))
    );
  }

  getLowStockProducts(): Observable<Product[]> {
    return this.getAll().pipe(
      map(products => products.filter(p => p.currentStock <= p.minStock && p.isActive))
    );
  }
}
