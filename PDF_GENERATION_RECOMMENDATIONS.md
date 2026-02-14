# Generación de PDF e Impresión Térmica - Recomendaciones

## 📋 Análisis de Necesidades

Tu sistema necesita:
1. ✅ Generar PDF profesional de facturas
2. ✅ Imprimir en impresoras térmicas (POS)
3. ✅ Formato fiscal adecuado
4. ✅ Compatible con Angular 16+

---

## 🎯 Solución Recomendada: **jsPDF + jsPDF-AutoTable**

### ¿Por qué esta combinación?

✅ **Ventajas:**
- Ligera y rápida
- No requiere servidor
- Genera PDF en el navegador
- Excelente para facturas y tickets
- Compatible con impresoras térmicas
- Fácil de personalizar
- Gratis y open source
- Muy buena documentación

✅ **Ideal para:**
- Facturas formato A4
- Tickets térmicos (58mm, 80mm)
- Reportes
- Comprobantes

---

## 📦 Instalación

```bash
npm install jspdf jspdf-autotable
npm install --save-dev @types/jspdf
```

---

## 🔧 Implementación Básica

### 1. Service de Generación de PDF

**Archivo**: `/src/app/core/services/pdf-generator.service.ts`

```typescript
import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '../../domain/models/invoice.model';

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {

  // Generar factura formato A4 (profesional)
  generateInvoicePDF(invoice: Invoice): void {
    const doc = new jsPDF();
    
    // Header - Logo y datos del hotel
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('HOTEL LE QUINT', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Dirección del Hotel', 105, 28, { align: 'center' });
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
    doc.text(`Fecha: ${new Date(invoice.issuedAt).toLocaleDateString()}`, 20, 62);
    doc.text(`Estado: ${invoice.status === 'active' ? 'ACTIVA' : 'CANCELADA'}`, 20, 68);
    
    // Datos del cliente
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 20, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${invoice.clientName}`, 20, 87);
    doc.text(`NIT/RFC: ${invoice.clientTaxId}`, 20, 93);
    if (invoice.clientAddress) {
      doc.text(`Dirección: ${invoice.clientAddress}`, 20, 99);
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
      headStyles: { fillColor: [102, 126, 234] },
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
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Gracias por su preferencia', 105, 280, { align: 'center' });
    
    // Descargar
    doc.save(`Factura-${invoice.invoiceNumber}.pdf`);
  }
  
  // Generar ticket térmico (80mm)
  generateThermalReceipt(invoice: Invoice): void {
    // 80mm = 226 pixels aprox
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297] // 80mm ancho, largo variable
    });
    
    let y = 10;
    
    // Header centrado
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('HOTEL LE QUINT', 40, y, { align: 'center' });
    y += 6;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Dirección del Hotel', 40, y, { align: 'center' });
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
    doc.text(`Fecha: ${new Date(invoice.issuedAt).toLocaleString()}`, 5, y);
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
      // Descripción
      doc.text(item.description, 5, y);
      y += 4;
      
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
    
    // Descargar
    doc.save(`Ticket-${invoice.invoiceNumber}.pdf`);
  }
  
  // Imprimir directamente (abre diálogo de impresión)
  printInvoice(invoice: Invoice, thermal: boolean = false): void {
    if (thermal) {
      this.generateThermalReceipt(invoice);
    } else {
      this.generateInvoicePDF(invoice);
    }
    
    // Alternativa: abrir en nueva ventana para imprimir
    // const pdfBlob = doc.output('blob');
    // const url = URL.createObjectURL(pdfBlob);
    // window.open(url);
  }
}
```

---

## 🎨 Uso en Componente

**Archivo**: `/features/private/invoices/invoice-detail/invoice-detail.component.ts`

```typescript
import { PdfGeneratorService } from '../../../../core/services/pdf-generator.service';

export class InvoiceDetailComponent implements OnInit {
  // ...
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService,
    private pdfGenerator: PdfGeneratorService  // ← Inyectar
  ) {}
  
  // Generar PDF profesional
  downloadPDF() {
    if (this.invoice) {
      this.pdfGenerator.generateInvoicePDF(this.invoice);
    }
  }
  
  // Generar ticket térmico
  downloadThermalReceipt() {
    if (this.invoice) {
      this.pdfGenerator.generateThermalReceipt(this.invoice);
    }
  }
  
  // Imprimir (abre diálogo)
  print() {
    if (this.invoice) {
      this.pdfGenerator.printInvoice(this.invoice, false); // false = A4, true = térmica
    }
  }
}
```

**Template**:
```html
<button mat-raised-button color="primary" (click)="downloadPDF()">
  <mat-icon>picture_as_pdf</mat-icon>
  Descargar PDF
</button>

<button mat-raised-button (click)="downloadThermalReceipt()">
  <mat-icon>receipt</mat-icon>
  Ticket Térmico
</button>

<button mat-raised-button (click)="print()">
  <mat-icon>print</mat-icon>
  Imprimir
</button>
```

---

## 🎨 Personalización Avanzada

### Agregar Logo

```typescript
// Convertir logo a base64 primero
const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANS...';

doc.addImage(logoBase64, 'PNG', 15, 10, 30, 30);
```

### Colores Personalizados

```typescript
// Color del hotel
const primaryColor = [102, 126, 234]; // RGB

autoTable(doc, {
  headStyles: { 
    fillColor: primaryColor,
    textColor: [255, 255, 255]
  }
});
```

### Marca de Agua

```typescript
doc.setTextColor(200, 200, 200);
doc.setFontSize(60);
doc.text('PAGADO', 105, 150, { 
  align: 'center', 
  angle: 45 
});
```

---

## 🖨️ Alternativa: **Impresión Térmica Directa con ESC/POS**

Si necesitas imprimir **directamente** en impresora térmica sin generar PDF:

### Librería: **escpos-buffer**

```bash
npm install escpos-buffer
```

```typescript
import { EscPosBuffer } from 'escpos-buffer';

generateESCPOS(invoice: Invoice): Uint8Array {
  const buffer = new EscPosBuffer();
  
  buffer
    .setAlignment('center')
    .setBold(true)
    .writeLine('HOTEL LE QUINT')
    .setBold(false)
    .writeLine('Tel: +503 1234-5678')
    .writeLine('NIT: 0614-123456-001-0')
    .feed(1)
    .setAlignment('left')
    .writeLine('--------------------------------')
    .setBold(true)
    .writeLine(`FACTURA ${invoice.invoiceNumber}`)
    .setBold(false)
    .writeLine(`Fecha: ${new Date().toLocaleString()}`)
    .feed(1)
    .writeLine('CLIENTE:')
    .writeLine(invoice.clientName)
    .writeLine(`NIT: ${invoice.clientTaxId}`)
    .feed(1)
    .writeLine('--------------------------------')
    .writeLine('DETALLE')
    .writeLine('--------------------------------');
  
  invoice.items.forEach(item => {
    buffer
      .writeLine(item.description)
      .writeLine(`${item.quantity} x $${item.unitPrice.toFixed(2)} = $${item.subtotal.toFixed(2)}`);
  });
  
  buffer
    .writeLine('--------------------------------')
    .writeLine(`Subtotal:        $${invoice.subtotal.toFixed(2)}`)
    .writeLine(`IVA (13%):       $${invoice.tax.toFixed(2)}`)
    .setBold(true)
    .writeLine(`TOTAL:           $${invoice.total.toFixed(2)}`)
    .setBold(false)
    .feed(2)
    .setAlignment('center')
    .writeLine('Gracias por su preferencia')
    .feed(3)
    .cut();
  
  return buffer.flush();
}

// Enviar a impresora (requiere backend o USB)
printDirectly(data: Uint8Array) {
  // Opción 1: Enviar a backend que tiene acceso a impresora
  this.http.post('/api/print', { data: Array.from(data) }).subscribe();
  
  // Opción 2: Usar Web USB API (Chrome)
  // navigator.usb.requestDevice()...
}
```

---

## 📊 Comparación de Opciones

| Característica | jsPDF | ESC/POS | Otros (pdfmake, etc) |
|----------------|-------|---------|----------------------|
| Facilidad | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| PDF Profesional | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐⭐⭐⭐ |
| Impresión Térmica | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Sin Backend | ✅ | ❌ (necesita backend) | ✅ |
| Tamaño | Ligera | Muy ligera | Media |
| Personalización | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Documentación | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 Recomendación Final

### Para tu caso (Hotel PMS):

**Usa jsPDF + jsPDF-AutoTable** porque:

1. ✅ Genera PDF profesional para facturas A4
2. ✅ Genera tickets térmicos en PDF (80mm)
3. ✅ No requiere backend adicional
4. ✅ Fácil de implementar
5. ✅ Funciona en todos los navegadores
6. ✅ El PDF se puede imprimir en cualquier impresora (láser, térmica, etc)

### Implementación Sugerida:

```
Factura Normal → PDF A4 (jsPDF) → Imprimir en impresora láser
Ticket POS → PDF 80mm (jsPDF) → Imprimir en impresora térmica
```

La impresora térmica puede imprimir PDFs sin problema, solo necesitas:
- Configurar el tamaño de papel en el driver (80mm)
- El PDF ya está optimizado para ese ancho

---

## 📦 Instalación Rápida

```bash
npm install jspdf jspdf-autotable
npm install --save-dev @types/jspdf
```

Luego crea el servicio `PdfGeneratorService` con el código de arriba y listo! 🚀

---

## 🔗 Referencias

- [jsPDF Docs](https://github.com/parallax/jsPDF)
- [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [Ejemplos jsPDF](https://rawgit.com/MrRio/jsPDF/master/docs/index.html)

---

**¿Quieres que implemente el servicio completo con jsPDF ahora?**
