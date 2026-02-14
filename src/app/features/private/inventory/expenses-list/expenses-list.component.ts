import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { Expense } from '../../../../domain/models/expense.model';
import { ExpenseService } from '../../../../core/services/expense.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ExpenseCreateUpdateComponent } from '../expense-create-update/expense-create-update.component';
import { ListColumn } from '../../../../../@fury/shared/list/list-column.model';

@Component({
  selector: 'fury-expenses-list',
  templateUrl: './expenses-list.component.html',
  styleUrls: ['./expenses-list.component.scss']
})
export class ExpensesListComponent implements OnInit, AfterViewInit {
  expenses$: Observable<Expense[]>;
  dataSource: MatTableDataSource<Expense> = new MatTableDataSource();

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  columns: ListColumn[] = [
    { name: 'Fecha', property: 'date', visible: true, isModelProperty: true },
    { name: 'Categoría', property: 'category', visible: true, isModelProperty: true },
    { name: 'Descripción', property: 'description', visible: true, isModelProperty: true },
    { name: 'Monto', property: 'amount', visible: true, isModelProperty: true },
    { name: 'Método de Pago', property: 'paymentMethod', visible: true, isModelProperty: true },
    { name: 'Usuario', property: 'createdByName', visible: true, isModelProperty: true },
    { name: 'Acciones', property: 'actions', visible: true, isModelProperty: false }
  ] as ListColumn[];

  constructor(
    private expenseService: ExpenseService,
    private dialog: MatDialog,
    private alertService: AlertService
  ) {}

  get visibleColumns() {
    return this.columns.filter(column => column.visible).map(column => column.property);
  }

  ngOnInit() {
    this.loadExpenses();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadExpenses() {
    this.expenses$ = this.expenseService.getAll();
    this.expenses$.subscribe(expenses => {
      this.dataSource.data = expenses;
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

  createExpense() {
    this.dialog.open(ExpenseCreateUpdateComponent, {
      width: '700px'
    }).afterClosed().subscribe((expense: Expense) => {
      if (expense) {
        this.loadExpenses();
        this.alertService.success('Gasto registrado exitosamente');
      }
    });
  }

  updateExpense(expense: Expense) {
    this.dialog.open(ExpenseCreateUpdateComponent, {
      width: '700px',
      data: expense
    }).afterClosed().subscribe((updatedExpense: Expense) => {
      if (updatedExpense) {
        this.loadExpenses();
        this.alertService.success('Gasto actualizado exitosamente');
      }
    });
  }

  async deleteExpense(expense: Expense) {
    const confirmed = await this.alertService.confirmDelete(
      'Eliminar Gasto',
      `¿Está seguro de eliminar el gasto "${expense.description}"?`
    );
    
    if (confirmed) {
      try {
        await this.expenseService.delete(expense.id);
        this.loadExpenses();
        this.alertService.success('Gasto eliminado exitosamente');
      } catch (error: any) {
        this.alertService.error(error.message || 'Error al eliminar el gasto');
      }
    }
  }
}
