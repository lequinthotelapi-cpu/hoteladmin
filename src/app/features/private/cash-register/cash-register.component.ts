import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CashRegister } from '../../../domain/models/cash-register.model';
import { CashRegisterService } from '../../../core/services/cash-register.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { CashRegisterOpenComponent } from './cash-register-open/cash-register-open.component';
import { CashRegisterCloseComponent } from './cash-register-close/cash-register-close.component';
import { CashRegisterDetailComponent } from './cash-register-detail/cash-register-detail.component';
import { CashTransactionCreateComponent } from './cash-transaction-create/cash-transaction-create.component';

@Component({
  selector: 'fury-cash-register',
  templateUrl: './cash-register.component.html',
  styleUrls: ['./cash-register.component.scss']
})
export class CashRegisterComponent implements OnInit, OnDestroy {
  openCashRegister: CashRegister | null = null;
  cashRegisters: CashRegister[] = [];
  loading = false;
  currentUserId: string = '';
  currentUserName: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private cashRegisterService: CashRegisterService,
    private authService: AuthService,
    private alertService: AlertService,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    this.loading = true;
    const firebaseUser = await this.authService.getCurrentUser();
    if (firebaseUser) {
      this.currentUserId = firebaseUser.uid;
      const user = await this.authService.getUserData(firebaseUser.uid);
      if (user) {
        this.currentUserName = `${user.firstName} ${user.lastName}`;
      }
      
      // Cargar caja inicial
      const initialCash = await this.cashRegisterService.getOpenCashRegister(this.currentUserId);
      if (initialCash) {
        // Calcular totales iniciales
        const totals = await this.cashRegisterService.calculateTotalsFromTransactions(initialCash.id);
        this.openCashRegister = {
          ...initialCash,
          ...totals,
          expectedAmount: initialCash.initialAmount + 
            totals.salesTotal! + totals.paymentsTotal! + totals.depositsTotal! -
            totals.expensesTotal! - totals.withdrawalsTotal!
        };
        
        // Suscribirse a transacciones en tiempo real para recalcular totales
        this.cashRegisterService.getTransactions(initialCash.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe(async transactions => {
            const totals = await this.cashRegisterService.calculateTotalsFromTransactions(initialCash.id);
            this.openCashRegister = {
              ...initialCash,
              ...totals,
              expectedAmount: initialCash.initialAmount + 
                totals.salesTotal! + totals.paymentsTotal! + totals.depositsTotal! -
                totals.expensesTotal! - totals.withdrawalsTotal!
            };
          });
      }
      
      this.loadCashRegisters();
    }
    this.loading = false;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadOpenCashRegister() {
    this.loading = true;
    try {
      const initialCash = await this.cashRegisterService.getOpenCashRegister(this.currentUserId);
      if (initialCash) {
        const totals = await this.cashRegisterService.calculateTotalsFromTransactions(initialCash.id);
        this.openCashRegister = {
          ...initialCash,
          ...totals,
          expectedAmount: initialCash.initialAmount + 
            totals.salesTotal! + totals.paymentsTotal! + totals.depositsTotal! -
            totals.expensesTotal! - totals.withdrawalsTotal!
        };
      } else {
        this.openCashRegister = null;
      }
    } catch (error: any) {
      console.error('Error al cargar caja:', error);
      this.alertService.error(error.message);
    } finally {
      this.loading = false;
    }
  }

  loadCashRegisters() {
    this.cashRegisterService.getUserCashRegisters(this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(registers => {
        this.cashRegisters = registers;
      });
  }

  openCashRegisterDialog() {
    const dialogRef = this.dialog.open(CashRegisterOpenComponent, {
      width: '500px',
      data: {
        userId: this.currentUserId,
        userName: this.currentUserName
      }
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        await this.loadOpenCashRegister();
        this.alertService.success('Caja abierta exitosamente');
      }
    });
  }

  closeCashRegisterDialog() {
    if (!this.openCashRegister) return;

    const dialogRef = this.dialog.open(CashRegisterCloseComponent, {
      width: '600px',
      data: {
        cashRegister: this.openCashRegister,
        userId: this.currentUserId,
        userName: this.currentUserName
      }
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        await this.loadOpenCashRegister();
        this.alertService.success('Caja cerrada exitosamente');
      }
    });
  }

  viewDetails(cashRegister: CashRegister) {
    this.dialog.open(CashRegisterDetailComponent, {
      width: '800px',
      data: { cashRegister }
    });
  }

  registerDeposit() {
    if (!this.openCashRegister) return;

    const dialogRef = this.dialog.open(CashTransactionCreateComponent, {
      width: '500px',
      data: {
        type: 'deposit',
        cashRegisterId: this.openCashRegister.id,
        userId: this.currentUserId,
        userName: this.currentUserName
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.alertService.success('Depósito registrado exitosamente');
        // No es necesario recargar, el Observable lo hace automáticamente
      }
    });
  }

  registerWithdrawal() {
    if (!this.openCashRegister) return;

    const dialogRef = this.dialog.open(CashTransactionCreateComponent, {
      width: '500px',
      data: {
        type: 'withdrawal',
        cashRegisterId: this.openCashRegister.id,
        userId: this.currentUserId,
        userName: this.currentUserName
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.alertService.success('Retiro registrado exitosamente');
        // No es necesario recargar, el Observable lo hace automáticamente
      }
    });
  }
}
