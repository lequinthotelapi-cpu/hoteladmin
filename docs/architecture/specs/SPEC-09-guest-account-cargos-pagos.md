# SPEC-09 — Cargos, pagos y cierre de Guest Account

**Estado:** PENDING

## Objetivo
Centralizar `addCharge`, `addPayment` y `closeAccount` de `GuestAccountService` en Cloud Functions transaccionales, cerrando el riesgo de condición de carrera (arrays completos sobrescritos) y el riesgo de seguridad de que hoy cualquier autenticado pueda escribir `balance: 0` directo en Firestore.

## Problema actual
`guest-account.service.ts:86-193`: lectura del documento completo → mutación del array `charges[]`/`payments[]` en memoria → sobrescritura completa, sin transacción ni `arrayUnion`. Dos cargos/pagos simultáneos pueden perderse (el segundo sobrescribe basado en una lectura desactualizada).

## Comportamiento actual que debemos preservar
- Solo cuentas `open` aceptan cargos/pagos.
- IVA 13% (vía Spec 03).
- Pago no puede exceder el saldo pendiente.
- Cierre solo permitido con `balance === 0`.

## Comportamiento esperado
Tres callables transaccionales: `agregarCargoCuenta`, `agregarPagoCuenta`, `cerrarCuenta`, usando `arrayUnion`/transacción para evitar pérdida de escrituras concurrentes, y reutilizando `calcularTotalesConImpuesto` (Spec 03).

## Reglas de negocio
Ver arriba, sección B.2 del análisis.

## Datos de entrada
`agregarCargoCuenta({accountId, tipo, descripcion, monto, cantidad})`; `agregarPagoCuenta({accountId, monto, metodoPago})`; `cerrarCuenta({accountId})`.

## Datos de salida
Cuenta actualizada con totales recalculados.

## Validaciones
Cuenta `open` (para cargo/pago); pago `<= balance` pendiente; `balance === 0` para cerrar.

## Permisos/autorización
Rol `receptionist` o superior, a confirmar.

## Firestore collections/documents involucrados
`guestAccounts`.

## Firebase Functions/API involucradas
Nuevas: `agregarCargoCuenta`, `agregarPagoCuenta`, `cerrarCuenta`. Reutiliza Spec 03.

## Dependencias
SPEC-03, SPEC-07 (la cuenta se crea en check-in).

## Impacto en Angular
`GuestAccountService.addCharge/addPayment/closeAccount` pasan a invocar las callables. Componentes: detalle de Guest Account, dialogs de agregar cargo/pago, integración POS (venta "a la habitación" agrega un cargo — verificar que ese camino también pase por la nueva Function, no solo el dialog manual).

## Impacto potencial en Flutter
No auditado.

## Impacto potencial en n8n/agente IA
Caso de uso futuro ("agrega un cargo de $50 a la cuenta de la 205"), no conectado en esta Spec.

## Criterios de aceptación
- Dos cargos simultáneos a la misma cuenta no se pierden entre sí (test de concurrencia).
- Un pago que excede el saldo se rechaza.
- Una cuenta con saldo pendiente no puede cerrarse.
- El flujo POS "cargar a habitación" sigue funcionando igual.

## Estrategia de pruebas
1. Tests en emulador incluyendo concurrencia (dos cargos simultáneos).
2. Regresión manual: detalle de cuenta, dialogs de cargo/pago, cierre de cuenta, venta POS cargada a habitación.
3. Verificar `InvoiceService` (Spec 10 depende de esto) sigue pudiendo leer `charges[]` con el mismo formato.

## Riesgos de regresión
Alto — maneja dinero real y es la base de la facturación (Spec 10).

---

## Tasks

### Task 09.1 — Confirmar el camino "cargar venta POS a la habitación" y sus consumidores exactos
- **Objetivo:** no romper la integración POS→Guest Account.
- **Dependencias:** ninguna.
- **Validación:** documentado antes de implementar.
- **Estado:** PENDING

### Task 09.2 — Implementar `agregarCargoCuenta`, `agregarPagoCuenta`, `cerrarCuenta`
- **Archivos afectados:** nuevo `functions/src/guest-accounts/`.
- **Dependencias:** SPEC-03, SPEC-07, Task 09.1.
- **Validación:** tests en emulador + concurrencia.
- **Estado:** PENDING

### Task 09.3 — Adaptar `GuestAccountService` en Angular
- **Archivos afectados:** `src/app/core/services/guest-account.service.ts`.
- **Dependencias:** Task 09.2.
- **Validación:** `ng build`; regresión manual completa (incluye POS).
- **Riesgos de regresión:** alto.
- **Estado:** PENDING

### Task 09.4 — Regresión manual y aprobación del usuario
- **Dependencias:** Task 09.3.
- **Estado:** PENDING

### Task 09.5 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 09.4 VERIFIED.
- **Estado:** PENDING
