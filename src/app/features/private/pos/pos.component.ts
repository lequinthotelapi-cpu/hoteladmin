import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Product } from '../../../domain/models/product.model';
import { SaleItem } from '../../../domain/models/sale.model';
import { ProductService } from '../../../core/services/product.service';
import { POSService } from '../../../core/services/pos.service';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { GuestAccountService } from '../../../core/services/guest-account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { ParametersService } from '../../../core/services/parameters.service';
import { ParameterOption } from '../../../domain/models/parameter.model';
import { GuestAccount } from '../../../domain/models/guest-account.model';

@Component({
  selector: 'fury-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})
export class PosComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  cart: SaleItem[] = [];
  searchText: string = '';
  
  currentUserId: string = '';
  currentUserName: string = '';
  openCashRegisterId: string | null = null;
  
  paymentMethods: ParameterOption[] = [];
  selectedPaymentMethod: string = 'cash';
  
  // Room charge
  saleType: 'direct' | 'room' = 'direct';
  openAccounts: GuestAccount[] = [];
  selectedAccountId: string = '';
  
  processing = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private posService: POSService,
    private cashRegisterService: CashRegisterService,
    private guestAccountService: GuestAccountService,
    private authService: AuthService,
    private alertService: AlertService,
    private parametersService: ParametersService
  ) {}

  async ngOnInit() {
    const firebaseUser = await this.authService.getCurrentUser();
    if (firebaseUser) {
      this.currentUserId = firebaseUser.uid;
      const user = await this.authService.getUserData(firebaseUser.uid);
      if (user) {
        this.currentUserName = `${user.firstName} ${user.lastName}`;
      }
      
      const openCash = await this.cashRegisterService.getOpenCashRegister(this.currentUserId);
      this.openCashRegisterId = openCash?.id || null;
      console.log('Caja abierta:', this.openCashRegisterId);
      
      if (!this.openCashRegisterId) {
        this.alertService.warning('No tienes una caja abierta. Abre una caja para poder vender.');
      }
    }
    
    this.paymentMethods = this.parametersService.getOptions('paymentMethods');
    this.loadProducts();
    this.loadOpenAccounts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts() {
    this.productService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe(products => {
        this.products = products.filter(p => p.isActive && p.currentStock > 0);
        this.applyFilter();
      });
  }

  loadOpenAccounts() {
    this.guestAccountService.getOpenAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe(accounts => {
        this.openAccounts = accounts;
      });
  }

  applyFilter() {
    if (!this.searchText.trim()) {
      this.filteredProducts = this.products;
    } else {
      const search = this.searchText.toLowerCase();
      this.filteredProducts = this.products.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.code.toLowerCase().includes(search)
      );
    }
  }

  addToCart(product: Product) {
    const existingItem = this.cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.currentStock) {
        this.alertService.error(`Stock máximo: ${product.currentStock}`);
        return;
      }
      existingItem.quantity++;
      existingItem.subtotal = existingItem.quantity * existingItem.price;
    } else {
      this.cart.push({
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity: 1,
        price: product.price,
        subtotal: product.price
      });
    }
  }

  removeFromCart(index: number) {
    this.cart.splice(index, 1);
  }

  updateQuantity(item: SaleItem, quantity: number) {
    const product = this.products.find(p => p.id === item.productId);
    if (!product) return;
    
    if (quantity <= 0) {
      const index = this.cart.indexOf(item);
      this.removeFromCart(index);
      return;
    }
    
    if (quantity > product.currentStock) {
      this.alertService.error(`Stock máximo: ${product.currentStock}`);
      return;
    }
    
    item.quantity = quantity;
    item.subtotal = item.quantity * item.price;
  }

  get subtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.subtotal, 0);
  }

  get tax(): number {
    return this.subtotal * 0.19; // IVA 19%
  }

  get total(): number {
    return this.subtotal + this.tax;
  }

  clearCart() {
    this.cart = [];
  }

  async processSale() {
    if (this.cart.length === 0) {
      this.alertService.error('El carrito está vacío');
      return;
    }

    if (this.saleType === 'direct' && !this.openCashRegisterId) {
      this.alertService.error('Debes tener una caja abierta');
      return;
    }

    if (this.saleType === 'room' && !this.selectedAccountId) {
      this.alertService.error('Selecciona una habitación');
      return;
    }

    this.processing = true;

    try {
      // SPEC-11: ambos tipos de venta pasan ahora por la misma Function
      // transaccional (registrarVentaPOS vía POSService.createSale) — antes
      // "cargar a habitación" era código separado acá mismo, sin transacción
      // ni validación de stock.
      await this.posService.createSale({
        items: this.cart,
        subtotal: this.subtotal,
        tax: this.tax,
        total: this.total,
        paymentMethod: this.selectedPaymentMethod,
        createdBy: this.currentUserId,
        createdByName: this.currentUserName,
        tipoVenta: this.saleType === 'direct' ? 'directa' : 'habitacion',
        guestAccountId: this.saleType === 'room' ? this.selectedAccountId : undefined
      });

      this.alertService.success(
        this.saleType === 'direct' ? 'Venta registrada exitosamente' : 'Cargo agregado a la habitación'
      );

      this.clearCart();
      this.loadProducts();
    } catch (error: any) {
      console.error('Error al procesar venta:', error);
      this.alertService.error(error.message || 'Error al procesar venta');
    } finally {
      this.processing = false;
    }
  }
}
