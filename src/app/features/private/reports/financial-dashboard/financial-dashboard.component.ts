import { Component, OnInit } from '@angular/core';
import { DashboardMetrics, RevenueBySource, RevenueByDay } from '../../../../domain/models/financial-report.model';
import { FinancialReportsService } from '../../../../core/services/financial-reports.service';

@Component({
  selector: 'app-financial-dashboard',
  templateUrl: './financial-dashboard.component.html',
  styleUrls: ['./financial-dashboard.component.scss']
})
export class FinancialDashboardComponent implements OnInit {
  metrics: DashboardMetrics | null = null;
  revenueBySource: RevenueBySource[] = [];
  revenueByDay: RevenueByDay[] = [];
  loading = true;

  startDate: Date;
  endDate: Date;

  // Configuración de gráficos
  colorScheme = {
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA']
  };

  constructor(private financialReportsService: FinancialReportsService) {
    const now = new Date();
    this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.endDate = now;
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      const [metrics, bySource, byDay] = await Promise.all([
        this.financialReportsService.getDashboardMetrics(this.startDate, this.endDate),
        this.financialReportsService.getRevenueBySource(this.startDate, this.endDate),
        this.financialReportsService.getRevenueByDay(this.startDate, this.endDate)
      ]);

      this.metrics = metrics;
      this.revenueBySource = bySource;
      this.revenueByDay = byDay;
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      this.loading = false;
    }
  }

  async onDateRangeChange() {
    await this.loadData();
  }

  setQuickRange(range: 'today' | 'week' | 'month' | 'year') {
    const now = new Date();
    this.endDate = now;

    switch (range) {
      case 'today':
        this.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        this.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        this.startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    this.onDateRangeChange();
  }

  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'check': 'Cheque',
      'other': 'Otro'
    };
    return labels[method] || method;
  }
}
