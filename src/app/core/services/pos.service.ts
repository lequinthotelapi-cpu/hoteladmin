import { Injectable } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { Sale, CreateSaleData, SaleItem } from '../../domain/models/sale.model';
import { SaleRepository } from '../../domain/repositories/sale.repository';
import { FirebaseSaleRepository } from '../../infrastructure/repositories/sale-firebase.repository';
import { ProductService } from './product.service';
import { CashRegisterService } from './cash-register.service';

@Injectable({
  providedIn: 'root'
})
export class POSService {
  
  constructor(
    private saleRepo: FirebaseSaleRepository,
    private productService: ProductService,
    private cashRegisterService: CashRegisterService
  ) {}

  async createSale(data: CreateSaleData): Promise<Sale> {
    console.log('POSService.createSale - Inicio:', data);
    
    // 1. Validar stock de cada producto
    for (const item of data.items) {
      const product = await firstValueFrom(this.productService.getById(item.productId));
      if (!product) {
        throw new Error(`Producto ${item.productName} no encontrado`);
      }
      if (!product.isActive) {
        throw new Error(`Producto ${item.productName} no está activo`);
      }
      if (product.currentStock < item.quantity) {
        throw new Error(`Stock insuficiente de ${product.name}. Disponible: ${product.currentStock}`);
      }
    }

    // 2. Obtener caja abierta
    const openCashRegister = await this.cashRegisterService.getOpenCashRegister(data.createdBy);
    if (!openCashRegister) {
      throw new Error('Debes tener una caja abierta para registrar ventas');
    }
    const cashRegisterId = openCashRegister.id;

    // 3. Crear la venta
    const sale: any = {
      ...data,
      cashRegisterId,
      createdAt: Timestamp.now()
    };

    console.log('Creando venta:', sale);
    const saleId = await this.saleRepo.create(sale);
    const createdSale = { ...sale, id: saleId } as Sale;
    console.log('Venta creada:', saleId);

    // 4. Descontar inventario
    for (const item of data.items) {
      console.log('Ajustando stock:', item.productId, -item.quantity);
      await this.productService.adjustStock(
        item.productId,
        -item.quantity,
        data.createdBy,
        `Venta #${createdSale.id}`
      );
    }

    // 5. Registrar en caja
    console.log('Registrando transacción en caja');
    await this.cashRegisterService.addTransaction({
      cashRegisterId,
      type: 'sale',
      amount: data.total,
      paymentMethod: data.paymentMethod,
      description: `Venta #${createdSale.id}`,
      reference: createdSale.id,
      createdBy: data.createdBy,
      createdByName: data.createdByName
    });

    console.log('POSService.createSale - Completado');
    return createdSale;
  }

  getAll(): Observable<Sale[]> {
    return this.saleRepo.getAll();
  }

  getById(id: string): Observable<Sale | null> {
    return this.saleRepo.getById(id);
  }

  getByCashRegister(cashRegisterId: string): Observable<Sale[]> {
    return this.saleRepo.getByCashRegister(cashRegisterId);
  }

  getByDateRange(startDate: Date, endDate: Date): Observable<Sale[]> {
    return this.saleRepo.getByDateRange(startDate, endDate);
  }
}
