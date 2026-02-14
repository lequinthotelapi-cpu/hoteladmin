import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { Product } from '../../../../domain/models/product.model';
import { ProductService } from '../../../../core/services/product.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProductCreateUpdateComponent } from '../product-create-update/product-create-update.component';
import { ListColumn } from '../../../../../@fury/shared/list/list-column.model';

@Component({
  selector: 'fury-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss']
})
export class ProductsListComponent implements OnInit, AfterViewInit {
  products$: Observable<Product[]>;
  dataSource: MatTableDataSource<Product> = new MatTableDataSource();

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  columns: ListColumn[] = [
    { name: 'Código', property: 'code', visible: true, isModelProperty: true },
    { name: 'Nombre', property: 'name', visible: true, isModelProperty: true },
    { name: 'Categoría', property: 'category', visible: true, isModelProperty: true },
    { name: 'Stock', property: 'currentStock', visible: true, isModelProperty: true },
    { name: 'Precio', property: 'price', visible: true, isModelProperty: true },
    { name: 'Estado', property: 'isActive', visible: true, isModelProperty: true },
    { name: 'Acciones', property: 'actions', visible: true, isModelProperty: false }
  ] as ListColumn[];

  constructor(
    private productService: ProductService,
    private dialog: MatDialog,
    private alertService: AlertService,
    private authService: AuthService
  ) {}

  get visibleColumns() {
    return this.columns.filter(column => column.visible).map(column => column.property);
  }

  ngOnInit() {
    this.loadProducts();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadProducts() {
    this.products$ = this.productService.getAll();
    this.products$.subscribe(products => {
      this.dataSource.data = products;
    });
  }

  onFilterChange(value: string) {
    if (!this.dataSource) {
      return;
    }
    value = value.trim();
    value = value.toLowerCase();
    this.dataSource.filter = value;
  }

  createProduct() {
    this.dialog.open(ProductCreateUpdateComponent).afterClosed().subscribe((product: Product) => {
      if (product) {
        this.loadProducts();
        this.alertService.success('Producto creado exitosamente');
      }
    });
  }

  updateProduct(product: Product) {
    this.dialog.open(ProductCreateUpdateComponent, {
      data: product
    }).afterClosed().subscribe((updatedProduct: Product) => {
      if (updatedProduct) {
        this.loadProducts();
        this.alertService.success('Producto actualizado exitosamente');
      }
    });
  }

  async deleteProduct(product: Product) {
    const confirmed = await this.alertService.confirmDelete(
      'Eliminar Producto',
      `¿Está seguro de eliminar el producto "${product.name}"?`
    );
    
    if (confirmed) {
      try {
        await this.productService.delete(product.id);
        this.loadProducts();
        this.alertService.success('Producto eliminado exitosamente');
      } catch (error: any) {
        this.alertService.error(error.message || 'Error al eliminar el producto');
      }
    }
  }

  isLowStock(product: Product): boolean {
    return product.currentStock <= product.minStock;
  }
}
