export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  measurementUnit: string;
  currentStock: number;
  minStock: number;
  cost: number;
  price: number;
  photoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CreateProductData {
  code: string;
  name: string;
  description?: string;
  category: string;
  measurementUnit: string;
  currentStock: number;
  minStock: number;
  cost: number;
  price: number;
  photoUrl?: string;
  isActive: boolean;
  createdBy: string;
}

export interface UpdateProductData {
  code?: string;
  name?: string;
  description?: string;
  category?: string;
  measurementUnit?: string;
  currentStock?: number;
  minStock?: number;
  cost?: number;
  price?: number;
  photoUrl?: string;
  isActive?: boolean;
  updatedBy: string;
}
