import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Transaction } from '../../../domain/models/transaction.model';
import { TransactionService } from '../../../core/services/transaction.service';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { TransactionCreateComponent } from './transaction-create/transaction-create.component';

@Component({
  selector: 'fury-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  loading = false;
  currentUserId: string = '';
  openCashRegisterId: string | null = null;
  
  filterType: string = 'all';
  searchText: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private transactionService: TransactionService,
    private cashRegisterService: CashRegisterService,
    private authService: AuthService,
    private alertService: AlertService,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    const firebaseUser = await this.authService.getCurrentUser();
    if (firebaseUser) {
      this.currentUserId = firebaseUser.uid;
      
      const openCash = await this.cashRegisterService.getOpenCashRegister(this.currentUserId);
      this.openCashRegisterId = openCash?.id || null;
      
      this.loadTransactions();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTransactions() {
    this.loading = true;
    this.transactionService.getAllTransactions()
      .pipe(takeUntil(this.destroy$))
      .subscribe(transactions => {
        this.transactions = transactions;
        this.applyFilter();
        this.loading = false;
      });
  }

  applyFilter() {
    let filtered = this.transactions;

    // Filtrar por tipo
    if (this.filterType !== 'all') {
      filtered = filtered.filter(t => t.type === this.filterType);
    }

    // Filtrar por texto de búsqueda
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(search) ||
        t.createdByName.toLowerCase().includes(search) ||
        (t.category && t.category.toLowerCase().includes(search)) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(search))
      );
    }

    this.filteredTransactions = filtered;
  }

  onSearchChange() {
    this.applyFilter();
  }

  onFilterChange() {
    this.applyFilter();
  }

  createTransaction() {
    if (!this.openCashRegisterId) {
      this.alertService.error('Debes tener una caja abierta para registrar movimientos');
      return;
    }

    const dialogRef = this.dialog.open(TransactionCreateComponent, {
      width: '600px',
      data: {
        cashRegisterId: this.openCashRegisterId,
        userId: this.currentUserId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.alertService.success('Movimiento registrado exitosamente');
      }
    });
  }

  async deleteTransaction(transaction: Transaction) {
    // Verificar si la caja está cerrada
    const cashRegister = await firstValueFrom(this.cashRegisterService.getById(transaction.cashRegisterId));
    
    if (cashRegister && cashRegister.status === 'closed') {
      this.alertService.error('No se puede eliminar un movimiento de una caja cerrada');
      return;
    }

    const Swal = (await import('sweetalert2')).default;
    const result = await Swal.fire({
      title: '¿Eliminar movimiento?',
      text: `Se eliminará el movimiento de ${transaction.amount}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f44336',
      cancelButtonColor: '#9e9e9e',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await this.transactionService.deleteTransaction(transaction.id);
        this.alertService.success('Movimiento eliminado');
      } catch (error: any) {
        this.alertService.error(error.message || 'Error al eliminar');
      }
    }
  }

  getTransactionIcon(type: string): string {
    const icons: Record<string, string> = {
      sale: 'shopping_cart',
      payment: 'payment',
      expense: 'money_off',
      withdrawal: 'remove_circle',
      deposit: 'add_circle',
      refund: 'undo'
    };
    return icons[type] || 'attach_money';
  }

  getTransactionColor(type: string): string {
    const colors: Record<string, string> = {
      sale: 'positive',
      payment: 'positive',
      deposit: 'positive',
      expense: 'negative',
      withdrawal: 'negative',
      refund: 'negative'
    };
    return colors[type] || '';
  }

  getTransactionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      sale: 'Venta',
      payment: 'Pago',
      expense: 'Gasto',
      withdrawal: 'Retiro',
      deposit: 'Depósito',
      refund: 'Devolución'
    };
    return labels[type] || type;
  }
}
