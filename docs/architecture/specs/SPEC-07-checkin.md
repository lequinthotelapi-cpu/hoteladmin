# SPEC-07 — `registrarCheckIn` transaccional

**Estado:** PENDING

## Objetivo
Centralizar el flujo de check-in (validar reserva `confirmed` → crear Guest Account con cargo de alojamiento → cambiar habitación a `occupied` → reserva a `checked-in`) en una única transacción server-side, eliminando el riesgo de estado inconsistente si falla a mitad de camino.

## Problema actual
`BookingService.checkIn` (`booking.service.ts:176-198`) ejecuta 3 escrituras independientes (`GuestAccount`, `Room`, `Booking`) sin transacción — si falla la segunda o tercera escritura, queda un estado a medias (p. ej. cuenta creada pero habitación no marcada `occupied`). Además, **el código no valida explícitamente que la habitación esté `available`/`reserved` antes del check-in** pese a que es una regla documentada — confirmar si es un gap real o si la validación vive en otro punto no localizado, antes de "corregir" nada.

## Comportamiento actual que debemos preservar
- Solo reservas `confirmed` pueden hacer check-in.
- Se crea una Guest Account automáticamente con cargo de alojamiento (usa Spec 03 para el monto).
- La habitación pasa a `occupied`.

## Comportamiento esperado
Callable `registrarCheckIn({bookingId})`, dentro de `runTransaction`:
1. Lee la reserva, valida `status === 'confirmed'`.
2. Lee la habitación, valida disponibilidad real (a confirmar en Task 07.1 si esto es un gap a corregir o comportamiento intencional a preservar tal cual).
3. Crea `guestAccounts/{nuevoId}` con cargo de alojamiento calculado vía Spec 03.
4. Actualiza `rooms/{roomId}.status = 'occupied'`.
5. Actualiza `bookings/{bookingId}.status = 'checked-in'`.
Todo en una sola transacción — si algo falla, no se aplica ningún cambio parcial.

## Reglas de negocio
Las de la sección B.2/B.4 del análisis, más la pregunta abierta sobre validación de estado de habitación (Task 07.1).

## Datos de entrada
`{ bookingId: string }`.

## Datos de salida
`{ guestAccountId: string; booking: BookingActualizado; room: RoomActualizada }`.

## Validaciones
`status === 'confirmed'`; habitación existe; (pendiente confirmar) habitación en estado apto.

## Permisos/autorización
Rol `receptionist` o superior, a confirmar.

## Firestore collections/documents involucrados
`bookings`, `rooms`, `guestAccounts` — las tres en una misma transacción.

## Firebase Functions/API involucradas
`registrarCheckIn` (nueva), reutiliza Spec 03 para el cargo inicial.

## Dependencias
SPEC-05, SPEC-06 (mismo módulo y convenciones).

## Impacto en Angular
`BookingService.checkIn` pasa a invocar la callable. Componentes: `room-map-actions-dialog`, vista Grid/Lista de habitaciones (botón check-in visible solo si `reserved`).

## Impacto potencial en Flutter
No auditado.

## Impacto potencial en n8n/agente IA
Caso de uso natural futuro ("registra el check-in de la 205"), no se conecta en esta Spec.

## Criterios de aceptación
- Un fallo simulado a mitad de la transacción no deja estado parcial (test dedicado).
- El monto del cargo inicial de alojamiento coincide con el que genera hoy `GuestAccountService.createAccountFromBooking`.
- La UI de check-in (mapa de habitaciones, listado) sigue funcionando igual.

## Estrategia de pruebas
1. Tests en emulador: caso feliz, reserva no `confirmed`, fallo simulado a mitad de transacción (verificar rollback completo).
2. Regresión manual: check-in desde el mapa de habitaciones y desde el listado de reservas.
3. Verificar que el dashboard financiero (`FinancialReportsService`, que lee Guest Accounts) sigue mostrando cifras correctas tras el cambio.

## Riesgos de regresión
Alto — check-in es un flujo diario crítico que además dispara la creación de un documento financiero (Guest Account). Mitigación: no retirar `BookingService.checkIn` actual hasta VERIFIED con prueba manual exhaustiva, incluyendo verificación del dashboard financiero.

---

## Tasks

### Task 07.1 — Confirmar si falta validación de estado de habitación en el check-in actual
- **Objetivo:** determinar si es un gap real a corregir o si la Function debe replicar el comportamiento actual tal cual (sin esa validación), para no cambiar comportamiento sin avisar.
- **Dependencias:** ninguna.
- **Validación:** hallazgo documentado y decisión del usuario antes de implementar.
- **Estado:** PENDING · requiere decisión del usuario.

### Task 07.2 — Implementar `registrarCheckIn` transaccional
- **Archivos afectados:** nuevo `functions/src/bookings/checkin.ts`.
- **Dependencias:** SPEC-03, SPEC-05, SPEC-06, Task 07.1.
- **Validación:** tests en emulador (caso feliz, rollback ante fallo simulado).
- **Estado:** PENDING

### Task 07.3 — Adaptar `BookingService.checkIn` en Angular
- **Archivos afectados:** `src/app/core/services/booking.service.ts`.
- **Dependencias:** Task 07.2.
- **Validación:** `ng build`; regresión manual en mapa de habitaciones y listado de reservas.
- **Riesgos de regresión:** alto.
- **Estado:** PENDING

### Task 07.4 — Regresión manual (incluye dashboard financiero) y aprobación del usuario
- **Dependencias:** Task 07.3.
- **Validación:** aprobación explícita, incluyendo verificación del dashboard financiero.
- **Estado:** PENDING

### Task 07.5 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 07.4 VERIFIED.
- **Estado:** PENDING
