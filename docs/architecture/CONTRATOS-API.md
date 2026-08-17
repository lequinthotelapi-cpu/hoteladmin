# Contratos de las Cloud Functions de negocio

**SPEC-13.** Documenta el contrato exacto (input/output/errores/rol) de cada Cloud Function callable construida en Specs 00-11, para que Flutter y n8n puedan integrarse sin leer el código TypeScript de `functions/`.

**Decisión del usuario (Task 13.1):** Markdown curado a mano, sin paquete de tipos compartido (Flutter/n8n no consumen TypeScript directamente, así que el beneficio de un paquete de tipos era principalmente documental).

**Cómo se armó:** cada contrato se verificó contra los tests reales que corren contra el emulador de Firestore (`functions/src/**/*.emulator.test.ts`, `*.concurrency.test.ts`) — no contra la intención de diseño original. Los ejemplos de payload son extraídos de esos tests, no inventados.

**Estado de estas Functions:** todas están implementadas y probadas contra el emulador. Salvo `crearReserva` (SPEC-05, **VERIFIED** — probada en producción real por el usuario), el resto (SPEC-06 a SPEC-11) están código-completo pero **no verificadas en producción todavía** — el usuario decidió documentar los contratos igual, sin esperar esa verificación, para poder avanzar con SPEC-14 (integración n8n).

---

## Cómo invocar cualquiera de estas Functions

Todas son [Callable Functions](https://firebase.google.com/docs/functions/callable) (`onCall`, v2). Desde un cliente Firebase (Angular, o cualquier SDK que soporte Callable Functions):

```ts
import { httpsCallable } from 'firebase/functions'; // o @angular/fire/functions

const fn = httpsCallable(functions, 'nombreDeLaFunction');
const result = await fn({ /* input */ });
console.log(result.data); // output
```

Para n8n u otro consumidor sin SDK de Firebase: las Callable Functions también aceptan HTTP POST directo a
`https://{region}-{project-id}.cloudfunctions.net/{nombreDeLaFunction}` con un body `{"data": {...}}` y un header `Authorization: Bearer {ID_TOKEN}` de un usuario autenticado con el rol requerido — ver [protocolo HTTP de Callable Functions](https://firebase.google.com/docs/functions/callable-reference). El proyecto real es `lequinthotel-ca6ef`, región `us-central1` (default).

## Manejo de errores — catálogo `LH-XXXX`

Todos los errores de negocio son un `HttpsError` con un `code` gRPC estándar (`unauthenticated`, `permission-denied`, `invalid-argument`, `not-found`, `failed-precondition`, `already-exists`) y `details.lhCode` con un código `LH-XXXX` — el mismo catálogo que usa Angular (`core/utils/error-handler.ts`), para que el texto exacto de `error.message` no sea lo único de lo que depender.

| Rango | Significado |
|---|---|
| `LH-0200`/`LH-0201` | Permisos / no autenticado (comunes a todas las Functions, ver abajo) |
| `LH-0300..0399` | Validación de datos de entrada |
| `LH-0400..0499` | Reglas de negocio |
| `LH-9999` | Error genérico/no mapeado |

**Comunes a TODAS las Functions de este documento** (vía `requireRole`, `functions/src/shared/auth-context.ts`):

| `lhCode` | `HttpsError.code` | Situación |
|---|---|---|
| `LH-0201` | `unauthenticated` | No hay `request.auth` (usuario no logueado) |
| `LH-0200` | `permission-denied` | El usuario está logueado pero su `role` (leído de `users/{uid}.role`) no está en la lista permitida de esa Function |

---

## Auth

### `forceLogoutUser`
**Rol requerido:** `admin`, `superadmin` (superadmin no puede ser forzado a logout por un admin, solo por otro superadmin).
**Archivo:** `functions/src/auth/force-logout.ts` (SPEC-00).

**Input:**
```ts
{ uid: string }
```

**Output:**
```ts
{ success: true, message: string }
```

**Errores:**
| `code` | Situación |
|---|---|
| `unauthenticated` | Sin auth |
| `permission-denied` | Rol insuficiente, o admin intentando forzar logout de un superadmin |
| `invalid-argument` | Falta `uid` |

**Ejemplo:**
```json
{ "uid": "target-user-uid" }
```

---

## Reservas (`functions/src/bookings/`)

### `crearReserva` — **VERIFIED en producción**
**Rol requerido:** `receptionist`, `manager`, `admin`, `superadmin` (mismos roles con acceso a la ruta `/bookings`).
**Archivo:** `crear-reserva.ts` (SPEC-05). Compone SPEC-02 (contador), SPEC-03 (pricing), SPEC-04 (disponibilidad) en una transacción.

**Input:**
```ts
{
  roomId: string;
  guestId: string;
  checkInDate: string;   // ISO 8601
  checkOutDate: string;  // ISO 8601, debe ser posterior a checkInDate
  adults: number;
  children: number;
  source: string;        // valor libre, hoy validado contra parameters/reservationSources en la UI, no en la Function
  specialRequests?: string;
  notes?: string;
}
```

**Output:**
```ts
{
  bookingId: string;
  bookingNumber: string; // formato BK-YYYYMMDD-XXX
  totalPrice: number;    // basePrice × noches, SIN IVA (decisión Task 03.1)
  nights: number;
  status: 'pending';
}
```

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0300` | `invalid-argument` | Faltan campos requeridos, o `checkOutDate <= checkInDate` |
| `LH-0301` | `invalid-argument` | `adults + children < 1` |
| `LH-0400` | `not-found` | La habitación no existe |
| `LH-0401` | `failed-precondition` | Habitación no `isActive` (validación nueva, más estricta que el cliente actual — ver SPEC-04 Task 04.1) |
| `LH-0404` | `not-found` | El huésped no existe |
| `LH-0403` | `failed-precondition` | `adults + children` excede `room.capacity` |
| `LH-0402` | `failed-precondition` | Solapa con una reserva `confirmed`/`checked-in` existente — `error.details.conflictos` trae el detalle |

**Nota de concurrencia importante:** dos reservas `pending` para las mismas fechas/habitación pueden coexistir (decisión del usuario, ver SPEC-05 "Hallazgo: pending vs. pending") — el bloqueo real contra overbooking ocurre recién al confirmar.

**Ejemplo** (de `crear-reserva.emulator.test.ts`):
```json
{
  "roomId": "room-7",
  "guestId": "guest-7",
  "checkInDate": "2026-09-10T00:00:00.000Z",
  "checkOutDate": "2026-09-13T00:00:00.000Z",
  "adults": 2,
  "children": 1,
  "source": "direct"
}
```

---

### `confirmarReserva`
**Rol requerido:** `receptionist`, `manager`, `admin`, `superadmin`.
**Archivo:** `confirmar-cancelar.ts` (SPEC-06).

**Input:** `{ bookingId: string }`
**Output:** `{ bookingId: string, status: 'confirmed' }`

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0302` | `invalid-argument` | Falta `bookingId` |
| `LH-0405` | `not-found` | La reserva no existe |
| `LH-0406` | `failed-precondition` | La reserva no está en `pending` (más estricto que el cliente actual, que no validaba esto) |

**Ejemplo:** `{ "bookingId": "booking-pending-1" }`

---

### `cancelarReserva`
**Rol requerido:** `receptionist`, `manager`, `admin`, `superadmin`.
**Archivo:** `confirmar-cancelar.ts` (SPEC-06).

**Input:** `{ bookingId: string, motivo?: string }`
**Output:** `{ bookingId: string, status: 'cancelled' }`

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0302` | `invalid-argument` | Falta `bookingId` |
| `LH-0405` | `not-found` | La reserva no existe |
| `LH-0407` | `failed-precondition` | La reserva está `checked-in` o `checked-out` (el cliente actual solo rechazaba `checked-in`) |

**Ejemplo:** `{ "bookingId": "booking-pending-2", "motivo": "Huésped canceló por teléfono" }`

---

### `registrarCheckIn`
**Rol requerido:** `receptionist`, `manager`, `admin`, `superadmin`.
**Archivo:** `checkin.ts` (SPEC-07). Crea la Guest Account (reutiliza SPEC-03 para el cargo), cambia habitación a `occupied` y reserva a `checked-in`, todo en una transacción.

**Input:** `{ bookingId: string }`
**Output:**
```ts
{ guestAccountId: string; bookingId: string; roomId: string }
```

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0302` | `invalid-argument` | Falta `bookingId` |
| `LH-0405` | `not-found` | La reserva no existe |
| `LH-0408` | `failed-precondition` | La reserva no está `confirmed` |
| `LH-0400` | `not-found` | La habitación no existe |
| `LH-0409` | `failed-precondition` | La habitación no está `available` (decisión Task 07.1 — más estricto que el código actual, que no validaba esto en absoluto) |

**Idempotencia:** si ya existe una Guest Account para la reserva, se reutiliza (no se duplica).

**Ejemplo:** `{ "bookingId": "booking-happy-ci" }`

---

### `registrarCheckOut`
**Rol requerido:** `receptionist`, `manager`, `admin`, `superadmin`.
**Archivo:** `checkout.ts` (SPEC-08).

**Input:** `{ bookingId: string }`
**Output:** `{ bookingId: string; roomId: string }`

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0302` | `invalid-argument` | Falta `bookingId` |
| `LH-0405` | `not-found` | La reserva no existe |
| `LH-0410` | `failed-precondition` | La reserva no está `checked-in` |

**Comportamiento confirmado (Task 08.1):** la habitación queda en `dirty` (nunca `cleaning`); NO se crea ninguna tarea de housekeeping automática — decisión del usuario de mantener ese paso manual, igual que hoy. La Guest Account no se toca (sigue abierta).

**Ejemplo:** `{ "bookingId": "booking-happy-co" }`

---

## Guest Accounts (`functions/src/guest-accounts/`)

### `agregarCargoCuenta`
**Rol requerido:** `receptionist`, `manager`, `admin`, `superadmin`. Cubre tanto el diálogo manual de cargos como el flujo POS "cargar a habitación" (mismo método en Angular, misma Function).
**Archivo:** `cargos-pagos.ts` (SPEC-09).

**Input:**
```ts
{
  accountId: string;
  tipo: string;         // ChargeType: 'accommodation'|'pos'|'service'|'minibar'|'laundry'|'spa'|'restaurant'|'other'
  descripcion: string;
  monto: number;        // > 0, precio unitario
  cantidad: number;     // > 0
  referencia?: string;
}
```

**Output:** cuenta recalculada — `{ accountId, subtotal, tax, total, paid, balance }` (IVA 13%).

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0303` | `invalid-argument` | Falta algún campo requerido o `monto`/`cantidad` no son `> 0` |
| `LH-0411` | `not-found` | La cuenta no existe |
| `LH-0412` | `failed-precondition` | La cuenta no está `open` |

**Ejemplo:** `{ "accountId": "account-happy-1", "tipo": "pos", "descripcion": "POS: Coca-Cola x2", "monto": 20, "cantidad": 1 }`

---

### `agregarPagoCuenta`
**Rol requerido:** `receptionist`, `manager`, `admin`, `superadmin`.
**Archivo:** `cargos-pagos.ts` (SPEC-09).

**Input:**
```ts
{ accountId: string; monto: number; metodoPago: string; referencia?: string; notas?: string }
// metodoPago: PaymentMethod = 'cash'|'card'|'transfer'|'deposit'
```

**Output:** `{ accountId, subtotal, tax, total, paid, balance }`

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0304` | `invalid-argument` | Falta algún campo requerido o `monto` no es `> 0` |
| `LH-0411` | `not-found` | La cuenta no existe |
| `LH-0412` | `failed-precondition` | La cuenta no está `open` |
| `LH-0413` | `failed-precondition` | `monto` excede el `balance` almacenado |

**Ejemplo:** `{ "accountId": "account-pay-2", "monto": 40, "metodoPago": "card" }`

---

### `cerrarCuenta`
**Rol requerido:** `receptionist`, `manager`, `admin`, `superadmin`.
**Archivo:** `cargos-pagos.ts` (SPEC-09). Requiere `balance === 0`.

**Input:** `{ accountId: string }`
**Output:** `{ accountId: string, status: 'closed' }`

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0411` | `not-found` | La cuenta no existe (también si falta `accountId`) |
| `LH-0414` | `failed-precondition` | La cuenta ya está `closed` |
| `LH-0415` | `failed-precondition` | `balance > 0` |

**Ejemplo:** `{ "accountId": "account-close-3" }`

---

## Facturación (`functions/src/invoices/`)

### `emitirFactura`
**Rol requerido:** `receptionist`, `manager`, `admin`, `superadmin`.
**Archivo:** `facturacion.ts` (SPEC-10). Usa el contador atómico de SPEC-02 para `invoiceNumber`.

**Input:**
```ts
{
  referenceId: string;   // hoy siempre el id de una guestAccount
  tipo: 'guest_account'; // 'pos' NO está implementado todavía — ver nota abajo
  clientName: string;
  clientTaxId: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
}
```

**Output:** `{ invoiceId: string; invoiceNumber: string }` (formato `FAC-YYYYMM-XXXX`).

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0305` | `invalid-argument` | Falta algún campo requerido |
| `LH-0419` | `failed-precondition` | `tipo !== 'guest_account'` — no hay flujo de facturación POS real en la UI, así que no se implementó (ver SPEC-10 Task 10.1) |
| `LH-0416` | `already-exists` | Ya existe una factura para ese `referenceId` |
| `LH-0411` | `not-found` | La cuenta (`referenceId`) no existe |
| `LH-0417` | `failed-precondition` | La cuenta no está `closed` |
| `LH-0418` | `failed-precondition` | La cuenta tiene `balance !== 0` |

**Ejemplo:**
```json
{
  "referenceId": "account-happy-1",
  "tipo": "guest_account",
  "clientName": "Juan Pérez",
  "clientTaxId": "001-0001-0001A"
}
```

---

### `cancelarFactura`
**Rol requerido:** `receptionist`, `manager`, `admin`, `superadmin`.
**Archivo:** `facturacion.ts` (SPEC-10). No borra, marca `cancelled` (rastro fiscal).

**Input:** `{ invoiceId: string; motivo: string }` (`motivo` es requerido, a diferencia de `cancelarReserva` donde es opcional)
**Output:** `{ invoiceId: string, status: 'cancelled' }`

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0305` | `invalid-argument` | Falta `invoiceId` o `motivo` |
| `LH-0420` | `not-found` | La factura no existe |
| `LH-0421` | `failed-precondition` | Ya está `cancelled` |

**Ejemplo:** `{ "invoiceId": "invoice-abc", "motivo": "Datos fiscales incorrectos" }`

---

## POS (`functions/src/pos/`)

### `registrarVentaPOS`
**Rol requerido:** `receptionist`, `admin`, `superadmin` — **no `manager`** (a diferencia de las demás Functions de este documento; `manager` no tiene acceso a la ruta `/pos`).
**Archivo:** `registrar-venta.ts` (SPEC-11). Unifica venta directa y "cargar a habitación" (antes dos caminos separados en Angular). Venta **directa**: IVA 19% (específico de POS, crea su propio documento `sales`). Carga a **habitación**: IVA 13% — el mismo que aplica la cuenta a cualquier otro cargo del folio (corregido 2026-08-17, ver nota abajo), no el 19% de POS.

**Input:**
```ts
{
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: string;
  tipoVenta: 'directa' | 'habitacion';
  guestAccountId?: string;  // requerido si tipoVenta === 'habitacion'
  createdByName?: string;   // nombre para mostrar en sale/transaction; si se omite, se usa el uid
}
```

**Output:**
```ts
{ saleId: string | null; total: number }
// saleId es null para tipoVenta 'habitacion' (no se crea un documento sales,
// se agrega un cargo a la guestAccount vía la misma lógica de agregarCargoCuenta)
```

**Errores:**
| `lhCode` | `code` | Situación |
|---|---|---|
| `LH-0306` | `invalid-argument` | Faltan `items`/`paymentMethod`/`tipoVenta`, `tipoVenta` inválido, falta `guestAccountId` para `habitacion`, o algún item sin `productId`/`quantity > 0` |
| `LH-0423` | `not-found` | Algún producto no existe |
| `LH-0424` | `failed-precondition` | Algún producto no está `isActive` |
| `LH-0425` | `failed-precondition` | Stock insuficiente de algún producto — la transacción completa se descarta (todo o nada), el stock no cambia |
| `LH-0422` | `failed-precondition` | `tipoVenta: 'directa'` sin caja abierta del caller |
| (códigos de `agregarCargoCuenta`) | — | Si `tipoVenta: 'habitacion'`, también puede fallar con `LH-0411`/`LH-0412` (cuenta inexistente/cerrada) |

**Nota histórica (corregida):** una versión anterior de esta Function aplicaba 19% de IVA también al calcular el monto cargado a la habitación, y la cuenta volvía a aplicar 13% al recalcular — doble impuesto. Corregido con confirmación del usuario: para `tipoVenta: 'habitacion'`, `total` refleja el subtotal + 13% (no 19%+13%). Ver addendum en `SPEC-11-pos-venta-transaccional.md`.

**Ejemplo — venta directa** (de `registrar-venta.emulator.test.ts`):
```json
{
  "items": [{ "productId": "prod-happy-1", "quantity": 2 }],
  "paymentMethod": "cash",
  "tipoVenta": "directa",
  "createdByName": "Ana Recep"
}
```

**Ejemplo — cargar a habitación:**
```json
{
  "items": [{ "productId": "prod-happy-2", "quantity": 3 }],
  "paymentMethod": "cash",
  "tipoVenta": "habitacion",
  "guestAccountId": "account-pos-1"
}
```

---

## Roles requeridos — resumen

| Function | receptionist | manager | admin | superadmin | housekeeper | guest | **ai-agent** |
|---|---|---|---|---|---|---|---|
| `forceLogoutUser` | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `crearReserva` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | **✅** |
| `confirmarReserva` / `cancelarReserva` / `registrarCheckIn` / `registrarCheckOut` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `agregarCargoCuenta` / `agregarPagoCuenta` / `cerrarCuenta` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `emitirFactura` / `cancelarFactura` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `registrarVentaPOS` | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |

**`ai-agent` (SPEC-14):** rol dedicado exclusivo de `functions/` — deliberadamente **no existe** en el `UserRole` de Angular ni en `rolePermissions`, para que no pueda aparecer por accidente en ningún selector de rol de la UI de administración de usuarios. El agente nunca inicia sesión en la SPA; obtiene un ID token autenticándose directo contra Firebase Auth (email+password de una cuenta de servicio dedicada) desde n8n. Habilitado hoy **únicamente** para `crearReserva` — lista blanca explícita, se amplía función por función según se vaya necesitando, nunca por defecto.

**Trazabilidad (Task 14.3):** `crearReserva` agrega un campo `createdByRole` (además de `createdBy`, que ya existía) al documento de la reserva — permite distinguir reservas creadas por el agente (`createdByRole: 'ai-agent'`) de las creadas por un humano, sin depender de conocer el UID exacto de la cuenta de servicio. Por ahora solo se agregó a `crearReserva` (la única Function que el agente puede invocar) — si se amplía la lista blanca a otras Functions, extender el mismo patrón ahí.

---

## Pendiente / fuera de alcance de este documento

- Las Functions de `products`/inventario (crear/editar producto, movimientos de stock) **no existen todavía** — ver SPEC-12 Task 12.3, necesitan su propia Spec nueva antes de poder documentarse aquí.
- **La cuenta de servicio real del agente (usuario Firebase Auth + documento `users/{uid}` con `role: 'ai-agent'`) todavía no se creó** — el código ya la soporta (`requireRole` acepta `'ai-agent'` en `crearReserva`), pero provisionar la cuenta real en el proyecto de producción y conectarla a un flujo de n8n real queda pendiente (no hay entorno de n8n disponible en esta sesión para probarlo end-to-end — ver SPEC-14 Task 14.4).
