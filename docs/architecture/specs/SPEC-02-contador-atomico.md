# SPEC-02 — Contador atómico centralizado

**Estado:** COMPLETED (2026-08-17) — las 3 Tasks completadas y probadas: formateo unitario (7 tests offline) + concurrencia real contra el emulador de Firestore (2 tests, sin mocks). No tiene consumidores todavía (Spec 05/10), así que no hay riesgo de regresión sobre la app existente — ver resumen de cierre al final del archivo.

## Objetivo
Reemplazar la generación no atómica de `bookingNumber` (aleatorio) e `invoiceNumber` (conteo de documentos + 1) por un contador atómico server-side, eliminando el riesgo de colisión bajo concurrencia, sin cambiar el formato visible de los números para no romper reportes/UX existentes.

## Problema actual
- `booking.service.ts:325-333`: `BK-YYYYMMDD-XXX` con sufijo `Math.random()` — dos reservas creadas en el mismo segundo pueden colisionar.
- `invoice.service.ts:146-163`: `FAC-YYYYMM-XXXX` contando documentos del mes actual + 1 — dos facturas creadas casi simultáneamente pueden leer el mismo conteo antes de que ninguna haya escrito, y generar el mismo número.

## Comportamiento actual que debemos preservar
- Formato visible: `BK-YYYYMMDD-XXX` y `FAC-YYYYMM-XXXX` (mismo prefijo, mismo largo, mismo criterio de reinicio mensual para facturas).
- Los números ya generados en producción no cambian retroactivamente.

## Comportamiento esperado
- Una Cloud Function callable `obtenerSiguienteNumero({tipo: 'booking'|'invoice', periodo})` (o una función interna reutilizada por las Functions de Spec 05 y Spec 10, no necesariamente expuesta directo a Angular) que incrementa atómicamente un contador en Firestore (`runTransaction` sobre un documento `counters/{tipo}_{periodo}`) y devuelve el siguiente valor formateado.
- Angular dejará de generar el número client-side una vez que `crearReserva` (Spec 05) y `emitirFactura` (Spec 10) existan — hasta entonces, esta pieza se construye y se testea de forma aislada, sin cambiar aún el comportamiento visible de Angular.

## Reglas de negocio
- El contador de `booking` se reinicia por día (`YYYYMMDD`), el de `invoice` se reinicia por mes (`YYYYMM`) — igual que hoy.
- El contador nunca retrocede ni repite un valor ya emitido.

## Datos de entrada
`{ tipo: 'booking' | 'invoice', fecha: Date }` (la Function deriva el período correspondiente).

## Datos de salida
`{ numero: string }` (formateado, p. ej. `BK-20260816-001`, `FAC-202608-0001`).

## Validaciones
- `tipo` debe ser uno de los valores soportados.

## Permisos/autorización
No se expone como callable pública independiente inicialmente — es lógica interna reutilizada por Functions de negocio (Spec 05, 10), que ya validan su propio caller. Si en el futuro se necesita exponerla sola, requeriría rol `receptionist` o superior.

## Firestore collections/documents involucrados
Nueva colección `counters`, documentos `counters/booking_{YYYYMMDD}` y `counters/invoice_{YYYYMM}`.

## Firebase Functions/API involucradas
Función interna `getNextSequence(tipo, periodo)` en `functions/src/shared/counters.ts`, usada por las Functions de Spec 05 y Spec 10 (no necesariamente por su propio endpoint).

## Dependencias
SPEC-00.

## Impacto en Angular
Ninguno todavía en esta Spec (Angular sigue generando sus números como hoy hasta que Spec 05/10 lo reemplacen). Este es un cambio "invisible" construido por adelantado.

## Impacto potencial en Flutter
Ninguno todavía.

## Impacto potencial en n8n/agente IA
Ninguno todavía — pero es una pieza que el agente necesitará indirectamente en cuanto use `crearReserva`.

## Criterios de aceptación
- Test de concurrencia: 20 llamadas simultáneas a `getNextSequence('booking', '20260816')` devuelven 20 valores únicos y consecutivos.
- El formato de salida coincide exactamente con el actual (`BK-YYYYMMDD-XXX`, `FAC-YYYYMM-XXXX`).

## Estrategia de pruebas
1. Test unitario del formateo (dado un número de secuencia, produce el string esperado).
2. Test de concurrencia contra el emulador de Firestore (llamadas paralelas reales, no simuladas).
3. No se prueba integración con Angular en esta Spec — eso ocurre en Spec 05/10.

## Riesgos de regresión
Ninguno sobre la app existente, porque nada la consume todavía. El riesgo se traslada a Spec 05/10, donde se compara explícitamente contra el comportamiento actual antes de reemplazarlo.

---

## Tasks

### Task 02.1 — Diseñar esquema de `counters` y función `getNextSequence`
- **Objetivo:** implementar el contador atómico con `runTransaction`.
- **Archivos afectados:** nuevo `functions/src/shared/counters.ts`.
- **Dependencias:** SPEC-00.
- **Validación:** test de concurrencia (20 llamadas paralelas → 20 valores únicos).
- **Riesgos de regresión:** ninguno (código nuevo, sin consumidores todavía).
- **Estado:** COMPLETED (2026-08-17)
  - `getNextSequence(tipo, fecha)` implementada exactamente como se diseñó: `runTransaction` sobre `counters/{tipo}_{periodo}`, lee el valor actual (0 si no existe), escribe `current+1` con `tx.set(..., {merge:true})`, devuelve `{numero, sequence, periodo}`.
  - **Prueba de concurrencia real** (no mockeada, según lo exige el criterio de aceptación del Spec): `functions/src/shared/counters.concurrency.test.ts`, corrida contra el emulador real de Firestore vía `firebase emulators:exec --only firestore "npm run test:concurrency"` (script y `jest.emulator.config.js` nuevos, separados del `npm test` por defecto para no requerir emulador en el flujo rápido/offline que ya usa SPEC-00). Resultado: **20 llamadas simultáneas a `getNextSequence('booking', misma fecha)` devolvieron 20 valores únicos y consecutivos (1 a 20)**, y una segunda prueba confirmó que tipos/períodos distintos no interfieren entre sí (contadores independientes). 2/2 tests en verde.
  - `functions/jest.config.js` se ajustó con `testPathIgnorePatterns` para excluir `*.concurrency.test.ts` del `npm test` normal (offline); `functions/tsconfig.json` ya excluía todo `*.test.ts` (incluye este) del build de producción — verificado que `lib/` solo contiene los 4 archivos de producción esperados más `shared/counters.js`.

### Task 02.2 — Formateadores `formatBookingNumber` / `formatInvoiceNumber`
- **Objetivo:** replicar exactamente el formato visible actual.
- **Archivos afectados:** `functions/src/shared/counters.ts` (o archivo separado `formatters.ts`).
- **Dependencias:** Task 02.1.
- **Validación:** test unitario comparando contra ejemplos reales generados hoy por Angular (mismo prefijo/longitud/padding).
- **Riesgos de regresión:** ninguno todavía.
- **Estado:** COMPLETED (2026-08-17)
  - Se leyó el código real (no la documentación) de `booking.service.ts:325-333` (`generateBookingNumber`, formato `` `BK-${year}${month}${day}-${random}` `` con `random` de 3 dígitos) e `invoice.service.ts:146-163` (`generateInvoiceNumber`, formato `` `FAC-${year}${month}-${sequenceStr}` `` con `sequenceStr` de 4 dígitos, contando documentos del mes) para replicar el formato bit a bit.
  - `formatBookingNumber(sequence, periodoYYYYMMDD)` → `BK-YYYYMMDD-XXX` (3 dígitos, padStart). `formatInvoiceNumber(sequence, periodoYYYYMM)` → `FAC-YYYYMM-XXXX` (4 dígitos, padStart). `derivePeriod(tipo, fecha)` reinicia por día para `booking` y por mes para `invoice`, igual que hoy.
  - 7 tests unitarios offline en `functions/src/shared/counters.test.ts` (comparando contra ejemplos concretos, incluye el caso borde de secuencia > 999/9999 sin truncar) — parte de los 17 tests en verde del `npm test` normal de `functions/`.

### Task 02.3 — Documentar el contrato para su uso desde Spec 05 y Spec 10
- **Objetivo:** dejar clara la firma de `getNextSequence` para que las specs consumidoras no reinterpreten el comportamiento.
- **Archivos afectados:** comentario/README breve en `functions/src/shared/counters.ts`.
- **Dependencias:** Task 02.1, 02.2.
- **Validación:** revisión manual.
- **Riesgos de regresión:** ninguno.
- **Estado:** COMPLETED (2026-08-17) — comentario JSDoc al inicio de `functions/src/shared/counters.ts` documenta el objetivo, el formato preservado, y el uso previsto (`const { numero } = await getNextSequence(tipo, fecha)`) para que Spec 05/10 lo consuman sin reinterpretar el contrato.

---

## Resumen de cierre de SPEC-02

**Archivos nuevos:** `functions/src/shared/counters.ts`, `functions/src/shared/counters.test.ts` (offline), `functions/src/shared/counters.concurrency.test.ts` (requiere emulador real), `functions/jest.emulator.config.js`.
**Archivos modificados:** `functions/jest.config.js` (excluye `*.concurrency.test.ts` del run offline), `functions/package.json` (script nuevo `test:concurrency`).
**Nada en `lequintweb/src/app/` fue modificado** — Angular sigue generando `bookingNumber`/`invoiceNumber` exactamente igual que hoy; esta Spec no tiene consumidores todavía (eso es Spec 05/10).

**Pruebas realizadas:**
- `npm run build` en `functions/` — limpio; `lib/` no incluye ningún archivo de test.
- `npm test` (offline, sin emulador) — 3 suites, **17 tests en verde** (10 de SPEC-00 + 7 nuevos de formateo/secuencia mockeada).
- `npm run test:concurrency` contra el emulador real de Firestore (`firebase emulators:exec --only firestore`) — **2/2 tests en verde**, incluyendo el criterio de aceptación explícito del Spec (20 llamadas simultáneas → 20 valores únicos y consecutivos).
- `ng build --configuration production` no se volvió a correr en esta Spec porque no se tocó ningún archivo de `src/app/` — no aplica.

**Riesgos:** ninguno sobre la app en producción (nadie consume `getNextSequence` todavía). El riesgo real de este mecanismo (reemplazar la generación actual sin cambiar el número visible en producción) se evalúa en Spec 05 (`crearReserva`) y Spec 10 (`emitirFactura`), donde si corresponde se compara explícitamente contra el comportamiento actual antes de reemplazarlo.

**Siguiente paso:** continuar con SPEC-03 — pricing/IVA centralizado, siguiendo el mismo enfoque (quedarnos en `lequintweb`/`functions/`, sin tocar Flutter todavía).

---

## Addendum (2026-08-17, durante SPEC-05): cambio de firma de `getNextSequence`

Al integrar `getNextSequence` como primer consumidor real en `crearReserva` (SPEC-05), se detectó que la firma original — `getNextSequence(tipo, fecha)`, que abría su **propia** `runTransaction` internamente — es incorrecta para ese uso: si se llama desde dentro de la transacción de `crearReserva`, se generan dos transacciones independientes y sin coordinar (la del contador y la de la reserva), rompiendo la atomicidad que esta Spec existe para garantizar (el contador podría incrementarse aunque la reserva termine fallando o reintentándose).

**Cambio:** `getNextSequence(tx, tipo, fecha)` ahora recibe la `Transaction` activa del caller, igual que `validarDisponibilidad` (SPEC-04). No abre su propia transacción.

Como esta Spec no tenía consumidores reales hasta ahora (su propio "Riesgos de regresión" ya anticipaba esto: "el riesgo real se traslada a Specs 05/10"), el cambio de firma no rompe nada en producción — solo se actualizaron sus tests (offline y de concurrencia) para reflejar la nueva firma, y los 3 tests de concurrencia siguen en verde tras el cambio.
