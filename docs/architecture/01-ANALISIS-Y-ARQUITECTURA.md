# Análisis de arquitectura y propuesta de migración incremental

**Fecha del análisis:** 2026-08-16
**Alcance:** `lequintweb` (Angular 16 + Firebase), con vista hacia `lequintmobile` (Flutter) y el futuro agente de IA (n8n + WhatsApp).
**Estado:** FASE 1 — solo análisis. No se ha modificado código de la aplicación.
**Metodología:** lectura directa de código fuente (servicios, repositorios, guards, `firestore.rules`, `functions/src/index.ts`) mediante tres exploraciones dirigidas. La documentación `.md` existente en la raíz del repo (`CONTEXTO.md`, `PERMISSIONS_SYSTEM.md`, etc.) se usó solo como pista inicial — **está desactualizada en varios puntos** (ver hallazgo en sección F) y no se tomó como fuente de verdad.

Este documento cubre las secciones A–K solicitadas. La lista de Specs y Tasks (SDD) vive en [`02-SPECS-BACKLOG.md`](./02-SPECS-BACKLOG.md) y en los archivos individuales de `specs/`.

---

## A. Arquitectura actual

```
┌─────────────────┐
│  Angular 16 Web  │  src/app/{core,domain,infrastructure,application,features}
│  (lequintweb)    │  Toda la lógica de negocio vive aquí
└────────┬─────────┘
         │ SDK cliente de Firebase (@angular/fire)
         │ lectura/escritura DIRECTA a Firestore, sin pasar por backend
         ▼
┌─────────────────┐        ┌──────────────────────────┐
│    Firestore     │◄──────┤  Firebase Functions        │
│  (17 colecciones) │       │  1 sola función: forceLogoutUser│
└─────────────────┘        │  (admin-only, no negocio) │
         ▲                  └──────────────────────────┘
         │ protegido solo por firestore.rules
         │ (casi todo: "if isAuthenticated()")
┌─────────────────┐
│ Flutter Mobile   │  (lequintmobile) — consume el mismo backend,
│ (lequintmobile)  │  arquitectura no auditada en este análisis
└─────────────────┘

┌─────────────────┐
│  n8n + Agente IA │  NO EXISTE TODAVÍA. Si se conectara hoy directo a
│  (futuro)        │  Firestore, heredaría todos los huecos de la sección F.
└─────────────────┘
```

**Patrón de capas documentado en `CLAUDE.md`** (repository pattern, migración parcial):
`Components (features/*, layout/*) → Services (core/services, application/services) → Repositories (domain/repositories abstracto + infrastructure/ o core/repositories) → Firestore`

**Realidad verificada en código:** el patrón de capas existe, pero **no aporta ningún aislamiento de seguridad ni de integridad** — es una organización de código en el cliente, no una frontera de confianza. Todo lo que un `Service` de Angular hace, cualquier cliente con las credenciales de un usuario autenticado puede hacerlo directamente contra Firestore sin pasar por esos servicios (ver sección F).

**Backend real actual:** prácticamente inexistente. Firebase Functions contiene **una sola función** (`forceLogoutUser`, `functions/src/index.ts:10-60`), de tipo administrativo (revocar tokens), no de dominio hotelero. No hay triggers de Firestore, no hay funciones programadas, no hay validación de negocio server-side.

---

## B. Inventario de lógica de negocio encontrada

Toda la lógica descrita a continuación vive en `src/app/core/services/*.service.ts` (y algunos en `application/services/`), ejecutándose **enteramente en el cliente Angular**, sin transacciones atómicas de Firestore salvo en `auth.service.ts`.

### B.1 Bookings (reservas) — `core/services/booking.service.ts`
- Validación de disponibilidad (no-overlap) antes de crear/editar (`:44-52`, `:114-127`).
- Validación de capacidad: huéspedes ≤ `room.capacity` (`:59-62`).
- Cálculo de precio: `basePrice × noches` (`:65-66`, `:130-131`).
- Generación de `bookingNumber` = `BK-YYYYMMDD-XXX` con sufijo **aleatorio, no atómico** (`:325-333`) → riesgo de colisión.
- Máquina de estados: `pending → confirmed → checked-in → checked-out` (+ `cancelled`/`no-show`), validada en cada transición (`:156-215`).
- **Check-in** (`:176-198`): crea Guest Account + cambia habitación a `occupied` + reserva a `checked-in`, en 3 escrituras **no transaccionales**.
- **Check-out** (`:200-215`): habitación a `dirty`, reserva a `checked-out`.
- Overlap de fechas resuelto en `booking-firebase.repository.ts:154-185` trayendo todas las reservas de la habitación y filtrando en cliente — **no atómico**, riesgo real de overbooking con dos reservas concurrentes.

### B.2 Guest Accounts (cargos, pagos, IVA) — `core/services/guest-account.service.ts`
- IVA **13% hardcodeado dos veces** (`:60` y `:197`).
- `addCharge`/`removeCharge`: solo si cuenta `open` (`:86-135`).
- `addPayment`: pago no puede exceder saldo pendiente (`:144-146`).
- `closeAccount`: exige `balance === 0` (`:182-184`).
- Arrays `charges[]`/`payments[]` se leen, mutan en memoria y sobrescriben completos — **no atómico**, riesgo de condición de carrera con cargos/pagos simultáneos.

### B.3 Pricing / IVA
- No existe un servicio de "pricing" centralizado. La fórmula `basePrice × noches` está duplicada entre `BookingService` (sin IVA) y `GuestAccountService` (con IVA 13%) — **dos fuentes de verdad para el mismo cálculo**.
- POS calcula subtotal/IVA/total en el **componente de UI**, no en un servicio (no se encontró lógica de impuestos en `pos.service.ts`).

### B.4 Rooms / estados de habitación — `core/services/room.service.ts`, `room-status.service.ts`
- Número de habitación único (`:68-77` del repo).
- Validaciones de rango: `floor≥1`, `capacity≥1`, `basePrice≥0`.
- `changeRoomStatus` **no valida transiciones** — acepta cualquier string.
- `checkoutGuest()` (`:73-79`) pone la habitación en `cleaning`, **contradice** el flujo real de checkout (`BookingService.checkOut` pone `dirty`) — código huérfano/inconsistente.
- Estado visual `reserved` (no persistido): calculado en memoria por `RoomStatusService` combinando `rooms` + `bookings` del día.

### B.5 Housekeeping — `core/services/housekeeping.service.ts`
- Validaciones de duración, transición `pending → in-progress → completed`, creación automática de tarea de mantenimiento si `requiresMaintenance`.
- `createTaskFromCheckout` (`:109-132`) existe pero **no se encontró invocada** desde `BookingService.checkOut` → gap funcional a confirmar con negocio antes de asumir automatización.
- `delete` de movimientos de inventario está bloqueado por diseño (ledger append-only) — buena práctica ya existente.

### B.6 POS / ventas — `core/services/pos.service.ts`
- Valida producto activo y stock suficiente, exige caja abierta del cajero.
- Descuenta stock en loop secuencial **no atómico** tras crear la venta — mismo patrón de riesgo que overbooking, pero para inventario (venta doble puede dejar stock negativo).
- Sin rollback si falla un paso intermedio.

### B.7 Cash register / caja — `core/services/cash-register.service.ts`, `transaction.service.ts`
- Prohíbe abrir 2 cajas simultáneas para el mismo usuario.
- Calcula `difference = finalAmount - expectedAmount` al cerrar (única auditoría de descuadre).
- Dos mecanismos distintos de mantener totales (recálculo completo vs. `increment()` atómico por campo) conviviendo — riesgo de inconsistencia, requiere aclarar cuál es la fuente de verdad.

### B.8 Invoices (facturación) — `core/services/invoice.service.ts`
- `invoiceNumber` = `FAC-YYYYMM-XXXX`, generado **contando documentos del mes + 1** — no atómico, mismo riesgo de colisión que `bookingNumber`.
- Solo factura cuentas `closed` con `balance === 0`.
- `cancelInvoice` es la única forma prevista de "anular" — pero nada impide editar una factura ya emitida vía Firestore directo (ver sección F).

### B.9 Inventory — `product.service.ts`, `inventory-movement.service.ts`
- Validación de código único, stock ≥ 0, `price ≥ cost`.
- Movimiento de inventario y actualización de stock del producto son **dos escrituras separadas sin transacción**.

### B.10 Users / Employees / Auth — `user.service.ts`, `auth.service.ts`
- `AuthService.signIn`/`signOut`/`cleanupInactiveSessions` **sí usan `runTransaction`** — es el único punto del código cliente con atomicidad real (control de sesiones concurrentes, `maxSessions`, heartbeat).
- `UserService.createUser` usa una app de Firebase secundaria para crear usuarios sin desloguear al admin (patrón correcto dado que no hay backend).
- `deleteUser` reconoce explícitamente en el propio código (comentario) que **no puede borrar de Firebase Auth desde el cliente** — gap ya identificado por el equipo, requiere Cloud Function.
- `forceLogoutUser`: única lógica de negocio ya centralizada en backend (ver sección C).

---

## C. Firebase Functions existentes y sus responsabilidades

**Todo el backend de Functions se reduce a un archivo, `functions/src/index.ts` (61 líneas), con una sola función exportada.**

### `forceLogoutUser` (`functions/src/index.ts:10-60`)
- Trigger: `onCall` (HTTPS Callable, Functions v2).
- Requiere `request.auth` y rol `admin`/`superadmin` del caller (verificado leyendo `users/{callerUid}` con Admin SDK, no custom claims).
- Regla adicional: nadie salvo un `superadmin` puede forzar logout a otro `superadmin`.
- Ejecuta con Admin SDK (bypass de Firestore Rules): `admin.auth().revokeRefreshTokens(uid)` + resetea `users/{uid}.sessions/activeSessionsCount/hasActiveSession`.
- Único caller: `AuthService.forceLogoutUser()` (`auth.service.ts:392-395`) ← `UserService` ← `UsersListComponent`.

**Esto es exactamente el tipo de operación que las Security Rules no pueden hacer de forma segura por sí solas (revocar tokens de Auth), y es el único ejemplo end-to-end de "callable de negocio bien hecho" que existe hoy — útil como plantilla de convenciones para las nuevas Functions.**

**No existe:** ningún trigger de Firestore, ninguna función programada (`onSchedule`), ninguna función de dominio hotelero (reservas, cuentas, facturación, inventario, caja). El runtime es Node 20 (deprecado en 2026-04-30 según `FUNCTIONS_DEPLOYED.md`) — se recomienda actualizar el runtime como parte de la infraestructura base, no como blocker.

---

## D. Lógica que debería permanecer en Angular (y en Flutter)

No todo debe moverse a Functions. Deben quedarse en el cliente:

- **Presentación y estado de UI**: componentes, formularios, diálogos, vistas de mapa SVG de habitaciones, gráficos del dashboard.
- **Estado visual calculado y no persistido**: `RoomStatusService` (estado `reserved` en tiempo real) puede seguir calculándose en cliente por rendimiento/UX, siempre que la fuente de datos (`bookings`, `rooms`) llegue ya validada del backend. No es una regla de negocio que otros consumidores necesiten replicar — Flutter y el agente IA no necesitan "ver" el mapa de habitaciones de la misma forma.
- **Validaciones de formulario de primer nivel** (campo requerido, formato, rangos básicos en UI) — mejoran UX pero **no reemplazan** la validación server-side, que sigue siendo obligatoria.
- **Orquestación de navegación y guards de UI** (ocultar botones, secciones del menú) — siguen siendo útiles como capa cosmética, pero dejan de ser la única protección una vez migrada cada operación.
- **Generación de PDF/impresión** (facturas, tickets) — es una responsabilidad de presentación específica del cliente web, no de negocio compartido.
- **Caché local, `localStorage`, heartbeat de sesión del lado del navegador**.

No se propone reescribir estas partes.

---

## E. Lógica que debería centralizarse en Firebase/backend

Priorizado por impacto (riesgo de datos inconsistentes o de seguridad) y por ser candidata directa a "misma operación desde Angular, Flutter y el agente IA":

1. **Generación de identificadores secuenciales** (`bookingNumber`, `invoiceNumber`) — hoy no atómica, colisiona bajo concurrencia. Es una pieza pequeña y reusable, buen punto de partida.
2. **Cálculo de precio/IVA** — fórmula única `calcularTotales(subtotal) → {tax, total}` y `calcularPrecioReserva(room, fechas)`, hoy duplicada y con inconsistencias (IVA solo se aplica en un sitio).
3. **Validación de disponibilidad de habitación** (overlap) — hoy es la fuente más clara de riesgo de overbooking real; debe ejecutarse dentro de una transacción server-side.
4. **`crearReserva` / `confirmarReserva` / `cancelarReserva`** — orquesta 1-3, debe ser la operación de ejemplo mencionada en el objetivo del proyecto (`crearReserva(datos)`).
5. **`checkIn` / `checkOut`** — flujo multi-documento (reserva + habitación + cuenta) que hoy no es atómico; candidato natural a `runTransaction` en una Function.
6. **Cargos/pagos/cierre de Guest Account** — mismas razones que 5, más el riesgo de que hoy cualquier autenticado pueda escribir `balance:0` directo en Firestore (ver F).
7. **Emisión de facturas** — numeración + inmutabilidad post-emisión deben protegerse en backend; hoy nada impide editar una factura ya emitida.
8. **Venta POS (stock + venta + caja)** — mismo patrón de condición de carrera que reservas, aplicado a inventario.
9. **Operaciones administrativas sensibles sobre `users`**: cambio de rol, activar/desactivar cuenta, borrado en Firebase Auth (ya reconocido como gap en el propio código) — deben ser exclusivamente server-side, nunca escritura directa de cliente al documento `users`.

Estas 9 áreas son la base del backlog de Specs (sección H y `02-SPECS-BACKLOG.md`).

---

## F. Problemas y riesgos encontrados

### F.1 Riesgos de integridad de datos (concurrencia)
- **Overbooking real**: creación de reservas sin transacción atómica sobre la comprobación de solapamiento (`booking-firebase.repository.ts:154-185`).
- **Stock negativo / doble venta**: validación de stock y descuento de stock separados en el tiempo, sin transacción (`pos.service.ts`, `inventory-movement.service.ts`).
- **Colisión de numeración**: `bookingNumber` (aleatorio) e `invoiceNumber` (conteo+1) no son atómicos.
- **Cargos/pagos concurrentes** en Guest Accounts: lectura-modificación-escritura de arrays completos, sin `arrayUnion`/transacción.
- **Doble mecanismo de totales de caja** (recálculo completo vs. `increment()`) sin que quede claro cuál es la fuente de verdad.

### F.2 Riesgos de seguridad (los más graves — accionables independientemente del proyecto de migración)

> Hallazgo importante: **`CONTEXTO.md` documenta unas `firestore.rules` distintas de las reales** (ej. dice que `rooms` requiere admin para escribir; el archivo real permite escritura a cualquier autenticado). No confiar en la documentación del repo para decisiones de seguridad — se verificó `firestore.rules` línea por línea.

1. **🔴 CRÍTICO — Escalación de privilegios**: `firestore.rules:20` permite `allow update: if isAdmin() || request.auth.uid == userId` **sin restricción de campos**. Cualquier usuario autenticado puede escribir `role: 'admin'` (o `superadmin`) en su propio documento vía SDK de Firestore directo, sin pasar por ninguna UI ni guard, y tomar control total del sistema. También puede reactivar su cuenta desactivada, subir su propio `maxSessions`, o modificar su `salary`.
2. **🔴 CRÍTICO — RBAC no aplicado realmente**: `PermissionGuard` no está cableado en ninguna ruta (`app-routing.module.ts`); `RoleGuard` está roto (retorna `true` de forma síncrona antes de que la comprobación asíncrona de rol surta efecto) y tampoco está cableado. La única protección real de rutas privadas es "estar autenticado" — cualquier rol puede navegar a `/users`, `/permissions`, `/reports`, etc. El sidenav que oculta opciones por rol es **puramente cosmético**.
3. **🟠 ALTO — Exposición de PII de todo el staff**: `firestore.rules:18` permite `read` de toda la colección `users` a cualquier autenticado, sin exclusión de campos — expone `salary`, `document`, `phone`, `emergencyContact`, `sessions` de todos los empleados a cualquier rol, incluido el más bajo.
4. **🟠 ALTO — Reglas de negocio no replicadas en `firestore.rules`**: no-overlap de reservas, tope de pago vs. saldo, cierre de cuenta solo con saldo 0, inmutabilidad de facturas emitidas — todo esto vive solo en TypeScript de Angular y se puede saltar con una escritura directa a Firestore.
5. **🟡 MEDIO — `transactions` con `delete` abierto** a cualquier autenticado (única colección financiera sin restringir a admin) — permite borrar rastro de caja/pagos.
6. **🟡 MEDIO — `storage.rules` con `read: if true`** (público) y `write` a cualquier autenticado en avatares, fotos de huéspedes/productos y **comprobantes de gastos**, sin límite de tamaño/tipo ni verificación de propietario.
7. **🟡 MEDIO — `AuthGuard` no revalida `active`/`activeUntil`/`role`** en cada navegación; desactivar un usuario no invalida su sesión ya iniciada hasta que un admin ejecute `forceLogoutUser` explícitamente.
8. **🟢 BAJO (pero relevante para el futuro agente IA)**: si n8n opera con una service account (Admin SDK), ignora las rules por completo — control total. Si opera con credenciales de un usuario normal, hereda los 4 huecos anteriores. Hoy no existe ninguna Function de dominio a la que el agente pueda llamar de forma segura salvo `forceLogoutUser` (que no es de negocio hotelero).

**Implicación directa para el proyecto**: la sección "Seguridad" del objetivo del usuario (no ocultar en frontend, proteger en backend) hoy **no se cumple en absoluto** — ni siquiera para Angular. Esto no es solo un problema para el futuro agente IA; es una vulnerabilidad activa en producción, independiente de si se construye o no el backend común. Se recomienda tratar el punto 1 (escalación de privilegios) como corrección de seguridad urgente y de bajo riesgo de romper funcionalidad (ver Spec 01), separable del resto del roadmap.

### F.3 Duplicación de código real (no solo de patrón)
- **`Product`**: dos implementaciones Firestore completas y paralelas (`core/repositories/product-firebase.repository.ts`, usado realmente, vs. `infrastructure/repositories/firebase-product.repository.ts`, registrado en DI pero sin consumidores — código muerto).
- **`UserService`**: dos clases con el mismo nombre (`core/services/user.service.ts`, usado; `application/services/user.service.ts`, sin ningún import en todo el repo — código muerto).
- El resto de "duplicación" percibida entre `domain/` y `core/repositories/` es el patrón híbrido ya documentado en `CLAUDE.md` (contrato nuevo + implementación aún en carpeta legacy), no una segunda implementación redundante.
- **No se propone limpiar este código muerto como parte de este proyecto** salvo que estorbe directamente a una migración concreta (ver principio "no reescribir lo que no hace falta").

### F.4 Inconsistencias funcionales a confirmar con negocio (no asumir, preguntar antes de tocar)
- `RoomService.checkoutGuest()` pone la habitación en `cleaning`; el flujo real de checkout (`BookingService.checkOut`) pone `dirty`. Parece código huérfano, pero antes de eliminarlo o "arreglarlo" hay que confirmar si algo lo usa desde la UI.
- `HousekeepingService.createTaskFromCheckout` no está conectada al flujo real de checkout — puede ser intencional (tarea manual) o un gap. Confirmar antes de "automatizar" en la Function de checkout.
- Timeout de sesión inactiva: 15 min hardcodeado en `signIn` vs. 5 min por defecto en `cleanupInactiveSessions` — inconsistencia menor a aclarar.

---

## G. Propuesta de arquitectura futura

```
Angular (lequintweb) ──┐
                        │  Firebase Auth (ID token)
Flutter (lequintmobile)─┼──►  Cloud Functions (callable) ──► Firestore
                        │      "capa de negocio única"        (con rules
n8n + Agente IA ────────┘      valida rol/permiso,             endurecidas,
   (vía Function callable      valida datos,                    solo-backend
    HTTPS con API key o        aplica reglas de negocio,        en operaciones
    cuenta de servicio          ejecuta en runTransaction,       sensibles)
    dedicada de bajo             usa Admin SDK)
    privilegio)
```

### Principios de la arquitectura objetivo
1. **Una operación de negocio = una Cloud Function callable**, con nombre orientado a negocio (`crearReserva`, `confirmarReserva`, `registrarCheckIn`, `agregarCargoCuenta`, `emitirFactura`, `registrarVentaPOS`), no CRUD genérico. Esto es literalmente lo que pide el objetivo del usuario: `crearReserva(datos)`.
2. **Cada Function**: (a) valida `request.auth` y rol/permiso vía Firestore (igual patrón que `forceLogoutUser`, no custom claims por ahora — evita un cambio arquitectónico adicional no solicitado), (b) valida los datos de entrada, (c) aplica las reglas de negocio ya identificadas en la sección B, (d) ejecuta los cambios en `runTransaction` cuando toque más de un documento, (e) devuelve un resultado tipado.
3. **Firestore deja de ser escribible directamente por los clientes** para las colecciones de negocio críticas, de forma progresiva (colección por colección, spec por spec — no en un solo cambio masivo). Mientras una colección no haya migrado, sus rules actuales se mantienen intactas (principio de compatibilidad del usuario).
4. **Contratos compartidos**: los tipos de entrada/salida de cada Function (`CrearReservaInput`, `CrearReservaResult`, etc.) se definen una sola vez y se publican como el "contrato" que Angular, Flutter (vía generación o documentación equivalente) y n8n consumen. No implica necesariamente un paquete npm compartido de entrada — puede empezar como documentación de contrato + validación server-side, y evolucionar a paquete compartido si el equipo lo decide más adelante (fuera del alcance de esta fase).
5. **El agente IA nunca ejecuta lógica de negocio ni Firestore directo.** Solo: interpreta intención → recopila datos → llama una Function callable existente (la misma que usa Angular) → devuelve el resultado al empleado por WhatsApp. Esto garantiza que una reserva creada desde Angular, Flutter o el agente sigue exactamente las mismas reglas, por construcción (es la misma función).
6. **Autenticación del agente IA**: no debe compartir credenciales de un usuario humano. Recomendado: una cuenta de servicio/usuario técnico dedicado en Firebase Auth con un rol propio y acotado (p. ej. `ai-agent`), cuyos permisos en `rolePermissions`/reglas se limiten exactamente a las Functions que necesita invocar. Esto se define en la Spec de integración n8n (sección H), no se implementa todavía.
7. **Firebase Authentication sigue siendo el proveedor de identidad** para los tres clientes; no se propone reemplazarlo.

### Qué va dónde (resumen)

| Capa | Responsabilidad |
|---|---|
| **Angular** | UI, estado visual no persistido, formularios, PDFs, navegación, llamadas a Functions |
| **Flutter** | Igual que Angular, adaptado a mobile; consumidor de las mismas Functions |
| **Firebase Functions** | Única fuente de verdad de reglas de negocio: validación, cálculo, transiciones de estado, atomicidad, autorización real |
| **Firestore** | Persistencia; rules como segunda barrera (defensa en profundidad), no como única barrera, para las colecciones migradas |
| **Firebase Authentication** | Identidad y rol base; sin cambios de proveedor |
| **n8n / Agente IA** | Interpretar intención en lenguaje natural, recopilar datos faltantes, invocar Functions existentes; cero lógica de negocio propia |

---

## H. Plan de migración incremental

Ver desglose completo de Specs y Tasks en [`02-SPECS-BACKLOG.md`](./02-SPECS-BACKLOG.md). Resumen de fases:

- **Fase 0 — Fundamentos**: estructura y convenciones del backend compartido en Functions (auth/rol helper, manejo de errores, testing), sin tocar ninguna funcionalidad existente.
- **Fase 0.5 — Corrección de seguridad urgente y aislada**: cerrar la escalación de privilegios (`users/{uid}` self-update sin restricción de campos). Es independiente del resto del roadmap y de bajo riesgo de romper funcionalidad si se hace bien (ver Spec 01).
- **Fase 1 — Piezas pequeñas y reutilizables, sin cambiar comportamiento visible**: contador atómico, cálculo centralizado de pricing/IVA (funciones puras, fáciles de testear, consumidas primero internamente por Angular sin cambiar UX).
- **Fase 2 — Dominio de reservas** (el ejemplo explícito del objetivo, `crearReserva`): disponibilidad → crear reserva → confirmar/cancelar → check-in → check-out. Cada una es una Function nueva que Angular empieza a consumir en paralelo a la implementación vieja, validada antes de retirar la vieja.
- **Fase 3 — Guest Accounts y facturación**: cargos/pagos/cierre de cuenta, emisión de factura.
- **Fase 4 — POS/Inventario**: venta transaccional.
- **Fase 5 — Endurecimiento progresivo de `firestore.rules`**: colección por colección, solo después de que la Function equivalente esté validada en producción.
- **Fase 6 — Contratos compartidos y habilitación de consumidores**: documentar contratos para Flutter, preparar autenticación/rol dedicado para el agente IA.
- **Fase 7 — Integración n8n**: primera Function expuesta al agente (probablemente `crearReserva`, por ser el ejemplo del objetivo), con rol acotado.

---

## I. Orden recomendado para migrar funcionalidades

1. SPEC-00 Fundamentos del backend compartido
2. SPEC-01 Cerrar escalación de privilegios en `users` *(seguridad urgente, independiente)*
3. SPEC-02 Contador atómico centralizado (`bookingNumber`, `invoiceNumber`)
4. SPEC-03 Cálculo centralizado de pricing/IVA
5. SPEC-04 Validación server-side de disponibilidad (`validarDisponibilidad`)
6. SPEC-05 `crearReserva` (callable, usa 02+03+04)
7. SPEC-06 `confirmarReserva` / `cancelarReserva`
8. SPEC-07 `registrarCheckIn` (transaccional: reserva+habitación+cuenta)
9. SPEC-08 `registrarCheckOut` (transaccional: reserva+habitación)
10. SPEC-09 Cargos/pagos/cierre de Guest Account
11. SPEC-10 Emisión de factura (usa 02)
12. SPEC-11 Venta POS transaccional
13. SPEC-12 Endurecimiento progresivo de `firestore.rules` (una sub-tarea por cada spec anterior ya validada)
14. SPEC-13 Contratos compartidos para Flutter/n8n
15. SPEC-14 Integración n8n — primera operación conversacional (`crearReserva` vía WhatsApp)

Justificación del orden: primero infraestructura y la corrección de seguridad más grave (bajo riesgo, alto impacto, aislada); luego piezas pequeñas y puras (contador, pricing) que no cambian comportamiento visible y sirven de cimiento; luego el dominio de mayor valor de negocio y mayor riesgo de concurrencia (reservas); luego financiero; luego inventario; el endurecimiento de rules va siempre **después** de validar cada Function en producción, nunca antes; los contratos compartidos y n8n van al final porque dependen de que el "menú" de Functions de negocio ya exista y esté probado.

---

## J. Riesgos de romper funcionalidades existentes y cómo evitarlos

| Riesgo | Mitigación |
|---|---|
| Una Function nueva calcula distinto que el código Angular actual (p. ej. redondeo de IVA) | Cada Spec exige tests que comparen el resultado de la Function contra el cálculo actual de Angular con los mismos datos de entrada, antes de que Angular la consuma. |
| Migrar el flujo de check-in rompe la creación automática de Guest Account | Angular sigue llamando a su implementación actual mientras la Function nueva se prueba en paralelo (feature flag o llamada duplicada solo en entorno de prueba); solo se cambia el flujo real tras validar manualmente los mismos casos que hoy funcionan. |
| Endurecer `firestore.rules` antes de tiempo bloquea una funcionalidad que Angular aún no migró | Regla dura: nunca se restringe una colección en `firestore.rules` hasta que la Spec correspondiente esté en estado VERIFIED y Angular ya use la Function nueva en producción. |
| El contador atómico introduce un nuevo documento/colección (`counters`) y otro código depende de la lógica vieja | Se documenta explícitamente el nuevo esquema en la Spec 02 antes de implementar; se mantiene generación vieja como fallback hasta confirmar. |
| Cambiar `checkIn`/`checkOut` afecta Housekeeping (creación de tareas) sin que se sepa si es intencional | Se resuelve como pregunta abierta en la Spec correspondiente antes de tocar el código — no se asume comportamiento. |
| Un cliente (Flutter) que hoy ya escribe directo a Firestore deja de funcionar si se endurecen las rules sin avisar | Antes de tocar `lequintmobile`, se requiere auditar (fuera de alcance de este documento, pero se marca como bloqueante de la Fase 5/6) cómo Flutter accede hoy a Firestore. No se asume que Flutter usa las mismas rutas que Angular. |
| Romper el login/sesiones al tocar `users` (Spec 01) | Es el cambio más delicado de F.2 porque toca el propio mecanismo de sesión (`AuthService` escribe varios campos de `users/{uid}` desde el cliente). La Spec 01 debe listar exactamente qué campos necesita seguir escribiendo el cliente (heartbeat, sesión propia) vs. qué campos deben quedar solo-backend (`role`, `active`, `activeUntil`, `maxSessions`, `salary`), y probarse contra los flujos reales de login/logout/heartbeat antes de desplegar. |

---

## K. Pruebas recomendadas después de cada migración

Genéricas, aplicables a toda Spec que toque una funcionalidad existente:

1. **Regresión funcional manual** del flujo afectado en Angular, en un entorno de staging/emulador Firebase, cubriendo: caso feliz, los casos límite ya validados por el código actual (los citados en la sección B: overlap, capacidad, balance, stock, etc.), y al menos un caso de error esperado (debe seguir rechazándose igual que hoy).
2. **Comparación de resultado** entre la implementación vieja y la nueva con los mismos datos de entrada (unit test o script de comparación), antes de retirar la vieja.
3. **Test de la Cloud Function en el emulador** (`firebase emulators:start`) cubriendo: caller sin autenticar (debe rechazar), caller autenticado sin el rol requerido (debe rechazar), caller con rol correcto pero datos inválidos (debe rechazar con mensaje claro), caso feliz.
4. **Test de concurrencia** para las operaciones identificadas como riesgo de condición de carrera (crear dos reservas solapadas simultáneas, vender el último ítem de stock dos veces a la vez) — deben demostrar que la nueva Function lo previene y la vieja no.
5. **Verificación de que el build de Angular sigue compilando** (`npm run build`) y que la suite existente de tests (`ng test`) sigue en verde tras adaptar el servicio Angular a consumir la nueva Function.
6. **Verificación de `firestore.rules`** con el emulador (`@firebase/rules-unit-testing`) cuando una Spec incluya endurecer una regla: confirmar que el caso que debía seguir permitido sigue permitido, y que el caso que debía bloquearse ahora se bloquea.
7. **No marcar una Task como `COMPLETED`** solo porque el código fue escrito — requiere evidencia de que compila y/o las pruebas de los puntos 1-6 relevantes a esa Task pasan (ver política de estados en `02-SPECS-BACKLOG.md`).

---

## Documentación de referencia usada (verificada contra código, no asumida)

- `CLAUDE.md` — mapa de arquitectura general, confirmado exacto en lo relativo a capas y comandos.
- `CONTEXTO.md` — **desactualizado en `firestore.rules`**, útil para historia de módulos pero no como fuente de verdad de seguridad.
- `PERMISSIONS_SYSTEM.md`, `GUARDS_Y_AUTORIZACION.md` — describen el RBAC *previsto*; el código confirma que **no está aplicado** (ver F.2.2).
- `FUNCTIONS_DEPLOYED.md` — confirma Node 20 y menciona funciones futuras (`cleanupInactiveSessions` programada, notificaciones) que **no existen todavía** en código, son ideas pendientes.
