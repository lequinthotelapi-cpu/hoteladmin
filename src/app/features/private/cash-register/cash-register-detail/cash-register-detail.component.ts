import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CashRegister } from '../../../../domain/models/cash-register.model';
import { Transaction } from '../../../../domain/models/transaction.model';
import { CashRegisterService } from '../../../../core/services/cash-register.service';

interface DialogData {
  cashRegister: CashRegister;
}

interface PaymentMethodSummary {
  paymentMethod: string;
  income: number;
  expense: number;
  balance: number;
}

@Component({
  selector: 'fury-cash-register-detail',
  templateUrl: './cash-register-detail.component.html',
  styleUrls: ['./cash-register-detail.component.scss']
})
export class CashRegisterDetailComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  paymentMethodSummary: PaymentMethodSummary[] = [];
  loading = true;
  
  private destroy$ = new Subject<void>();

  constructor(
    private cashRegisterService: CashRegisterService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit() {
    this.loadTransactions();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTransactions() {
    this.cashRegisterService.getTransactions(this.data.cashRegister.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(transactions => {
        this.transactions = transactions;
        this.calculatePaymentMethodSummary();
        this.loading = false;
      });
  }

  calculatePaymentMethodSummary() {
    const summaryMap = new Map<string, PaymentMethodSummary>();

    this.transactions.forEach(t => {
      const method = t.paymentMethod || 'Sin especificar';
      
      if (!summaryMap.has(method)) {
        summaryMap.set(method, {
          paymentMethod: method,
          income: 0,
          expense: 0,
          balance: 0
        });
      }

      const summary = summaryMap.get(method)!;
      
      // Ingresos: sales, payments, deposits
      if (['sale', 'payment', 'deposit'].includes(t.type)) {
        summary.income += t.amount;
      }
      // Egresos: expenses, withdrawals
      else if (['expense', 'withdrawal'].includes(t.type)) {
        summary.expense += t.amount;
      }
      
      summary.balance = summary.income - summary.expense;
    });

    this.paymentMethodSummary = Array.from(summaryMap.values())
      .sort((a, b) => b.balance - a.balance);
  }

  async deleteTransaction(transaction: Transaction) {
    // Verificar si la caja está cerrada
    if (this.data.cashRegister.status === 'closed') {
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        icon: 'error',
        title: 'Caja cerrada',
        text: 'No se puede eliminar un movimiento de una caja cerrada',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#f44336'
      });
      return;
    }

    const Swal = (await import('sweetalert2')).default;
    const result = await Swal.fire({
      title: '¿Eliminar transacción?',
      text: `Se eliminará la transacción de ${transaction.amount} (${transaction.description})`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f44336',
      cancelButtonColor: '#9e9e9e',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await this.cashRegisterService.deleteTransaction(transaction.id);
        Swal.fire('Eliminada', 'La transacción ha sido eliminada', 'success');
      } catch (error: any) {
        Swal.fire('Error', error.message || 'No se pudo eliminar la transacción', 'error');
      }
    }
  }

  getTransactionIcon(type: string): string {
    const icons: Record<string, string> = {
      sale: 'shopping_cart',
      payment: 'payment',
      expense: 'money_off',
      withdrawal: 'remove_circle',
      deposit: 'add_circle'
    };
    return icons[type] || 'attach_money';
  }

  getTransactionColor(type: string): string {
    const colors: Record<string, string> = {
      sale: 'positive',
      payment: 'positive',
      deposit: 'positive',
      expense: 'negative',
      withdrawal: 'negative'
    };
    return colors[type] || '';
  }
}
