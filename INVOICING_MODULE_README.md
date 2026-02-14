# Módulo de Facturación - Documentación Completa

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Características](#características)
3. [Arquitectura](#arquitectura)
4. [Instalación y Configuración](#instalación-y-configuración)
5. [Uso](#uso)
6. [Generación de PDF](#generación-de-pdf)
7. [Integración con Guest Accounts](#integración-con-guest-accounts)
8. [Firestore](#firestore)
9. [Troubleshooting](#troubleshooting)
10. [Próximas Mejoras](#próximas-mejoras)

---

## Resumen Ejecutivo

Sistema completo de facturación formal para Hotel PMS que permite generar facturas desde Guest Accounts cerradas con numeración consecutiva automática, captura de datos fiscales y generación de PDF profesional con impresión directa.

**Versión**: 2.1.3  
**Estado**: ✅ Producción  
**Fecha**: 2024-02-13

### Funcionalidades Principales:
- ✅ Generación de facturas desde Guest Accounts
- ✅ Numeración consecutiva automática (FAC-YYYYMM-XXXX)
- ✅ Captura de datos fiscales del cliente
- ✅ Listado y búsqueda de facturas
- ✅ Cancelación de facturas con motivo
- ✅ Generación de PDF A4 profesional
- ✅ Generación de ticket térmico 80mm
- ✅ Impresión directa sin descargar
- ✅ Descarga de PDF opcional

---

## Características

### 1. Numeración Consecutiva Automática

**Formato**: `FAC-YYYYMM-XXXX`

**Ejemplos**:
- `FAC-202402-0001` - Primera factura de febrero 2024
- `FAC-202402-0125` - Factura 125 de febrero 2024
- `FAC-202403-0001` - Primera factura de marzo 2024

**Lógica**:
- Secuencia mensual (reinicia cada mes)
- Padding de 4 dígitos
- Generación automática al crear factura

### 2. Datos Fiscales

**Campos Requeridos**:
- Nombre del cliente
- NIT/RFC/Identificación fiscal

**Campos Opcionales**:
- Dirección
- Email (con validación)
- Teléfono

### 3. Estados de Factura

| Estado | Descripción | Color |
|--------|-------------|-------|
| `active` | Factura válida | Verde |
| `cancelled` | Factura cancelada | Rojo |

### 4. Tipos de Factura

| Tipo | Descripción | Origen |
|------|-------------|--------|
| `guest_account` | Factura de cuenta de huésped | Guest Account cerrada |
| `pos` | Factura de venta directa | POS (futuro) |

### 5. Validaciones

**Al Crear Factura**:
- ✅ Cuenta debe estar cerrada
- ✅ Balance debe ser cero
- ✅ No debe existir factura previa para la misma cuenta
- ✅ Datos fiscales completos

**Al Cancelar Factura**:
- ✅ Factura debe estar activa
- ✅ Motivo de cancelación requerido

---

## Arquitectura

### Estructura de Carpetas

```
src/app/
├── domain/
│   ├── models/
│   │   └── invoice.model.ts          # Modelo de Invoice
│   └── repositories/
│       └── invoice.repository.ts      # Interfaz de repositorio
├── infrastructure/
│   └── repositories/
│       └── invoice-firebase.repository.ts  # Implementación Firebase
├── core/
│   └── services/
│       ├── invoice.service.ts         # Lógica de negocio
│       └── pdf-generator.service.ts   # Generación de PDF
└── features/
    └── private/
        └── invoices/
            ├── invoices.component.*           # Lista de facturas
            ├── invoice-detail/                # Detalle de factura
            │   ├── invoice-detail.component.*
            ├── create-invoice-dialog/         # Diálogo crear factura
            │   └── create-invoice-dialog.component.*
            ├── invoices.module.ts
            └── invoices-routing.module.ts
```

### Modelos de Dominio

#### Invoice
```typescript
interface Invoice {
  id?: string;
  invoiceNumber: string;        // FAC-202402-0001
  type: 'guest_account' | 'pos';
  referenceId: string;           // ID de Guest Account
  
  // Datos fiscales
  clientName: string;
  clientTaxId: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  
  // Detalle financiero
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  
  // Metadata
  status: 'active' | 'cancelled';
  issuedAt: Date;
  issuedBy: string;
  issuedByName: string;
  
  // Cancelación
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelReason?: string;
  
  notes?: string;
}
```

#### InvoiceItem
```typescript
interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
```

### Servicios

#### InvoiceService
**Ubicación**: `/core/services/invoice.service.ts`

**Métodos principales**:
```typescript
// Consultas
getAll(): Observable<Invoice[]>
getById(id: string): Observable<Invoice | null>
getByInvoiceNumber(invoiceNumber: string): Observable<Invoice | null>
getByReference(referenceId: string): Observable<Invoice | null>
getActiveInvoices(): Observable<Invoice[]>

// Operaciones
createInvoice(dto: CreateInvoiceDto, userId: string, userName: string): Promise<string>
createInvoiceFromGuestAccount(accountId: string, clientData, userId: string, userName: string): Promise<string>
cancelInvoice(id: string, reason: string, userId: string): Promise<void>

// Privado
generateInvoiceNumber(): Promise<string>
```

#### PdfGeneratorService
**Ubicación**: `/core/services/pdf-generator.service.ts`

**Métodos principales**:
```typescript
// Generar PDF A4 profesional
generateInvoicePDF(invoice: Invoice, print: boolean = false): void

// Generar ticket térmico 80mm
generateThermalReceipt(invoice: Invoice, print: boolean = false): void

// Privado
printPDF(doc: jsPDF, filename: string): void
```

---

## Instalación y Configuración

### 1. Dependencias

```bash
npm install jspdf jspdf-autotable
```

### 2. Firestore Rules

Agregar en `/firestore.rules`:

```javascript
match /invoices/{invoiceId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAuthenticated();
  allow delete: if isAdmin();
}
```

Desplegar:
```bash
firebase deploy --only firestore:rules
```

### 3. Índices de Firestore

Crear índices compuestos:

```json
{
  "indexes": [
    {
      "collectionGroup": "invoices",
      "fields": [
        {"fieldPath": "issuedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "invoices",
      "fields": [
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "issuedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "invoices",
      "fields": [
        {"fieldPath": "referenceId", "order": "ASCENDING"}
      ]
    }
  ]
}
```

### 4. Routing

Ya configurado en `/app-routing.module.ts`:

```typescript
{
  path: 'invoices',
  loadChildren: () => import('./features/private/invoices/invoices.module')
    .then(m => m.InvoicesModule),
}
```

### 5. Menú

Ya configurado en `/app.component.ts`:

```typescript
{
  name: 'Facturas',
  routeOrFunction: '/invoices',
  icon: 'receipt',
  position: 21.5,
}
```

---

## Uso

### Flujo Completo: Check-out → Factura

#### 1. Check-out de Habitación
```
Reservas → Check-out → Guest Account queda abierta
```

#### 2. Cerrar Cuenta
```
Cuentas → Ver Cuenta → Registrar Pagos → Cerrar Cuenta
```
**Requisito**: Balance = 0

#### 3. Generar Factura
```
Cuentas → Ver Cuenta → Botón "Generar Factura"
```
**Aparece**: Solo si cuenta cerrada y sin factura

#### 4. Completar Datos Fiscales
```
Diálogo:
- Nombre: [Pre-llenado con nombre del huésped]
- NIT/RFC: [Requerido]
- Dirección: [Opcional]
- Email: [Opcional]
- Teléfono: [Opcional]
```

#### 5. Factura Generada
```
Sistema:
- Genera número: FAC-202402-0001
- Convierte cargos a items
- Crea factura en Firestore
- Navega a detalle
```

#### 6. Imprimir o Descargar
```
Detalle de Factura:
- "Imprimir A4" → Impresión directa
- "Imprimir 80mm" → Ticket térmico
- "Descargar" → PDF A4 o Ticket 80mm
```

### Listado de Facturas

**Ruta**: `/invoices`

**Funcionalidades**:
- Tabla con todas las facturas
- Filtros: Todas, Activas, Canceladas
- Búsqueda: Por número, cliente, NIT
- Acciones: Ver Detalle, Cancelar

**Columnas**:
- Número de factura
- Cliente
- NIT/RFC
- Tipo (Guest Account / POS)
- Total
- Fecha de emisión
- Estado
- Acciones

### Detalle de Factura

**Ruta**: `/invoices/:id`

**Secciones**:
1. **Header**: Número, fecha, estado
2. **Datos del Cliente**: Nombre, NIT, dirección, email, teléfono
3. **Detalle**: Tabla de items
4. **Totales**: Subtotal, IVA (13%), Total
5. **Información de Cancelación**: Si está cancelada
6. **Notas**: Si existen

**Acciones**:
- Imprimir A4
- Imprimir 80mm
- Descargar (menú con opciones)
- Volver

---

## Generación de PDF

### PDF A4 (Profesional)

**Características**:
- Tamaño: A4 (210mm x 297mm)
- Orientación: Portrait
- Fuente: Helvetica
- Colores: Azul (#667eea) para headers

**Secciones**:
1. Header del hotel (centrado)
2. Número y fecha de factura
3. Estado (color verde/rojo)
4. Datos del cliente
5. Tabla de items (con autoTable)
6. Totales (subtotal, IVA, total)
7. Notas (si existen)
8. Footer con emisor

**Uso**:
```typescript
// Imprimir directamente
pdfGenerator.generateInvoicePDF(invoice, true);

// Descargar
pdfGenerator.generateInvoicePDF(invoice, false);
```

### Ticket Térmico 80mm

**Características**:
- Tamaño: 80mm x 297mm
- Orientación: Portrait
- Fuente: Helvetica (tamaños pequeños)
- Diseño: Compacto

**Secciones**:
1. Header del hotel (centrado)
2. Número y fecha
3. Cliente (nombre y NIT)
4. Detalle de items
5. Totales
6. Footer con agradecimiento

**Uso**:
```typescript
// Imprimir directamente
pdfGenerator.generateThermalReceipt(invoice, true);

// Descargar
pdfGenerator.generateThermalReceipt(invoice, false);
```

### Impresión Directa

**Flujo**:
1. Usuario hace clic en "Imprimir A4" o "Imprimir 80mm"
2. Sistema genera PDF en memoria
3. Crea URL temporal del PDF
4. Abre PDF en nueva ventana
5. Activa automáticamente `window.print()`
6. Aparece diálogo de impresión del navegador
7. Usuario selecciona impresora y confirma
8. Sistema limpia URL temporal

**Ventajas**:
- ⚡ 1 clic vs 4 pasos
- 🧹 Sin archivos descargados
- 🎯 Intuitivo
- 💾 Opción de descargar disponible

---

## Integración con Guest Accounts

### Modificaciones en AccountDetailComponent

**Botón "Generar Factura"**:
- Visible solo si: `account.status === 'closed' && !hasInvoice`
- Color: Morado (#667eea)
- Icono: receipt

**Botón "Facturada"**:
- Visible solo si: `hasInvoice === true`
- Estado: Deshabilitado
- Icono: check_circle

**Código**:
```typescript
// Verificar si existe factura
checkInvoice(accountId: string): void {
  this.invoiceService.getByReference(accountId).subscribe(invoice => {
    this.hasInvoice = !!invoice;
  });
}

// Generar factura
generateInvoice(): void {
  const dialogRef = this.dialog.open(CreateInvoiceDialogComponent, {
    width: '500px',
    data: { account: this.account }
  });

  dialogRef.afterClosed().subscribe(invoiceId => {
    if (invoiceId) {
      this.hasInvoice = true;
      this.router.navigate(['/invoices', invoiceId]);
    }
  });
}
```

---

## Firestore

### Colección: `invoices`

**Estructura de Documento**:
```json
{
  "invoiceNumber": "FAC-202402-0001",
  "type": "guest_account",
  "referenceId": "guestAccountId123",
  "clientName": "Juan Pérez",
  "clientTaxId": "123456789-0",
  "clientAddress": "Calle 123, Ciudad",
  "clientEmail": "juan@example.com",
  "clientPhone": "+50312345678",
  "items": [
    {
      "description": "Alojamiento - 3 noche(s)",
      "quantity": 3,
      "unitPrice": 100,
      "subtotal": 300
    },
    {
      "description": "POS: Hamburguesa x1",
      "quantity": 1,
      "unitPrice": 8.5,
      "subtotal": 8.5
    }
  ],
  "subtotal": 308.5,
  "tax": 40.11,
  "total": 348.61,
  "status": "active",
  "issuedAt": Timestamp,
  "issuedBy": "userId123",
  "issuedByName": "María López"
}
```

### Queries Comunes

```typescript
// Todas las facturas
invoiceService.getAll()

// Facturas activas
invoiceService.getActiveInvoices()

// Por número
invoiceService.getByInvoiceNumber('FAC-202402-0001')

// Por referencia (Guest Account)
invoiceService.getByReference('guestAccountId')

// Por rango de fechas
invoiceService.getByDateRange(startDate, endDate)
```

---

## Troubleshooting

### Error: "Missing or insufficient permissions"

**Causa**: Reglas de Firestore no incluyen colección `invoices`

**Solución**:
```bash
firebase deploy --only firestore:rules
```

### Error: "Ya existe una factura para esta referencia"

**Causa**: Intentando facturar cuenta ya facturada

**Solución**: Verificar que no exista factura previa

### Error: "Solo se pueden facturar cuentas cerradas"

**Causa**: Cuenta aún está abierta

**Solución**: Cerrar cuenta primero (balance debe ser 0)

### PDF no se imprime en impresora térmica

**Causa**: Configuración de papel incorrecta

**Solución**:
1. Abrir configuración de impresora
2. Establecer tamaño de papel: 80mm
3. Ajustar márgenes a 0
4. Desactivar encabezados/pies de página

### Navegador bloquea ventana emergente

**Causa**: Bloqueador de pop-ups activo

**Solución**: Permitir pop-ups para el sitio

---

## Próximas Mejoras

### Fase 2: Mejoras de PDF
- [ ] Agregar logo del hotel
- [ ] Marca de agua "PAGADO"
- [ ] Código QR con datos de factura
- [ ] Plantillas personalizables
- [ ] Múltiples idiomas

### Fase 3: Funcionalidades Avanzadas
- [ ] Envío automático por email
- [ ] Guardar PDF en Firebase Storage
- [ ] Notas de crédito
- [ ] Factura electrónica (integración fiscal)
- [ ] Facturación desde POS directo

### Fase 4: Reportes
- [ ] Reporte de facturas emitidas
- [ ] Análisis de ingresos por facturación
- [ ] Exportar a Excel
- [ ] Dashboard de facturación

---

## Documentos Relacionados

1. **BILLING_FINANCIAL_MODULE_PROPOSAL.md** - Propuesta completa (Fases 1-4)
2. **INVOICING_MODULE_PHASE1_COMPLETE.md** - Implementación Fase 1
3. **INVOICING_FIXES.md** - Correcciones aplicadas
4. **PDF_GENERATION_RECOMMENDATIONS.md** - Análisis de librerías PDF
5. **PDF_GENERATION_IMPLEMENTATION.md** - Implementación de PDF
6. **DIRECT_PRINT_IMPLEMENTATION.md** - Impresión directa
7. **INVOICING_MODULE_README.md** - Este documento

---

## Métricas del Módulo

| Métrica | Valor |
|---------|-------|
| Archivos creados | 18 |
| Archivos modificados | 10 |
| Líneas de código | ~1,500 |
| Componentes | 3 |
| Servicios | 2 |
| Repositorios | 1 |
| Modelos | 2 interfaces |
| Dependencias | 2 (jspdf, jspdf-autotable) |

---

## Conclusión

El módulo de facturación está completamente funcional y listo para producción. Proporciona:

✅ Facturación formal con numeración consecutiva  
✅ Captura completa de datos fiscales  
✅ Generación de PDF profesional  
✅ Impresión directa sin descargar  
✅ Integración perfecta con Guest Accounts  
✅ Validaciones robustas de negocio  
✅ UI intuitiva y profesional  

**Estado**: ✅ PRODUCCIÓN  
**Versión**: 2.1.3  
**Última Actualización**: 2024-02-13

---

**Desarrollado para**: Fury Hotel Management System  
**Tecnologías**: Angular 16+, Firebase, jsPDF  
**Licencia**: Propietaria
