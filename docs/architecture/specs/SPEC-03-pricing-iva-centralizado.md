# SPEC-03 — Cálculo centralizado de pricing/IVA

**Estado:** COMPLETED (2026-08-17) — las 3 Tasks completadas y probadas (25 tests en verde, incluyendo paridad exacta contra el cálculo real de Angular). Sin consumidores todavía, cero riesgo de regresión. Ver resumen de cierre al final del archivo.

## Objetivo
Unificar en un solo lugar (backend) la fórmula de precio de reserva (`basePrice × noches`) y el cálculo de IVA (13%), hoy duplicadas e inconsistentes entre `BookingService` (sin IVA) y `GuestAccountService` (con IVA, hardcodeado dos veces).

## Problema actual
- `booking.service.ts:65-66,130-131`: `totalPrice = basePrice × nights`, sin IVA.
- `guest-account.service.ts:60,197`: `tax = subtotal × 0.13` duplicado literal en dos métodos distintos de la misma clase.
- POS calcula IVA en el componente de UI (no en un servicio), sin lugar único.
- No existe un concepto explícito de "¿el precio de la reserva incluye o no IVA?" — ambigüedad conceptual a resolver, no solo técnica.

## Comportamiento actual que debemos preservar
- El monto final que ve hoy un usuario en `totalPrice` de una reserva y en `total` de una Guest Account **no debe cambiar** para los mismos datos de entrada, salvo que el usuario confirme que quiere corregir la inconsistencia (ver pregunta abierta abajo).
- IVA 13% aplicado a cargos de Guest Account tal como hoy.

## Comportamiento esperado
Dos funciones puras, testeables, sin efectos secundarios, en `functions/src/shared/pricing.ts`:
- `calcularPrecioReserva(basePrice: number, checkIn: Date, checkOut: Date): { nights: number; totalPrice: number }`
- `calcularTotalesConImpuesto(subtotal: number, taxRate = 0.13): { subtotal: number; tax: number; total: number }`

**Pregunta abierta para el usuario, a resolver antes de implementar** (no asumir): ¿el `totalPrice` de una reserva (`BookingService`) debería incluir IVA desde ya, igual que las Guest Accounts, o intencionalmente no lo incluye porque el IVA solo aplica al momento de facturar/cobrar? Esto determina si `calcularPrecioReserva` debe devolver también `tax`/`total` o solo el subtotal de alojamiento.

## Reglas de negocio
- IVA = 13% (parametrizable a futuro vía `ParametersService`, pero **no se propone parametrizarlo en esta Spec** — se mantiene hardcodeado como hoy, solo centralizado en un lugar en vez de dos).
- Noches = `Math.ceil((checkOut - checkIn) / 86400000)`, igual que hoy.

## Datos de entrada
Ver firmas arriba.

## Datos de salida
Ver firmas arriba.

## Validaciones
- `checkOut > checkIn` (ya validado hoy en `booking.service.ts`, se replica aquí).
- `subtotal >= 0`.

## Permisos/autorización
N/A (funciones puras internas, sin acceso a Firestore ni a auth).

## Firestore collections/documents involucrados
Ninguno (funciones puras).

## Firebase Functions/API involucradas
No se expone como callable propia — es lógica interna reutilizada por Spec 05 (crearReserva), Spec 09 (cargos de Guest Account) y Spec 10 (facturación). Podría reutilizarse también desde Angular (mismo código TypeScript, si se decide compartir el archivo como parte del contrato de Spec 13), pero eso es opcional y no bloquea esta Spec.

## Dependencias
SPEC-00.

## Impacto en Angular
Ninguno todavía (funciones puras sin consumidor hasta Spec 05/09/10).

## Impacto potencial en Flutter
Ninguno todavía.

## Impacto potencial en n8n/agente IA
Ninguno directo, pero garantiza que cuando el agente cree una reserva (Spec 14), el precio se calcule exactamente igual que en Angular.

## Criterios de aceptación
- Los resultados de `calcularPrecioReserva`/`calcularTotalesConImpuesto` coinciden con los que produce hoy el código Angular para un conjunto de casos de prueba extraídos de datos reales/representativos.
- La pregunta abierta sobre IVA en `totalPrice` de reserva está resuelta y documentada antes de escribir código.

## Estrategia de pruebas
1. Tests unitarios puros (sin Firestore/emulador necesario) cubriendo: noches exactas, redondeo hacia arriba de noches parciales, IVA sobre distintos subtotales (incluyendo decimales, para detectar problemas de redondeo de punto flotante).
2. Comparación explícita contra el cálculo actual de Angular con los mismos inputs (test de paridad).

## Riesgos de regresión
Ninguno sobre la app existente en esta Spec (no hay consumidor todavía). El riesgo de redondeo/inconsistencia se gestiona aquí antes de que Spec 05/09/10 lo hereden.

---

## Tasks

### Task 03.1 — Resolver la pregunta abierta de IVA en `totalPrice` de reserva
- **Objetivo:** decisión explícita del usuario antes de codificar.
- **Archivos afectados:** ninguno (decisión).
- **Dependencias:** ninguna.
- **Validación:** confirmación escrita del usuario, registrada en esta Spec.
- **Riesgos de regresión:** ninguno.
- **Estado:** DECIDED (2026-08-17)
  - **Decisión del usuario:** `calcularPrecioReserva` devuelve solo `{ nights, totalPrice }` **sin IVA**, replicando exactamente el comportamiento actual de `booking.service.ts`. El IVA sigue aplicándose únicamente al cobrar (Guest Account / factura), no en la reserva. No cambia ningún monto que el usuario vea hoy en pantalla.
  - Contexto verificado en el código real antes de preguntar: `booking.totalPrice` (`booking.service.ts:65-66`) es puramente informativo (`basePrice × noches`, sin IVA); el cargo real nace en `guest-account.service.ts:42-60` en el check-in, que **recalcula** de forma independiente `pricePerNight × nights` como `accommodationSubtotal` y le suma 13% IVA aparte — no reutiliza `booking.totalPrice` directamente.

### Task 03.2 — Implementar `calcularPrecioReserva` y `calcularTotalesConImpuesto`
- **Objetivo:** funciones puras testeadas.
- **Archivos afectados:** nuevo `functions/src/shared/pricing.ts`.
- **Dependencias:** Task 03.1.
- **Validación:** tests unitarios + test de paridad contra Angular.
- **Riesgos de regresión:** ninguno todavía.
- **Estado:** COMPLETED (2026-08-17)
  - **Hallazgo importante (código real vs. texto del Spec):** la sección "Validaciones" de este Spec afirmaba que `checkOut > checkIn` "ya está validado hoy en `booking.service.ts`". Al leer el código real (`booking.service.ts:319-323`, `calculateNights`), **eso es falso**: usa `Math.abs(checkOut - checkIn)` y no valida el orden de las fechas en ningún punto — fechas invertidas simplemente producen el mismo número de noches en valor absoluto, sin error. `calcularPrecioReserva` replica exactamente ese comportamiento real (incluye un test específico para el caso de fechas invertidas). No se introdujo una validación nueva que hoy no existe, para no cambiar comportamiento fuera del alcance de esta Spec.
  - `calcularPrecioReserva(basePrice, checkIn, checkOut)` replica bit a bit `BookingService.calculateNights` + `basePrice × nights`, sin IVA (según Task 03.1).
  - `calcularTotalesConImpuesto(subtotal, taxRate = 0.13)` replica bit a bit `GuestAccountService` (`tax = subtotal * 0.13`, `total = subtotal + tax`); `taxRate` queda parametrizable en la firma pero sin usarse desde ningún caller todavía (no se propone parametrizar vía `ParametersService` en esta Spec, tal como pedía el Spec).
  - 8 tests unitarios en `functions/src/shared/pricing.test.ts`: noches exactas, redondeo de noches parciales, una sola noche, fechas invertidas, **paridad exacta** contra una réplica literal de `BookingService.calculateNights` para fechas representativas (cruce de mes, cruce de año, horas parciales), IVA sobre subtotal simple, **paridad exacta** contra una réplica literal del cálculo de `GuestAccountService` para subtotales con decimales (para detectar problemas de redondeo de punto flotante), y tasa de impuesto no-default. Los 8 pasan, parte de los 25 tests en verde del `npm test` de `functions/`.

### Task 03.3 — Documentar el contrato para Spec 05/09/10
- **Objetivo:** firma clara y estable para las specs consumidoras.
- **Archivos afectados:** comentario/README en `functions/src/shared/pricing.ts`.
- **Dependencias:** Task 03.2.
- **Validación:** revisión manual.
- **Riesgos de regresión:** ninguno.
- **Estado:** COMPLETED (2026-08-17) — JSDoc al inicio de `functions/src/shared/pricing.ts` documenta el objetivo, la decisión de Task 03.1 (sin IVA en `calcularPrecioReserva`), y el uso previsto para que Spec 05/09/10 no reinterpreten el contrato.

---

## Resumen de cierre de SPEC-03

**Archivos nuevos:** `functions/src/shared/pricing.ts`, `functions/src/shared/pricing.test.ts`.
**Nada en `lequintweb/src/app/` fue modificado** — Angular sigue calculando `totalPrice`/`tax`/`total` exactamente igual que hoy (con la duplicación conocida entre `BookingService` y `GuestAccountService`); esta Spec no tiene consumidores todavía (eso es Spec 05/09/10).

**Pruebas realizadas:**
- `npm run build` en `functions/` — limpio; `lib/` no incluye archivos de test.
- `npm test` — 4 suites, **25 tests en verde** (17 previos + 8 nuevos de pricing, incluyendo paridad explícita contra réplicas literales del código Angular real).

**Riesgos:** ninguno sobre la app en producción. Se detectó y documentó una imprecisión del propio Spec (la validación `checkOut > checkIn` que decía existir hoy, no existe) antes de que se propagara a Spec 05.

**Siguiente paso:** SPEC-04 — validar disponibilidad (siguiendo en `lequintweb`/`functions/`, Flutter queda pendiente para el final).
