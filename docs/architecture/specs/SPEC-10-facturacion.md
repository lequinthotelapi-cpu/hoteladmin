# SPEC-10 — Emisión de factura centralizada

**Estado:** IN PROGRESS (2026-08-17) — Tasks 10.1/10.2 completadas (Functions `emitirFactura`/`cancelarFactura` implementadas, 70 tests en verde contra el emulador real incluyendo 2 tests de concurrencia; `InvoiceService` ya las consume). Tasks 10.3/10.4 pendientes de que el usuario despliegue y confirme en producción (incluye probar la generación de PDF).

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
- **Estado:** COMPLETED (2026-08-17)
  - **Hallazgo contra el código real:** la única vía de creación de factura en la UI hoy es `createInvoiceFromGuestAccount` (`create-invoice-dialog.component.ts:52`), siempre `type: 'guest_account'`. No existe ningún flujo de facturación de venta POS en la UI, a pesar de que `CreateInvoiceDto.type`/el texto del Spec contemplan `'pos'`. Sin una implementación de referencia que replicar para ese caso, `emitirFactura` solo soporta `tipo: 'guest_account'` — `'pos'` devuelve `INVOICE_TYPE_NOT_SUPPORTED` en vez de inventar lógica sin precedente real.
  - `emitirFactura` valida datos requeridos, que no exista ya una factura para la misma `referenceId`, que la cuenta esté `closed` con `balance === 0`, arma los `items` desde `charges[]` de la cuenta, y usa `getNextSequence(tx, 'invoice', fecha)` (SPEC-02) para el número, todo en una transacción.
  - `cancelarFactura` valida existencia + que no esté ya `cancelled`.
  - Códigos de error nuevos: `LH-0305` (validación), `LH-0416..0421` (negocio).
  - **20 tests contra el emulador real**: 13 comportamiento (sin auth/rol/datos, tipo pos rechazado, cuenta inexistente/no-closed/con-saldo, caso feliz con aritmética exacta, referencia duplicada rechazada, cancelar sin motivo/inexistente/ya-cancelada/caso feliz) + **2 tests de concurrencia real**: 10 facturas simultáneas de 10 cuentas distintas → 10 números únicos (criterio de aceptación explícito del Spec), y dos emisiones simultáneas para la MISMA referencia → solo una tiene éxito. Total `functions/`: 70 tests en verde contra el emulador + 49 offline.

### Task 10.2 — Adaptar `InvoiceService` en Angular
- **Archivos afectados:** `src/app/core/services/invoice.service.ts`.
- **Dependencias:** Task 10.1.
- **Validación:** `ng build`; regresión manual (incluye generación de PDF).
- **Riesgos de regresión:** medio-alto.
- **Estado:** COMPLETED a nivel de código (2026-08-17) — `createInvoiceFromGuestAccount`/`cancelInvoice` mantienen su firma pública exacta. La generación de PDF (`jsPDF`) no se tocó — sigue en Angular, consumiendo la factura ya creada, sin cambios. `createInvoice` (el método genérico, sin caller real en la UI) y `generateInvoiceNumber` no se tocaron — fuera de alcance. `ng build --configuration production` limpio. Regresión manual (incluyendo PDF): **pendiente** (Task 10.3).

### Task 10.3 — Regresión manual y aprobación del usuario
- **Dependencias:** Task 10.2.
- **Estado:** PENDING — requiere que el usuario despliegue `emitirFactura`/`cancelarFactura` y pruebe: emitir factura desde una Guest Account cerrada, generar/descargar el PDF, cancelar una factura.

### Task 10.4 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 10.3 VERIFIED.
- **Estado:** PENDING
