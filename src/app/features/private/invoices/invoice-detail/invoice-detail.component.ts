import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InvoiceService } from '../../../../core/services/invoice.service';
import { PdfGeneratorService } from '../../../../core/services/pdf-generator.service';
import { Invoice } from '../../../../domain/models/invoice.model';

@Component({
  selector: 'fury-invoice-detail',
  templateUrl: './invoice-detail.component.html',
  styleUrls: ['./invoice-detail.component.scss']
})
export class InvoiceDetailComponent implements OnInit {
  invoice: Invoice | null = null;
  loading = true;
  itemsColumns = ['description', 'quantity', 'unitPrice', 'subtotal'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService,
    private pdfGenerator: PdfGeneratorService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
    }
  }

  loadInvoice(id: string) {
    this.invoiceService.getById(id).subscribe({
      next: (invoice) => {
        this.invoice = invoice;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/invoices']);
      }
    });
  }

  goBack() {
    this.router.navigate(['/invoices']);
  }

  downloadPDF() {
    if (this.invoice) {
      this.pdfGenerator.generateInvoicePDF(this.invoice, false);
    }
  }

  downloadThermalReceipt() {
    if (this.invoice) {
      this.pdfGenerator.generateThermalReceipt(this.invoice, false);
    }
  }

  printPDF() {
    if (this.invoice) {
      this.pdfGenerator.generateInvoicePDF(this.invoice, true);
    }
  }

  printThermalReceipt() {
    if (this.invoice) {
      this.pdfGenerator.generateThermalReceipt(this.invoice, true);
    }
  }
}
