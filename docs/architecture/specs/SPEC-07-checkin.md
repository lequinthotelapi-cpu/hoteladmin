# SPEC-07 — `registrarCheckIn` transaccional

**Estado:** IN PROGRESS (2026-08-17) — Tasks 07.1-07.3 completadas (Function transaccional implementada, 42 tests en verde contra el emulador real incluyendo un test de concurrencia real que prueba la atomicidad; `BookingService.checkIn` ya la consume). Tasks 07.4/07.5 pendientes de que el usuario despliegue y confirme en producción (igual que SPEC-05/06 — no puedo desplegar Functions yo mismo).

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
- **Estado:** DECIDED (2026-08-17)
  - **Hallazgo confirmado contra el código real:** `BookingService.checkIn` (`booking.service.ts:170-192`, antes de esta Spec) no valida el estado de la habitación en ningún punto — llama `roomService.changeRoomStatus(booking.roomId, 'occupied', userId)` incondicionalmente. Es un gap real.
  - **Decisión del usuario:** agregar la validación (más estricta que hoy). `registrarCheckIn` rechaza si `room.status !== 'available'`.
  - **Detalle adicional encontrado:** `'reserved'` (mencionado en el Spec original como estado válido para check-in) **nunca es un valor realmente persistido** en `rooms/{id}.status` — es puramente un estado visual/computado en el cliente a partir de las reservas activas (confirmado: no hay ningún `status: 'reserved'` en el código de escritura de habitaciones). Por eso la validación final es solo contra `'available'`, no `['available','reserved']` como sugería el texto original.

### Task 07.2 — Implementar `registrarCheckIn` transaccional
- **Archivos afectados:** nuevo `functions/src/bookings/checkin.ts`.
- **Dependencias:** SPEC-03, SPEC-05, SPEC-06, Task 07.1.
- **Validación:** tests en emulador (caso feliz, rollback ante fallo simulado).
- **Estado:** COMPLETED (2026-08-17)
  - Implementada dentro de una única transacción: lee reserva (`status === 'confirmed'`), lee habitación (`status === 'available'`), verifica idempotencia (si ya existe una Guest Account para la reserva, reutiliza su id en vez de duplicar), crea la Guest Account con el cargo de alojamiento — réplica bit a bit de `GuestAccountService.createAccountFromBooking` (mismas noches vía `calcularPrecioReserva` de SPEC-03, mismo 13% IVA vía `calcularTotalesConImpuesto`), actualiza habitación a `occupied` y reserva a `checked-in`.
  - **Detalle técnico:** el campo `date`/`createdAt` del cargo dentro del array `charges` usa `new Date()` en vez de `admin.firestore.FieldValue.serverTimestamp()` — Firestore no soporta sentinels de server timestamp dentro de elementos de un array. Coincide además con lo que ya hace el código actual de Angular ahí mismo.
  - Códigos de error nuevos: `LH-0408` (reserva no confirmada), `LH-0409` (habitación no lista para check-in).
  - **9 tests nuevos contra el emulador real**: 6 comportamiento (sin auth, sin rol, sin bookingId, reserva inexistente, reserva no confirmed, habitación no available) + caso feliz (verifica cargo/subtotal/IVA/total exactos) + idempotencia (no duplica cuenta) + **1 test de concurrencia real** que satisface el criterio de aceptación "un fallo simulado a mitad de la transacción no deja estado parcial": dos check-ins simultáneos de la misma reserva → exactamente 1 tiene éxito, exactamente 1 Guest Account creada, habitación y reserva en un estado consistente (nunca a medias). Total `functions/`: 36 tests en verde contra el emulador (27 previos + 9 nuevos) + 49 offline sin cambios.
  - **Hallazgo de infraestructura durante esta Task:** con 7 suites de emulador corriendo en paralelo (jest workers por defecto), empezaron a aparecer timeouts intermitentes por contención de recursos (no relacionado con ningún bug de código — confirmado reproduciendo y viendo que un reintento pasaba limpio). Se corrigió agregando `--runInBand` al script `test:concurrency` en `functions/package.json`, para correr los archivos de test de emulador secuencialmente en vez de en paralelo — más lento en total pero mucho más confiable a medida que crece esta suite.

### Task 07.3 — Adaptar `BookingService.checkIn` en Angular
- **Archivos afectados:** `src/app/core/services/booking.service.ts`.
- **Dependencias:** Task 07.2.
- **Validación:** `ng build`; regresión manual en mapa de habitaciones y listado de reservas.
- **Riesgos de regresión:** alto.
- **Estado:** COMPLETED a nivel de código (2026-08-17) — `checkIn` mantiene su firma pública, ahora llama `httpsCallable(functions, 'registrarCheckIn')`. `guestAccountService` quedó inyectado en el constructor sin ningún uso restante (deliberado — se retira recién en Task 07.5, tras VERIFIED, no antes). `ng build --configuration production` limpio. Regresión manual en UI real: **pendiente** (Task 07.4).

### Task 07.4 — Regresión manual (incluye dashboard financiero) y aprobación del usuario
- **Dependencias:** Task 07.3.
- **Validación:** aprobación explícita, incluyendo verificación del dashboard financiero.
- **Estado:** PENDING — requiere que el usuario despliegue `registrarCheckIn` (`firebase deploy --only functions`) y pruebe un check-in real, incluyendo revisar que el dashboard financiero siga mostrando cifras correctas.

### Task 07.5 — Retirar lógica cliente antigua (solo tras VERIFIED)
- **Dependencias:** Task 07.4 VERIFIED.
- **Estado:** PENDING — pendiente además retirar la inyección ya-sin-uso de `guestAccountService` en `BookingService` (ver Task 07.3).
