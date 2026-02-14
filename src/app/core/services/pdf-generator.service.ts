import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '../../domain/models/invoice.model';

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {

  // Generar factura formato A4 (profesional)
  generateInvoicePDF(invoice: Invoice, print: boolean = false): void {
    const doc = new jsPDF();
    
    // Header - Logo y datos del hotel
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('HOTEL LE QUINT', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('San Salvador, El Salvador', 105, 28, { align: 'center' });
    doc.text('Tel: +503 1234-5678', 105, 33, { align: 'center' });
    doc.text('NIT: 0614-123456-001-0', 105, 38, { align: 'center' });
    
    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);
    
    // Información de factura
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`FACTURA ${invoice.invoiceNumber}`, 20, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date(invoice.issuedAt).toLocaleDateString('es-ES', { 
      year: 'numeric', month: 'long', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    })}`, 20, 62);
    
    const statusText = invoice.status === 'active' ? 'ACTIVA' : 'CANCELADA';
    const statusColor = invoice.status === 'active' ? [76, 175, 80] : [244, 67, 54];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`Estado: ${statusText}`, 20, 68);
    doc.setTextColor(0, 0, 0);
    
    // Datos del cliente
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 20, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${invoice.clientName}`, 20, 87);
    doc.text(`NIT/RFC: ${invoice.clientTaxId}`, 20, 93);
    
    let clientY = 99;
    if (invoice.clientAddress) {
      doc.text(`Dirección: ${invoice.clientAddress}`, 20, clientY);
      clientY += 6;
    }
    if (invoice.clientEmail) {
      doc.text(`Email: ${invoice.clientEmail}`, 20, clientY);
      clientY += 6;
    }
    if (invoice.clientPhone) {
      doc.text(`Teléfono: ${invoice.clientPhone}`, 20, clientY);
    }
    
    // Tabla de items
    const tableData = invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${item.unitPrice.toFixed(2)}`,
      `$${item.subtotal.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: 110,
      head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [102, 126, 234],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      }
    });
    
    // Totales
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 130, finalY);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, 190, finalY, { align: 'right' });
    
    doc.text('IVA (13%):', 130, finalY + 6);
    doc.text(`$${invoice.tax.toFixed(2)}`, 190, finalY + 6, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', 130, finalY + 15);
    doc.text(`$${invoice.total.toFixed(2)}`, 190, finalY + 15, { align: 'right' });
    
    // Notas si existen
    if (invoice.notes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Notas:', 20, finalY + 30);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.notes, 20, finalY + 36, { maxWidth: 170 });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text('Gracias por su preferencia', 105, 280, { align: 'center' });
    doc.text(`Emitido por: ${invoice.issuedByName}`, 105, 285, { align: 'center' });
    
    // Imprimir o descargar
    if (print) {
      this.printPDF(doc, `Factura-${invoice.invoiceNumber}`);
    } else {
      doc.save(`Factura-${invoice.invoiceNumber}.pdf`);
    }
  }
  
  // Generar ticket térmico (80mm)
  generateThermalReceipt(invoice: Invoice, print: boolean = false): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297]
    });
    
    let y = 10;
    
    // Header centrado
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('HOTEL LE QUINT', 40, y, { align: 'center' });
    y += 6;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('San Salvador, El Salvador', 40, y, { align: 'center' });
    y += 4;
    doc.text('Tel: +503 1234-5678', 40, y, { align: 'center' });
    y += 4;
    doc.text('NIT: 0614-123456-001-0', 40, y, { align: 'center' });
    y += 8;
    
    // Línea
    doc.setLineWidth(0.3);
    doc.line(5, y, 75, y);
    y += 5;
    
    // Factura
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`FACTURA ${invoice.invoiceNumber}`, 40, y, { align: 'center' });
    y += 5;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date(invoice.issuedAt).toLocaleString('es-ES');
    doc.text(`Fecha: ${dateStr}`, 5, y);
    y += 8;
    
    // Cliente
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 5, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.clientName, 5, y);
    y += 4;
    doc.text(`NIT: ${invoice.clientTaxId}`, 5, y);
    y += 8;
    
    // Línea
    doc.line(5, y, 75, y);
    y += 5;
    
    // Items
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE', 5, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    invoice.items.forEach(item => {
      // Descripción (puede ocupar múltiples líneas)
      const lines = doc.splitTextToSize(item.description, 70);
      lines.forEach((line: string) => {
        doc.text(line, 5, y);
        y += 4;
      });
      
      // Cantidad x Precio = Subtotal
      const line = `${item.quantity} x $${item.unitPrice.toFixed(2)} = $${item.subtotal.toFixed(2)}`;
      doc.text(line, 10, y);
      y += 6;
    });
    
    // Línea
    doc.line(5, y, 75, y);
    y += 5;
    
    // Totales
    doc.text('Subtotal:', 5, y);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
    y += 5;
    
    doc.text('IVA (13%):', 5, y);
    doc.text(`$${invoice.tax.toFixed(2)}`, 75, y, { align: 'right' });
    y += 5;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL:', 5, y);
    doc.text(`$${invoice.total.toFixed(2)}`, 75, y, { align: 'right' });
    y += 10;
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Gracias por su preferencia', 40, y, { align: 'center' });
    y += 4;
    doc.setFontSize(7);
    doc.text(`Atendido por: ${invoice.issuedByName}`, 40, y, { align: 'center' });
    
    // Imprimir o descargar
    if (print) {
      this.printPDF(doc, `Ticket-${invoice.invoiceNumber}`);
    } else {
      doc.save(`Ticket-${invoice.invoiceNumber}.pdf`);
    }
  }

  // Método auxiliar para imprimir PDF
  private printPDF(doc: jsPDF, filename: string): void {
    // Crear blob del PDF
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Abrir en nueva ventana
    const printWindow = window.open(pdfUrl, '_blank');
    
    if (printWindow) {
      // Esperar a que cargue y activar impresión
      printWindow.onload = () => {
        printWindow.print();
        // Limpiar URL después de imprimir
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 100);
      };
    }
  }
}
