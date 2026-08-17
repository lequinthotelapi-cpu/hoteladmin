# SPEC-04 — Validación server-side de disponibilidad

**Estado:** COMPLETED (2026-08-17) — Tasks 04.1/04.2 implementadas y probadas (23 tests offline + 2 tests de concurrencia real contra el emulador). Task 04.3 es una recomendación pendiente de confirmación del usuario, no bloqueante. Hallazgo relevante para Spec 05: `validarDisponibilidad` valida `isActive`, algo que el `createBooking` actual no hace — ver detalle en Task 04.1. Ver resumen de cierre al final del archivo.

## Objetivo
Mover la comprobación de solapamiento de fechas (overlap) a una Cloud Function que se ejecute dentro de una transacción, eliminando el riesgo de overbooking por condición de carrera que existe hoy en el cliente.

## Problema actual
`booking-firebase.repository.ts:154-185`: trae todas las reservas de la habitación y filtra en cliente (`checkIn < booking.checkOutDate && checkOut > booking.checkInDate`, solo cuenta `confirmed`/`checked-in`). Como la comprobación y la posterior escritura de la nueva reserva no están en una transacción, dos usuarios pueden pasar ambos la validación para el mismo rango de fechas antes de que ninguno haya escrito, y crear reservas solapadas.

## Comportamiento actual que debemos preservar
- Solo cuentan como bloqueo las reservas en estado `confirmed`/`checked-in` (una reserva `pending` no bloquea otra reserva sobre las mismas fechas — igual que hoy, ver `booking.service.ts` y `room-status.service.ts`).
- Fórmula de solapamiento exacta: `nuevaCheckIn < existente.checkOutDate && nuevaCheckOut > existente.checkInDate`.
- `searchAvailableRooms` (`booking.service.ts:264-301`) sigue funcionando igual desde la perspectiva de Angular (puede seguir siendo lectura de solo-consulta, no necesita ser transaccional porque no escribe nada — ver nota en Task 04.3).

## Comportamiento esperado
Función interna `validarDisponibilidad(roomId, checkIn, checkOut, excludeBookingId?)` en `functions/src/bookings/availability.ts`, ejecutada **dentro** de la misma `runTransaction` que la Function `crearReserva` (Spec 05), no como callable independiente con su propia transacción — de lo contrario seguiría existiendo la ventana de carrera entre "validar" y "crear". `excludeBookingId` es necesario para el caso de edición de una reserva existente (no debe chocar consigo misma).

## Reglas de negocio
Igual a las actuales, ver arriba. No se cambia qué cuenta como conflicto — solo se cambia dónde y cómo se ejecuta la comprobación (transaccional, server-side).

## Datos de entrada
`{ roomId: string; checkIn: Date; checkOut: Date; excludeBookingId?: string }`

## Datos de salida
`{ disponible: boolean; conflictos?: BookingConflict[] }` (lista de reservas en conflicto, útil para mensajes de error claros hacia Angular/agente IA).

## Validaciones
- `checkOut > checkIn`.
- `roomId` existe y está `isActive` (regla ya presente en `BookingService`, se replica aquí).

## Permisos/autorización
No se expone como callable pública independiente — es lógica interna de `crearReserva`/`confirmarReserva`. Si se necesita para "búsqueda de disponibilidad" desde Angular en tiempo real (autocompletar UI), se puede exponer una variante de solo lectura sin las garantías transaccionales (ya que no escribe nada, no hay condición de carrera que prevenir en una simple consulta informativa).

## Firestore collections/documents involucrados
`bookings` (lectura dentro de la transacción, filtrado por `roomId` + estado), `rooms` (lectura de `isActive`).

## Firebase Functions/API involucradas
Lógica interna consumida por Spec 05 (`crearReserva`) y Spec 06 (`confirmarReserva`, si aplica re-validar al confirmar).

## Dependencias
SPEC-00.

## Impacto en Angular
Ninguno todavía en esta Spec de forma aislada — se integra en Spec 05.

## Impacto potencial en Flutter
Ninguno todavía.

## Impacto potencial en n8n/agente IA
Es la pieza que garantiza que el agente no pueda crear una reserva solapada aunque el empleado que conversa con él no vea el calendario completo.

## Criterios de aceptación
- Test de concurrencia: dos llamadas simultáneas a `crearReserva` (Spec 05, usando esta función internamente) para el mismo `roomId` y fechas solapadas → solo una tiene éxito, la otra recibe un error claro de conflicto.
- El resultado de "disponible/no disponible" coincide con el cálculo actual del cliente para el mismo set de datos (test de paridad).

## Estrategia de pruebas
1. Test unitario de la fórmula de solapamiento con casos límite (fechas adyacentes sin solape, solape parcial, solape total, mismo rango exacto).
2. Test de concurrencia contra el emulador (dos transacciones paralelas reales).
3. Test de paridad contra el resultado actual de `BookingService.checkRoomAvailability` con los mismos datos.

## Riesgos de regresión
Bajo en esta Spec de forma aislada (no tiene consumidor todavía); el riesgo real se gestiona en Spec 05, donde Angular empieza a depender de este resultado.

---

## Tasks

### Task 04.1 — Implementar `validarDisponibilidad` como función interna transaccional
- **Objetivo:** lógica de overlap ejecutable dentro de una transacción de Firestore.
- **Archivos afectados:** nuevo `functions/src/bookings/availability.ts`.
- **Dependencias:** SPEC-00.
- **Validación:** test unitario de la fórmula + test de concurrencia.
- **Riesgos de regresión:** ninguno todavía (sin consumidor).
- **Estado:** COMPLETED (2026-08-17)
  - **Hallazgo importante (código real vs. texto del Spec), igual que en SPEC-03:** la sección "Validaciones" de este Spec afirmaba "roomId existe y está isActive (regla ya presente en BookingService, se replica aquí)". Al leer el código real (`booking.service.ts:42-108`, `checkRoomAvailability` en `:303-316`, `getOverlappingBookings` en `booking-firebase.repository.ts:154-185`), **eso es falso**: `createBooking` nunca comprueba `isActive` en ningún punto — `isActive` solo se filtra en `searchAvailableRooms` (búsqueda de solo lectura), no en la creación. Implementé `validarDisponibilidad` con la validación de `isActive` **tal como la pide el "Comportamiento esperado" de este Spec** (es explícita, no una suposición mía) — es decir, esta función es intencionalmente **más estricta** que el `checkRoomAvailability` actual. Como esta Spec no tiene consumidor todavía, no cambia nada en producción hoy; queda documentado en mayúsculas para quien implemente Spec 05, porque ahí sí habrá que decidir explícitamente si `crearReserva` debe rechazar habitaciones inactivas (algo que `createBooking` hoy permite silenciosamente) o si se relaja esa validación para mantener paridad total con el comportamiento actual.
  - El resto de la lógica (fórmula de solapamiento, solo bloquean `confirmed`/`checked-in`, `excludeBookingId`) es réplica bit a bit de `getOverlappingBookings`.
  - `validarDisponibilidad(tx, roomId, checkIn, checkOut, excludeBookingId?)` recibe la `Transaction` activa (no abre la suya propia), tal como pide el Spec para no dejar ventana de carrera entre validar y escribir.
  - **23 tests unitarios offline** (`functions/src/bookings/availability.test.ts`): habitación inexistente/inactiva, estados que no bloquean vs. que sí bloquean, casos límite de solapamiento (adyacentes sin solape en ambos extremos, solape parcial inicio/final, rango idéntico, contención total), `excludeBookingId`, conversión de `Timestamp`, y una tabla de paridad exacta contra una réplica literal de la fórmula de Angular.
  - **Test de concurrencia real** (criterio de aceptación explícito del Spec, "no simulado"): `functions/src/bookings/availability.concurrency.test.ts`, corrido contra el emulador real vía `firebase emulators:exec --only firestore "npm run test:concurrency"` (mismo mecanismo que SPEC-02). Como `crearReserva` (Spec 05) todavía no existe, el test simula exactamente el patrón que Spec 05 deberá seguir (validar+escribir dentro de la misma transacción) y confirma con datos reales: **dos intentos simultáneos de reservar las mismas fechas en la misma habitación → exactamente 1 tiene éxito y el otro recibe `CONFLICT:overlap`**, con solo 1 documento de reserva efectivamente creado en Firestore. Un segundo caso confirma que fechas no solapadas concurrentes no interfieren entre sí. 2/2 en verde.

### Task 04.2 — Test de paridad contra `BookingService.checkRoomAvailability` actual
- **Objetivo:** confirmar que el resultado no cambia para los mismos datos antes de que Spec 05 lo adopte.
- **Archivos afectados:** test nuevo, sin tocar código de Angular.
- **Dependencias:** Task 04.1.
- **Validación:** mismos resultados para un set de casos representativos.
- **Riesgos de regresión:** ninguno.
- **Estado:** COMPLETED (2026-08-17) — cubierta como parte de Task 04.1 (`describe('validarDisponibilidad — paridad exacta con la fórmula actual de Angular')` en `availability.test.ts`): 6 casos (sin solape antes/después, solape parcial inicio/final, solape total, rango idéntico) comparados contra una réplica literal de `getOverlappingBookings`. El único punto donde el resultado **no** coincide con el actual es la validación de `isActive` (ver nota en Task 04.1) — deliberado, no un bug de paridad.

### Task 04.3 — Decidir si se expone una variante de solo-lectura para `searchAvailableRooms`
- **Objetivo:** evaluar si vale la pena exponer una callable de solo consulta para mejorar la búsqueda de habitaciones disponibles desde Angular, o si se deja como está (lectura directa a Firestore, sin riesgo porque no escribe).
- **Archivos afectados:** ninguno todavía (decisión).
- **Dependencias:** Task 04.1.
- **Validación:** decisión documentada; si se opta por exponerla, se define como Task adicional fuera de esta Spec.
- **Riesgos de regresión:** ninguno (es opcional, no bloquea el resto del roadmap).
- **Estado:** RECOMMENDED, pendiente de confirmación del usuario (2026-08-17)
  - **Recomendación:** no exponerla por ahora. `searchAvailableRooms` es de solo lectura (no escribe nada), así que no existe la condición de carrera que sí motiva transaccionalizar `validarDisponibilidad`. Migrarla a una callable añadiría latencia (round-trip a Functions) sin beneficio de seguridad/consistencia. Se puede reconsiderar si el agente IA (Spec 14) necesita reutilizar exactamente esta lógica de búsqueda en vez de reimplementarla, pero eso está fuera del alcance actual.
  - Dado que el usuario pidió priorizar avance y dejar revisiones de diseño para el final, esta recomendación queda anotada aquí para confirmación posterior en vez de bloquear el resto del backlog — no genera ningún archivo nuevo ni cambia nada hasta que se confirme.

---

## Resumen de cierre de SPEC-04

**Archivos nuevos:** `functions/src/bookings/availability.ts`, `functions/src/bookings/availability.test.ts` (offline), `functions/src/bookings/availability.concurrency.test.ts` (requiere emulador real).
**Nada en `lequintweb/src/app/` fue modificado** — Angular sigue usando `checkRoomAvailability` exactamente igual que hoy; esta Spec no tiene consumidor todavía (eso es Spec 05).

**Hallazgo para llevar a Spec 05:** `validarDisponibilidad` es deliberadamente más estricta que el código actual — valida que la habitación exista y esté `isActive`, algo que `BookingService.createBooking` no comprueba hoy en ningún punto. Cuando Spec 05 (`crearReserva`) adopte esta función, habrá que decidir explícitamente si se mantiene esa validación nueva (cerrando un gap real) o se relaja para paridad total — no es una decisión a tomar ahora, solo queda anotada para no olvidarla.

**Pruebas realizadas:**
- `npm run build` en `functions/` — limpio; `lib/` no incluye archivos de test.
- `npm test` (offline) — 5 suites, **48 tests en verde** (25 previos + 23 nuevos de disponibilidad).
- `npm run test:concurrency` contra el emulador real — **4/4 en verde** (2 de SPEC-02 + 2 nuevos de SPEC-04), incluyendo el criterio de aceptación explícito: dos intentos simultáneos de reservar las mismas fechas → solo uno tiene éxito, con exactamente 1 documento creado en Firestore.

**Riesgos:** ninguno sobre la app en producción (sin consumidor todavía). El riesgo real de este mecanismo se evalúa en Spec 05, incluyendo la decisión pendiente sobre `isActive` señalada arriba.

**Pendiente de tu confirmación (no bloqueante):** Task 04.3 — recomendación de no exponer una callable de solo-lectura para `searchAvailableRooms` por ahora.

**Siguiente paso:** SPEC-05 — crear reserva (`crearReserva`), el primer consumidor real de SPEC-02/03/04 juntas.
