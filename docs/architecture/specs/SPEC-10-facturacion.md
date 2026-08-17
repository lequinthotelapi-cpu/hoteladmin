# SPEC-10 — Emisión de factura centralizada

**Estado:** PENDING

## Objetivo
Centralizar `createInvoiceFromGuestAccount` en una Function que use el contador atómico (Spec 02) para el `invoiceNumber` y garantice inmutabilidad real de facturas emitidas (hoy nada lo impide vía Firestore directo).

## Problema actual
`invoice.service.ts:76-163`: numeración no atómica (conteo+1) y las rules actuales permiten `update` libre de cualquier factura por cualquier autenticado — una factura ya emitida puede alterarse directamente en Firestore, comprometiendo el rastro fiscal.

## Comportamiento actual que debemos preservar
- Solo factura cuentas `closed` con `balance === 0`.
- Una sola factura por `referenceId` (Guest Account o venta POS).
- `cancelInvoice` como única vía de "anular" (no borra, marca `cancelled`).

## Comportamiento esperado
Callable `emitirFactura({referenceId, tipo, datosCliente})`, transaccional, usando `getNextSequence` (Spec 02); una vez emitida, ninguna escritura de cliente puede modificar sus campos financieros (reforzado también en Spec 12 al endurecer `firestore.rules`).

## Reglas de negocio
Ver sección B.8 del análisis.

## Datos de entrada
`{ referenceId: string; tipo: 'guest_account' | 'pos'; clientName: string; clientTaxId: string; clientAddress?: string; clientEmail?: string; clientPhone?: string }`.

## Datos de salida
`{ invoiceId: string; invoiceNumber: string }`.

## Validaciones
Cuenta `closed` y `balance === 0` (para tipo `guest_account`); no exista ya factura para ese `referenceId`.

## Permisos/autorización
Rol `receptionist` o superior, a confirmar.

## Firestore collections/documents involucrados
`invoices` (escritura), `guestAccounts` (lectura), `counters` (Spec 02).

## Firebase Functions/API involucradas
`emitirFactura`, `cancelarFactura` (nuevas). Reutiliza Spec 02.

## Dependencias
SPEC-02, SPEC-09.

## Impacto en Angular
`InvoiceService.createInvoiceFromGuestAccount`/`cancelInvoice` pasan a invocar las callables. La generación de PDF (`jsPDF`) permanece en Angular sin cambios — solo cambia de dónde vienen los datos de la factura ya creada.

## Impacto potencial en Flutter
No auditado.

## Impacto potencial en n8n/agente IA
Bajo probablemente — emitir factura probablemente sigue siendo una acción humana con revisión, pero se deja disponible el mismo patrón por consistencia.

## Criterios de aceptación
- Dos emisiones simultáneas de factura no colisionan en número.
- No se puede editar una factura ya emitida vía Firestore directo tras el endurecimiento correspondiente en Spec 12.
- La generación de PDF sigue funcionando igual.

## Estrategia de pruebas
1. Tests en emulador: caso feliz, cuenta con saldo pendiente, factura duplicada, concurrencia de numeración.
2. Regresión manual: emitir factura desde Guest Account, imprimir/descargar PDF, cancelar factura.

## Riesgos de regresión
Medio-alto por el impacto fiscal/contable de un error en numeración o montos.

---

## Tasks

### Task 10.1 — Implementar `emitirFactura` y `cancelarFactura`
- **Archivos afectados:** nuevo `functions/src/invoices/`.
- **Dependencias:** SPEC-02, SPEC-09.
- **Validación:** tests en emulador.
- **Estado:** PENDING

### Task 10.2 — Adaptar `InvoiceService` en Angular
- **Archivos afectados:** `src/app/core/services/invoice.service.ts`.
- **Dependencias:** Task 10.1.
- **Validación:** `ng build`; regresión manual (incluye generación de PDF).
- **Riesgos de regresión:** medio-alto.
- **Estado:** PENDING

### Task 10.3 — Regresión manual y aprobación del usuario
- **Dependencias:** Task 10.2.
- **Estado:** PENDING

### Task 10.4 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 10.3 VERIFIED.
- **Estado:** PENDING
