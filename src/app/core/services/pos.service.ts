import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Sale, CreateSaleData } from '../../domain/models/sale.model';
import { FirebaseSaleRepository } from '../../infrastructure/repositories/sale-firebase.repository';

export interface CreateSaleResult {
  saleId: string | null;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class POSService {

  constructor(
    private saleRepo: FirebaseSaleRepository,
    private functions: Functions
  ) {}

  // SPEC-11: delega en la Cloud Function registrarVentaPOS (transaccional —
  // valida y descuenta stock atómicamente, todo o nada). Unifica venta
  // directa y "cargar a habitación" (antes esta última no pasaba por
  // POSService en absoluto, ver pos.component.ts). tipoVenta/guestAccountId
  // son nuevos parámetros opcionales; sin ellos, se comporta como venta
  // directa (compatibilidad con cualquier otro caller futuro).
  async createSale(
    data: CreateSaleData & { tipoVenta?: 'directa' | 'habitacion'; guestAccountId?: string }
  ): Promise<CreateSaleResult> {
    const registrarVentaPOSFn = httpsCallable(this.functions, 'registrarVentaPOS');
    try {
      const response: any = await registrarVentaPOSFn({
        items: data.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
        paymentMethod: data.paymentMethod,
        tipoVenta: data.tipoVenta || 'directa',
        guestAccountId: data.guestAccountId,
        createdByName: data.createdByName
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo registrar la venta');
    }
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
