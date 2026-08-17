# SPEC-05 — `crearReserva` centralizada

**Estado:** COMPLETED (2026-08-17) — las 5 Tasks completadas. `crearReserva` desplegada y probada en producción real (`lequinthotel-ca6ef`) por el usuario, quien confirmó explícitamente que crear una reserva desde la UI funciona correctamente. Durante el camino se encontró y corrigió un bug crítico preexistente en `AuthService` que habría roto el login de todos los usuarios bajo la regla de SPEC-01 (ver addendum en `SPEC-01-cerrar-escalacion-privilegios.md`). `generateBookingNumber` (código muerto tras esta Spec) fue retirado. Pendiente real: `firestore.rules` de SPEC-01 sigue sin desplegar (bloqueado por Task 01.2, auditoría de Flutter — no relacionado con esta Spec). Ver hallazgos completos abajo.
**Naturaleza:** esta es la Spec "ejemplo" mencionada en el objetivo del proyecto (`crearReserva(datos)`) y la plantilla de convenciones para el resto de Functions de negocio (Specs 06-11).

## Objetivo
Crear la Cloud Function callable `crearReserva`, que Angular (y en el futuro Flutter y el agente IA) invoca en vez de escribir directo a Firestore, garantizando que la validación de capacidad, disponibilidad (Spec 04) y cálculo de precio (Spec 03) se ejecuten de forma atómica y sean idénticas para todos los consumidores.

## Problema actual
`BookingService.createBooking` (`booking.service.ts:20-72` aprox.) hace todo esto en el cliente, sin transacción: valida disponibilidad, valida capacidad, calcula precio, genera `bookingNumber` no atómico, y escribe. Cualquier cliente con credenciales de un usuario autenticado puede saltarse toda esta lógica escribiendo directo a `bookings` (las rules actuales lo permiten, ver hallazgo F.2.4).

## Comportamiento actual que debemos preservar
- Validación de capacidad: `totalGuests <= room.capacity`.
- Estado inicial de la reserva creada: `pending` (a confirmar contra el código exacto — Angular puede estar creando reservas ya en `confirmed` en algunos flujos, verificar antes de implementar).
- El mismo mensaje de error semántico que hoy ve el usuario cuando la habitación no está disponible o la capacidad no alcanza (Angular debe poder mostrar un error equivalente, no necesariamente idéntico en texto, pero sí en significado).
- Crear una reserva **no cambia el estado físico de la habitación** (regla explícita ya documentada y confirmada en código — la Function tampoco debe cambiarlo).

## Comportamiento esperado
Callable `crearReserva(datos: CrearReservaInput) → CrearReservaResult`, implementada con `runTransaction`:
1. Verifica `request.auth` y rol permitido (recepcionista o superior — confirmar jerarquía exacta con `DEFAULT_ROLE_PERMISSIONS`).
2. Valida datos de entrada (fechas, roomId, guestId, totalGuests).
3. Dentro de la transacción: llama `validarDisponibilidad` (Spec 04) y valida capacidad contra `rooms/{roomId}`.
4. Calcula precio con `calcularPrecioReserva` (Spec 03).
5. Obtiene `bookingNumber` con el contador atómico (Spec 02).
6. Crea el documento `bookings/{nuevoId}`.
7. Devuelve el booking creado (o un error de negocio claro si algo falla).

## Reglas de negocio
Las ya documentadas en `01-ANALISIS-Y-ARQUITECTURA.md` sección B.1: no-overlap, capacidad suficiente, solo habitaciones activas, no cambia estado físico de la habitación.

## Datos de entrada
`CrearReservaInput { roomId: string; guestId: string; checkInDate: Date; checkOutDate: Date; totalGuests: number; notes?: string }` — a confirmar campo por campo contra el DTO real usado hoy por `BookingService.createBooking` antes de fijar el contrato.

## Datos de salida
`CrearReservaResult { bookingId: string; bookingNumber: string; totalPrice: number; nights: number; status: 'pending' }`

## Validaciones
- `checkOutDate > checkInDate`.
- `totalGuests >= 1` y `<= room.capacity`.
- `room.isActive === true`.
- Disponibilidad (Spec 04).
- `guestId` existe.

## Permisos/autorización
Rol mínimo: a confirmar contra `DEFAULT_ROLE_PERMISSIONS` (probablemente `receptionist` o superior — housekeeper no debería poder crear reservas).

## Firestore collections/documents involucrados
`bookings` (escritura), `rooms` (lectura), `guests` (lectura de existencia), `counters` (Spec 02).

## Firebase Functions/API involucradas
`crearReserva` (nueva), usa internamente Spec 02, 03, 04.

## Dependencias
SPEC-02, SPEC-03, SPEC-04.

## Impacto en Angular
`BookingService.createBooking` debe adaptarse para llamar `httpsCallable(functions, 'crearReserva')` en vez de escribir Firestore directo. **Importante (principio de compatibilidad del usuario):** durante la transición, se recomienda que `BookingService` exponga temporalmente ambos caminos detrás de una bandera simple (o se cambie de una vez tras validar exhaustivamente en staging) — a decidir con el usuario en el diseño de la Task correspondiente, no asumir.

## Impacto potencial en Flutter
Si Flutter tiene su propia lógica de creación de reservas (no auditado en este análisis), quedaría com lógica paralela no centralizada hasta que se le indique consumir esta misma Function. Fuera del alcance de esta Spec auditar Flutter, pero se anota como trabajo de seguimiento natural tras validar esta Spec en Angular.

## Impacto potencial en n8n/agente IA
Esta es literalmente la Function que el agente invocará para el caso de uso del objetivo del proyecto ("Registra una reserva para Juan Pérez del 20 al 23"). No se conecta todavía (eso es Spec 14), pero el contrato debe diseñarse pensando en que un agente conversacional necesita poder pedir exactamente los campos de `CrearReservaInput` y entender los errores de `CrearReservaResult`/excepciones de forma no ambigua.

## Criterios de aceptación
- Dos llamadas concurrentes con fechas solapadas para la misma habitación: solo una tiene éxito.
- El precio calculado coincide con el que produce hoy `BookingService` para los mismos datos.
- El `bookingNumber` generado es único bajo concurrencia.
- Angular, tras adaptarse, sigue permitiendo crear una reserva desde la UI con el mismo resultado visible para el usuario que antes.
- Caller sin rol suficiente recibe `permission-denied`.

## Estrategia de pruebas
1. Tests de la Function en el emulador: caso feliz, capacidad insuficiente, habitación inactiva, fechas solapadas, caller sin rol, caller sin auth.
2. Test de concurrencia (ver criterios de aceptación).
3. Regresión manual en Angular contra el emulador: flujo completo de creación de reserva desde la UI de `features/private/bookings` y desde `calendar`, verificando que el resultado visible (número de reserva, precio, estado) es el mismo que antes del cambio.
4. Verificar que `RoomStatusService` (estado visual `reserved`) sigue funcionando correctamente con reservas creadas por la nueva Function (mismos campos que antes).

## Riesgos de regresión
Alto — es el flujo de negocio más usado de la aplicación. Mitigación: no retirar `BookingService.createBooking` (la lógica cliente actual) hasta que esta Spec esté en estado `VERIFIED` con prueba manual exhaustiva del usuario en los flujos reales de `bookings` y `calendar`.

---

## Tasks

### Task 05.1 — Confirmar el contrato exacto de entrada/salida contra el código actual
- **Objetivo:** fijar `CrearReservaInput`/`CrearReservaResult` leyendo el DTO real usado hoy, sin asumir campos.
- **Archivos afectados:** ninguno (lectura/documentación).
- **Dependencias:** ninguna.
- **Validación:** revisión manual comparando contra `booking.service.ts` y los componentes que llaman `createBooking` (`features/private/bookings`, `features/private/calendar`).
- **Riesgos de regresión:** ninguno.
- **Estado:** COMPLETED (2026-08-17)
  - **`CreateBookingDto` real** (`booking.model.ts:52-62`) es distinto de lo que asumía el texto del Spec: usa `adults: number` + `children: number` por separado (no un `totalGuests` combinado), y tiene `source: string` **requerido** (viene de `ParametersService.getOptions('reservationSources')`, una lista configurable en `parameters` — se acepta como string libre, igual que hoy, sin validarlo contra esa lista) más `specialRequests?`/`notes?` opcionales. `CrearReservaInput` replica ese DTO real, no el asumido.
  - **Estado inicial confirmado:** `status: 'pending'` en efecto (`booking.service.ts:87`) — la suposición del Spec era correcta en este punto.
  - **Rol mínimo confirmado contra `DEFAULT_ROLE_PERMISSIONS`** (`role-permission.model.ts`): la ruta `/bookings` la tienen `receptionist`, `manager`, `admin`, `superadmin` — no solo "receptionist o superior" como sugería el texto (`manager` también). `housekeeper`/`guest` no la tienen. `crearReserva` usa exactamente ese set de 4 roles.
  - `CrearReservaResult` se mantiene igual a lo propuesto: `{ bookingId, bookingNumber, totalPrice, nights, status: 'pending' }`.

### Task 05.2 — Implementar `crearReserva` en Functions
- **Objetivo:** Function callable transaccional completa.
- **Archivos afectados:** nuevo `functions/src/bookings/crear-reserva.ts`, `functions/src/index.ts` (export).
- **Dependencias:** Task 05.1, SPEC-02, SPEC-03, SPEC-04.
- **Validación:** tests en emulador (ver estrategia de pruebas).
- **Riesgos de regresión:** ninguno todavía (sin consumidor real).
- **Estado:** COMPLETED (2026-08-17)

  **Implementación:** `functions/src/bookings/crear-reserva.ts`, exportada desde `index.ts`. Dentro de una única `runTransaction`: lee habitación+huésped (`tx.getAll`, no `Promise.all([tx.get(a), tx.get(b)])` — ver nota de antipatrón abajo), valida existencia/`isActive`/capacidad, llama `validarDisponibilidad` (SPEC-04), calcula precio con `calcularPrecioReserva` (SPEC-03, decisión de Task 03.1: sin IVA), obtiene `bookingNumber` con `getNextSequence` (SPEC-02, firma cambiada a esta Spec — ver addendum en `SPEC-02-contador-atomico.md`), y escribe el documento `bookings/{nuevoId}`. Notificar a recepcionistas queda **fuera de esta Function** — sigue siendo responsabilidad de Angular después de invocarla con éxito (el "Comportamiento esperado" original de la Spec tampoco lo listaba entre sus 7 pasos).

  Se agregaron códigos de error nuevos a `shared/errors.ts` dentro de los rangos ya reservados en SPEC-00 (`LH-0300/0301` validación, `LH-0400/0404` negocio).

  **Hallazgo 1 — antipatrón `Promise.all(tx.get(), tx.get())`:** durante las pruebas de concurrencia se investigó a fondo un fallo real (ver Hallazgo 2 abajo) y, como parte de esa investigación, se corrigió `Promise.all([tx.get(roomRef), tx.get(guestRef)])` a `tx.getAll(roomRef, guestRef)` — llamar `tx.get()` concurrentemente sobre la misma `Transaction` es un antipatrón documentado de Firestore. Se descartó como causa del fallo real (un diagnóstico aislado con lecturas concurrentes tampoco lo reproducía), pero se dejó corregido por ser la práctica correcta.

  **Hallazgo 2 — contradicción real entre el criterio de aceptación de esta Spec y una regla ya decidida en SPEC-04 (requirió decisión del usuario, no se resolvió unilateralmente):** el criterio "dos llamadas concurrentes con fechas solapadas: solo una tiene éxito" resultó **incompatible** con el hecho de que `crearReserva` siempre crea la reserva en `pending`, y `validarDisponibilidad` (SPEC-04, ya decidido y probado) solo bloquea contra `confirmed`/`checked-in` — exactamente igual que hoy en Angular. Investigado con un diagnóstico aislado contra el emulador real (varias transacciones sintéticas con distintas combinaciones de lecturas/escrituras) antes de concluir que **no era un bug de Firestore ni de mi transacción**, sino el comportamiento correcto y ya decidido: dos reservas `pending` solapadas pueden coexistir hoy mismo en Angular (la única "protección" que existe hoy es la latencia del cliente, no una garantía real). Se le presentó la contradicción al usuario explícitamente — **decisión: mantener el comportamiento actual** (pending no bloquea pending); el bloqueo real contra overbooking queda para Spec 06 (`confirmarReserva`), que sí deberá re-validar disponibilidad antes de pasar una reserva a `confirmed`. El test de concurrencia se corrigió para reflejar esto y se añadió un test específico de que una reserva **ya `confirmed`** sí bloquea intentos concurrentes de solapamiento (eso sí se garantiza).

  **17 tests en verde contra el emulador real** (`npm run test:concurrency`, incluye SPEC-02/04 + esta Spec):
  - `crear-reserva.emulator.test.ts` (10): sin auth, sin rol suficiente, fechas inválidas, habitación inexistente, habitación inactiva, huésped inexistente, capacidad excedida, solapa con reserva `confirmed` existente, caso feliz (precio/bookingNumber/estado correctos, campos del documento verificados), los 4 roles con acceso a `/bookings` pueden crear reservas.
  - `crear-reserva.concurrency.test.ts` (3): dos `pending` solapadas concurrentes → ambas tienen éxito (comportamiento decidido), una `confirmed` existente bloquea intentos concurrentes de solapamiento, `bookingNumber` único bajo 10 llamadas concurrentes en habitaciones distintas el mismo día.
  - Offline (`npm test`, 49 tests totales en `functions/`): sin tests unitarios mockeados de `crearReserva` en sí (se decidió no armar un mock grande y frágil de una transacción con 4 piezas compuestas — la propia estrategia de pruebas del Spec pedía tests contra el emulador para los casos de comportamiento, que es lo que se hizo).

  `npm run build` limpio; `lib/` no incluye archivos de test (`*.test.ts`, `*.concurrency.test.ts`, `*.emulator.test.ts` todos excluidos).

### Task 05.3 — Adaptar `BookingService.createBooking` en Angular para consumir la Function
- **Objetivo:** cambiar la implementación interna del método público, sin cambiar su firma pública si es posible (para no tocar los componentes que lo consumen).
- **Archivos afectados:** `src/app/core/services/booking.service.ts`.
- **Dependencias:** Task 05.2.
- **Validación:** `ng build` sin errores; regresión manual en `features/private/bookings` y `features/private/calendar`.
- **Riesgos de regresión:** alto — es el punto donde el cambio se vuelve visible para usuarios reales. No desplegar a producción sin regresión manual completa aprobada por el usuario.
- **Estado:** COMPLETED a nivel de código (2026-08-17); regresión manual completa vía UI real NO lograda — ver detalle abajo. **Decisión del usuario:** reemplazo directo (no bandera dual), validado contra el emulador antes de pedir confirmación.
  - `createBooking(dto, userId)` mantiene su firma pública exacta (los componentes que lo llaman no cambiaron). Internamente ahora llama `httpsCallable(functions, 'crearReserva')`, propaga `error.message` de la Function tal cual (ya alineado en significado con los mensajes que este método lanzaba antes), y conserva la notificación a recepcionistas después del éxito (sigue en Angular, no se migró a la Function — ver nota en `crear-reserva.ts`). `userId` queda sin usar internamente (el creador se deriva de `request.auth` server-side) pero se mantiene en la firma para no romper callers.
  - `ng build --configuration production` limpio tras el cambio. No se pudo correr `ng lint` — no hay target `lint` configurado en `angular.json` pese a que `tslint.json` existe (gap preexistente del proyecto, no introducido aquí, mismo patrón que el gap de `ng test` ya documentado en SPEC-00).
  - **Se montó infraestructura nueva para poder probar esto de verdad** (no solo con `ng build`): flag `environment.useEmulators` (default `false`, forzado `false` también en `environment.prod.ts`) + wiring condicional de `connectAuthEmulator`/`connectFirestoreEmulator`/`connectFunctionsEmulator` en `app.module.ts` + puertos de emulador `functions`/`auth`/`ui` añadidos a `firebase.json`. Con el flag en `false` (su estado en el repo ahora), cero cambio de comportamiento.
  - **Hallazgo crítico durante esta verificación, no relacionado con esta Task pero que la bloqueaba:** un bug preexistente real en `AuthService` (`setDoc(...,{merge:true})` con claves punteadas no crea un mapa `sessions` anidado) que habría roto el login de todo usuario bajo la regla nueva de SPEC-01. Se investigó, encontró y corrigió — ver el addendum completo en `SPEC-01-cerrar-escalacion-privilegios.md`. Tras el fix, el login del usuario de prueba funcionó correctamente en el navegador real contra el emulador.
  - **Lo que NO se logró verificar:** el envío real del formulario de "Nueva Reserva" desde la UI. La pestaña de Chromium headless crasheó/se colgó de forma no determinística al navegar a `/bookings` en el sandbox de esta sesión, incluso tras liberar memoria (bajó de ~1.8GB a ~4GB libres y volvió a fallar igual) — sin ningún error de consola ni rechazo de Firestore capturado en ningún intento, lo que sugiere una limitación de recursos del entorno compartido (compitiendo con VS Code Server + emuladores + `ng serve` + Chromium a la vez) más que un bug de la app, pero no se puede afirmar con certeza. La Function `crearReserva` en sí ya tiene 17/17 tests en verde contra el emulador real (SPEC-05, Task 05.2) con el mismo shape de payload que `BookingService` ahora envía, y el login (la pieza de mayor riesgo) sí quedó verificado en vivo — pero la Task 05.4 (regresión manual completa + aprobación del usuario) sigue pendiente de verdad.

### Task 05.4 — Regresión manual completa y aprobación del usuario
- **Objetivo:** confirmar en un entorno real/staging que crear reservas sigue funcionando igual (incluyendo casos límite: overlap, capacidad, habitación inactiva).
- **Archivos afectados:** ninguno (prueba).
- **Dependencias:** Task 05.3.
- **Validación:** aprobación explícita del usuario.
- **Riesgos de regresión:** N/A (es la validación misma).
- **Estado:** VERIFIED (2026-08-17) — el usuario probó el flujo real: `ng serve` local (`environment.useEmulators: false`) contra el proyecto real `lequinthotel-ca6ef`, con `crearReserva` ya desplegada en Functions (deploy manual del usuario, ver historial de la conversación). Login con usuario real, creación de reserva desde la UI de `features/private/bookings` → **éxito confirmado explícitamente por el usuario** ("Funciono la reserva"). Nota: esta prueba fue contra Firebase real, no contra staging (no existe un proyecto de staging separado) — la reserva de prueba quedó persistida en datos reales. `firestore.rules` sigue sin desplegar (bloqueado por Task 01.2, sin relación con `crearReserva`, que usa Admin SDK y no depende de las rules del cliente).

### Task 05.5 — Retirar la lógica cliente antigua (solo tras VERIFIED)
- **Objetivo:** limpiar el código de validación/cálculo que ya no se usa en `BookingService`, una vez confirmado que la Function es la única vía.
- **Archivos afectados:** `src/app/core/services/booking.service.ts`, posiblemente `booking-firebase.repository.ts` (método de overlap ya no usado desde Angular).
- **Dependencias:** Task 05.4 en estado VERIFIED.
- **Validación:** `ng build`, `ng test`, regresión manual final.
- **Riesgos de regresión:** bajo si se hace después de VERIFIED; **no ejecutar esta Task antes** de esa confirmación (principio de compatibilidad del usuario: no retirar código viejo hasta demostrar que el nuevo funciona).
- **Estado:** COMPLETED (2026-08-17)
  - Se verificó que `checkRoomAvailability` y `calculateNights` **siguen en uso real** por `updateBooking` (cambio de fechas de una reserva existente, todavía client-side, fuera del alcance de SPEC-05) y `searchAvailableRooms` (búsqueda de disponibilidad, de solo lectura) — no se tocaron.
  - `generateBookingNumber()` (el generador no atómico de `bookingNumber`, reemplazado por `getNextSequence` en SPEC-02/`crearReserva`) ya no tenía ningún caller — confirmado con `grep` en todo `src/`. Se eliminó.
  - `booking-firebase.repository.ts`'s `getOverlappingBookings` (el método de overlap client-side) **sigue en uso** — lo consume indirectamente `checkRoomAvailability`, que a su vez sigue viva por `updateBooking`/`searchAvailableRooms`. No se tocó.
  - `ng build --configuration production` limpio tras el cambio. `ng test` no se corrió (gap preexistente ya documentado en SPEC-00 — `ng test` está roto en este proyecto por causas ajenas a este backlog).
