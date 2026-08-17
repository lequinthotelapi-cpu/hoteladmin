# SPEC-12 — Endurecimiento progresivo de `firestore.rules`

**Estado:** IN PROGRESS (2026-08-17) — `bookings`, `guestAccounts`, `sales` y `invoices` ya endurecidos y probados (20 tests en verde contra el emulador real, `firestore-tests/spec12-hardening.test.js`). `products`/inventario queda explícitamente fuera de alcance por ahora — es un módulo grande, activo, con escritura directa real (CRUD de productos + movimientos de inventario) que nunca formó parte del backlog de 15 Specs original y necesita su propio tratamiento SDD antes de poder centralizarse. Ver detalle completo abajo.

**Decisión del usuario sobre el principio "esperar a VERIFIED" del texto original:** el usuario decidió explícitamente avanzar con el endurecimiento aunque solo SPEC-05 está VERIFIED (06-11 siguen código-completo, pendientes de que el usuario las pruebe en producción) — prioriza terminar de aislar todo en Functions (para reutilizar en web/mobile/n8n) por sobre esperar la verificación exhaustiva de cada Spec una por una. Cita textual: *"si de todas formas debemos hacerlo... hagamoslo para que quede todo aislado y lo que se rompa lo vamos solucionando"*. De igual manera, se decidió no bloquearse esperando auditar Flutter (Task 12.1) — *"no importa si se rompe Flutter en este momento"*.
**Naturaleza:** no es una migración única — es la estrategia y el checklist maestro que se ejecuta como última Task de cada Spec funcional (05-11), colección por colección, solo después de que esa Spec esté `VERIFIED`.

## Objetivo
Que, para cada colección cuya escritura ya pasa exclusivamente por una Cloud Function, `firestore.rules` deje de permitir escritura directa de cliente (`allow write: if false;` o equivalente restringido a lectura únicamente), cerrando así el hueco descrito en el hallazgo F.2.4 del análisis, sin bloquear ninguna colección que todavía dependa de escritura directa desde Angular.

## Problema actual
Ver `firestore.rules` real (documentado línea por línea en `01-ANALISIS-Y-ARQUITECTURA.md`, sección F.4): casi todas las colecciones de negocio permiten `create`/`update` a cualquier autenticado, sin reflejar ninguna de las reglas de negocio reales.

## Comportamiento actual que debemos preservar
Ninguna colección se restringe hasta que su Spec funcional correspondiente esté `VERIFIED` — este es el principio de compatibilidad explícito del usuario, no negociable en el orden de ejecución.

## Comportamiento esperado
Checklist por colección, actualizado a medida que cada Spec avanza:

| Colección | Spec que la centraliza | Estado de la Spec | ¿Rules ya endurecidas? |
|---|---|---|---|
| `bookings` | 05, 06, 07, 08 | 05 VERIFIED, 06-08 código-completo | **SÍ** (2026-08-17) |
| `guestAccounts` | 07, 09 | código-completo | **SÍ** (2026-08-17) |
| `invoices` | 10 | código-completo | **SÍ** (2026-08-17) |
| `sales` | 11 | código-completo | **SÍ** (2026-08-17, `create`/`update`; `delete` sin tocar) |
| `products` (stock + CRUD) | — | **sin Spec propia todavía** | NO — ver hallazgo abajo, necesita su propia Spec nueva |
| `users` (campos sensibles) | 01 | código-completo, sin desplegar | **SÍ** (regla ya escrita/probada desde SPEC-01, pendiente de despliegue) |
| `rooms` | (ninguna spec la centraliza por completo — cambia de estado desde varias operaciones; evaluar al final si necesita su propia Function de "cambiar estado" o si basta con restringir escritura de campos no operativos como `basePrice`/`capacity` a admin) | — | NO |

Cada fila pasa de "NO" a "SÍ" únicamente cuando la Task correspondiente (p. ej. Task 05.6, a añadir a cada Spec como último paso tras VERIFIED) se ejecuta.

## Reglas de negocio
N/A (es meta-spec de seguridad).

## Datos de entrada / salida
N/A.

## Validaciones
Cada cambio de regla se prueba con `@firebase/rules-unit-testing` antes de desplegar.

## Permisos/autorización
N/A.

## Firestore collections/documents involucrados
Todas las listadas en la tabla.

## Firebase Functions/API involucradas
N/A directamente — depende de que existan las Functions de Specs 01-11.

## Dependencias
Cada fila depende de su Spec funcional correspondiente en estado VERIFIED.

## Impacto en Angular
Ninguno si se hace en el orden correcto (Angular ya no escribe directo a esa colección porque ya migró a la Function en la Spec correspondiente).

## Impacto potencial en Flutter
**Alto si Flutter todavía escribe directo a Firestore para alguna de estas colecciones.** Bloqueante: antes de endurecer cualquier fila, confirmar que `lequintmobile` también migró a la Function equivalente o que se le dio una vía alternativa — este análisis no audita Flutter, así que se marca como verificación obligatoria previa a cada endurecimiento.

## Impacto potencial en n8n/agente IA
Si el agente llegara a operar antes de que una colección se endurezca, heredaría el hueco de esa colección — razón adicional para no invertir el orden (Spec 14 va después de que las colecciones relevantes ya estén protegidas).

## Criterios de aceptación
Por cada fila endurecida: test de Rules que confirma que una escritura directa de cliente a esa colección ahora se rechaza, y que la Cloud Function correspondiente (que usa Admin SDK, no sujeta a Rules) sigue funcionando.

## Estrategia de pruebas
1. Test de Rules específico por colección (rechazo de escritura directa).
2. Regresión manual del flujo real en Angular (debe seguir funcionando porque ya usa la Function).
3. Si aplica, verificación con el equipo de Flutter antes de desplegar.

## Riesgos de regresión
Alto si se ejecuta fuera de orden (antes de que la Spec funcional esté VERIFIED, o antes de confirmar Flutter). Ninguno si se respeta el orden.

---

## Tasks

Las Tasks concretas de endurecimiento **no viven aquí como trabajo independiente** — se añaden como la última Task de cada Spec funcional (05, 06, 07, 08, 09, 10, 11, y 01 para `users`) en el momento en que esa Spec llega a VERIFIED. Este archivo se actualiza (tabla de arriba) como checklist maestro cada vez que una de esas Tasks se completa.

### Task 12.1 — Confirmar con el usuario el plan de auditoría de Flutter antes del primer endurecimiento
- **Objetivo:** decidir si se audita `lequintmobile` antes de endurecer la primera colección, o si el usuario confirma que Flutter no escribe directo a esas colecciones.
- **Dependencias:** ninguna, pero bloquea la primera fila de la tabla.
- **Validación:** confirmación del usuario.
- **Estado:** DECIDED (2026-08-17) — el usuario decidió no bloquearse por Flutter: *"no importa si se rompe Flutter en este momento"*. Se prioriza terminar de centralizar todo en Functions; Flutter se audita/ajusta después si hace falta.

### Task 12.2 — Endurecer `bookings`, `guestAccounts`, `sales`, `invoices`
- **Objetivo:** bloquear la escritura directa de cliente en las 4 colecciones cuyo camino de escritura está 100% centralizado (Functions o código muerto confirmado).
- **Dependencias:** Task 12.1.
- **Validación:** tests con `@firebase/rules-unit-testing` confirmando rechazo directo + lectura preservada.
- **Estado:** COMPLETED (2026-08-17)

  **Auditoría previa (antes de tocar `firestore.rules`), fundamental para no romper lequintweb:** el primer intento de endurecimiento se detuvo cuando se encontró que varias operaciones sobre estas colecciones nunca fueron migradas a ninguna Spec funcional. Se investigó contra el código real, con `grep` exhaustivo sobre `src/app/features/` (no solo la carpeta obvia, sino todo el árbol), para cada método:
  - `BookingService.updateBooking` (editar fechas/huéspedes de una reserva existente), `deleteBooking`, `markAsNoShow` — **cero callers en toda la UI**. Código muerto, confirmado.
  - `GuestAccountService.createAccountFromBooking` (reemplazado por `registrarCheckIn`, SPEC-07), `removeCharge`, y el `delete` del repositorio (ni siquiera expuesto por el servicio) — **cero callers**. Código muerto, confirmado.
  - `InvoiceService.createInvoice` (el método genérico, no `createInvoiceFromGuestAccount`) — **cero callers**. Código muerto, confirmado.
  - `POSService` no expone ningún método de update/delete sobre `sales` más allá de `createSale` (ya centralizado en SPEC-11) — sin código muerto que auditar ahí, simplemente no existe otro camino.
  - Como **ninguna** de estas operaciones "muertas" tiene un caller real, endurecer estas 4 colecciones no rompe ningún flujo existente de lequintweb — a diferencia de lo que se temía inicialmente.

  **Cambios en `firestore.rules`:**
  - `bookings`: `allow create, update, delete: if false;` (antes: cualquier autenticado podía crear/actualizar, admin podía borrar).
  - `guestAccounts`: `allow create, update, delete: if false;` (antes: igual que bookings).
  - `sales`: `allow create, update: if false;` — `delete` se dejó sin tocar (`isAdmin()`, fuera de alcance, sin evidencia de uso).
  - `invoices`: `allow create, update: if false;` — `delete` se dejó sin tocar (`isAdmin()`, fuera de alcance, sin evidencia de uso).
  - `read` no se tocó en ninguna de las 4 — sigue `if isAuthenticated()`.

  **20 tests contra el emulador real** (`firestore-tests/spec12-hardening.test.js`, nuevo archivo — se ajustó `firestore-tests/package.json` para correr todos los `*.test.js`, no solo `rules.test.js`): 4 tests (uno por colección) confirmando que `create`/`update`/`delete` directos de un usuario autenticado quedan rechazados y que `read` sigue funcionando, + 1 test de control confirmando que `products`/`rooms` (no endurecidas) siguen permitiendo escritura directa como hoy. Los 83 tests de `functions/` (que usan el Admin SDK, no sujeto a estas reglas) se reconfirmaron en verde tras el cambio.

### Task 12.3 — `products`/inventario: hallazgo, fuera de alcance por ahora
- **Objetivo:** documentar por qué esta colección no se endureció, para que quede como trabajo de seguimiento explícito, no un olvido.
- **Estado:** BLOCKED — necesita convertirse en su propia Spec nueva antes de poder centralizarse.
  - **Hallazgo:** a diferencia de `bookings`/`guestAccounts`/`invoices`/`sales`, `products` tiene escritura directa **real y activa**, en un módulo separado de POS que ninguna de las 15 Specs originales cubre:
    - `features/private/products/products-list/` y `product-create-update/` — CRUD completo de productos (crear, editar, eliminar), llamado directo vía `ProductService.create/update/delete`.
    - `features/private/inventory/movement-create/` — registro de movimientos de inventario (entrada/salida/ajuste) vía `InventoryMovementService.create`, que lee y ajusta `product.currentStock` directamente además de escribir en `inventoryMovements`.
  - SPEC-11 (venta POS) solo centralizó el descuento de stock **durante una venta** — nunca tocó la gestión general de productos ni los movimientos manuales de inventario.
  - **Recomendación:** crear una Spec nueva (candidata a `SPEC-15` en el backlog) para centralizar `crearProducto`/`actualizarProducto`/`eliminarProducto`/`registrarMovimientoInventario` en Functions, siguiendo el mismo proceso riguroso (leer el código real, confirmar reglas de negocio — ej. `minStock`, alertas de stock bajo — con el usuario antes de asumir nada) antes de poder endurecer `products`/`inventoryMovements`. No se apuró esta Spec dentro de SPEC-12 para no repetir el patrón de "asumir sin verificar" que ya causó hallazgos importantes en Specs anteriores.
