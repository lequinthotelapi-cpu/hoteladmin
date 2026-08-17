# SPEC-11 — Venta POS transaccional

**Estado:** PENDING

## Objetivo
Centralizar `POSService.createSale` en una Function transaccional que valide y descuente stock de forma atómica, cerrando el riesgo de stock negativo/doble venta identificado en el análisis (mismo patrón de riesgo que el overbooking de reservas).

## Problema actual
`pos.service.ts:21-83`: valida stock, luego descuenta stock producto por producto en un loop secuencial no atómico, sin rollback si falla un paso intermedio. Dos ventas concurrentes del mismo producto pueden ambas pasar la validación.

## Comportamiento actual que debemos preservar
- Requiere caja abierta del cajero.
- Valida producto activo y stock suficiente por ítem.
- Registra la venta y la transacción de caja asociada.

## Comportamiento esperado
Callable `registrarVentaPOS(datos)`, transaccional: valida caja abierta, valida y descuenta stock de todos los ítems dentro de la misma transacción (todo o nada), crea la venta y la transacción de caja.

## Reglas de negocio
Ver sección B.6 del análisis.

## Datos de entrada
`{ items: {productId, quantity, unitPrice}[]; cashRegisterId: string; paymentMethod: string; tipoVenta: 'directa' | 'habitacion'; guestAccountId?: string }`.

## Datos de salida
`{ saleId: string; total: number }`.

## Validaciones
Caja abierta y del cajero correcto; stock suficiente por ítem (verificado y descontado atómicamente); producto activo.

## Permisos/autorización
Rol con acceso a POS, a confirmar.

## Firestore collections/documents involucrados
`sales`, `products`, `cashRegisters`, `transactions`, y si `tipoVenta === 'habitacion'`, `guestAccounts` (integración con Spec 09).

## Firebase Functions/API involucradas
`registrarVentaPOS` (nueva). Si `tipoVenta === 'habitacion'`, reutiliza `agregarCargoCuenta` (Spec 09) internamente.

## Dependencias
SPEC-03 (IVA), SPEC-09 (si aplica carga a habitación).

## Impacto en Angular
`POSService.createSale` pasa a invocar la callable. UI de POS (`features/private/pos`) sin cambios de interfaz.

## Impacto potencial en Flutter
No auditado.

## Impacto potencial en n8n/agente IA
Bajo probablemente — venta POS es una operación presencial, poco probable que el agente la ejecute, pero se deja disponible por consistencia.

## Criterios de aceptación
- Dos ventas concurrentes del último ítem de stock: solo una tiene éxito, la otra se rechaza con mensaje claro de stock insuficiente.
- El registro de venta y la transacción de caja se crean juntos o no se crea ninguno (atomicidad).
- La integración "cargar a habitación" sigue funcionando igual (usa Spec 09 internamente).

## Estrategia de pruebas
1. Tests en emulador: caso feliz, stock insuficiente, caja no abierta, concurrencia sobre el mismo producto.
2. Regresión manual: venta directa y venta cargada a habitación desde la UI de POS.

## Riesgos de regresión
Alto — toca inventario y caja simultáneamente, dos flujos financieros sensibles.

---

## Tasks

### Task 11.1 — Implementar `registrarVentaPOS` transaccional
- **Archivos afectados:** nuevo `functions/src/pos/registrar-venta.ts`.
- **Dependencias:** SPEC-03, SPEC-09.
- **Validación:** tests en emulador + concurrencia.
- **Estado:** PENDING

### Task 11.2 — Adaptar `POSService` en Angular
- **Archivos afectados:** `src/app/core/services/pos.service.ts`.
- **Dependencias:** Task 11.1.
- **Validación:** `ng build`; regresión manual (venta directa + a habitación).
- **Riesgos de regresión:** alto.
- **Estado:** PENDING

### Task 11.3 — Regresión manual y aprobación del usuario
- **Dependencias:** Task 11.2.
- **Estado:** PENDING

### Task 11.4 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 11.3 VERIFIED.
- **Estado:** PENDING
