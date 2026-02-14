import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Invoice } from '../../../domain/models/invoice.model';
import { InvoiceService } from '../../../core/services/invoice.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'fury-invoices',
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss']
})
export class InvoicesComponent implements OnInit, OnDestroy {
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  displayedColumns = ['invoiceNumber', 'clientName', 'clientTaxId', 'type', 'total', 'issuedAt', 'status', 'actions'];
  
  searchText = '';
  selectedStatus: 'all' | 'active' | 'cancelled' = 'all';
  
  private destroy$ = new Subject<void>();

  constructor(
    private invoiceService: InvoiceService,
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadInvoices();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInvoices() {
    this.invoiceService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe(invoices => {
        this.invoices = invoices;
        this.applyFilters();
      });
  }

  applyFilters() {
    let filtered = [...this.invoices];

    // Filtrar por estado
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(inv => inv.status === this.selectedStatus);
    }

    // Filtrar por búsqueda
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(search) ||
        inv.clientName.toLowerCase().includes(search) ||
        inv.clientTaxId.toLowerCase().includes(search)
      );
    }

    this.filteredInvoices = filtered;
  }

  viewInvoice(invoice: Invoice) {
    this.router.navigate(['/invoices', invoice.id]);
  }

  async cancelInvoice(invoice: Invoice) {
    const confirmed = await this.alertService.confirm(
      '¿Estás seguro de cancelar esta factura?',
      'Esta acción no se puede deshacer'
    );

    if (!confirmed) return;

    const reason = prompt('Motivo de cancelación:');
    if (!reason) return;

    try {
      await this.invoiceService.cancelInvoice(invoice.id!, reason, 'currentUserId'); // TODO: Get real userId
      this.alertService.success('Factura cancelada exitosamente');
    } catch (error: any) {
      this.alertService.error(error.message || 'Error al cancelar factura');
    }
  }

  getTypeLabel(type: string): string {
    return type === 'guest_account' ? 'Cuenta Huésped' : 'POS';
  }

  getStatusColor(status: string): string {
    return status === 'active' ? 'primary' : 'warn';
  }
}
