import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { InventoryMovement } from '../../../../domain/models/inventory-movement.model';
import { InventoryMovementService } from '../../../../core/services/inventory-movement.service';
import { AlertService } from '../../../../core/services/alert.service';
import { MovementCreateComponent } from '../movement-create/movement-create.component';
import { ListColumn } from '../../../../../@fury/shared/list/list-column.model';

@Component({
  selector: 'fury-movements-list',
  templateUrl: './movements-list.component.html',
  styleUrls: ['./movements-list.component.scss']
})
export class MovementsListComponent implements OnInit, AfterViewInit {
  movements$: Observable<InventoryMovement[]>;
  dataSource: MatTableDataSource<InventoryMovement> = new MatTableDataSource();

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  columns: ListColumn[] = [
    { name: 'Fecha', property: 'createdAt', visible: true, isModelProperty: true },
    { name: 'Producto', property: 'productName', visible: true, isModelProperty: true },
    { name: 'Tipo', property: 'type', visible: true, isModelProperty: true },
    { name: 'Motivo', property: 'reason', visible: true, isModelProperty: true },
    { name: 'Cantidad', property: 'quantity', visible: true, isModelProperty: true },
    { name: 'Stock Anterior', property: 'previousStock', visible: true, isModelProperty: true },
    { name: 'Stock Nuevo', property: 'newStock', visible: true, isModelProperty: true },
    { name: 'Usuario', property: 'createdByName', visible: true, isModelProperty: true }
  ] as ListColumn[];

  constructor(
    private movementService: InventoryMovementService,
    private dialog: MatDialog,
    private alertService: AlertService
  ) {}

  get visibleColumns() {
    return this.columns.filter(column => column.visible).map(column => column.property);
  }

  ngOnInit() {
    this.loadMovements();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadMovements() {
    this.movements$ = this.movementService.getAll();
    this.movements$.subscribe(movements => {
      this.dataSource.data = movements;
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

  createMovement() {
    this.dialog.open(MovementCreateComponent, {
      width: '600px'
    }).afterClosed().subscribe((movement: InventoryMovement) => {
      if (movement) {
        this.loadMovements();
        this.alertService.success('Movimiento registrado exitosamente');
      }
    });
  }

  getTypeLabel(type: string): string {
    const types: any = {
      'entry': 'Entrada',
      'exit': 'Salida',
      'adjustment': 'Ajuste'
    };
    return types[type] || type;
  }

  getTypeColor(type: string): string {
    const colors: any = {
      'entry': 'primary',
      'exit': 'warn',
      'adjustment': 'accent'
    };
    return colors[type] || '';
  }
}
