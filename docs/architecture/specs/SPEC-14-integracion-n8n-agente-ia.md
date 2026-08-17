# SPEC-14 — Integración n8n / agente conversacional

**Estado:** IN PROGRESS (2026-08-17) — Tasks 14.1-14.3 completadas a nivel de código (rol `ai-agent` diseñado y habilitado exclusivamente para `crearReserva`, con trazabilidad). Task 14.4 (prueba end-to-end real en n8n) **no se puede hacer en esta sesión** — no hay un entorno de n8n disponible, y tampoco existe todavía la cuenta de servicio real en el proyecto de producción (solo el soporte de código para aceptarla).

## Objetivo
Conectar el futuro agente de IA (n8n + WhatsApp) a las Cloud Functions de negocio ya validadas, empezando por el caso de uso explícito del objetivo del proyecto ("Registra una reserva para Juan Pérez del 20 al 23" → `crearReserva`), sin que el agente tenga acceso directo a Firestore ni lógica de negocio propia.

## Problema actual
No existe integración todavía. Este documento fija el diseño de seguridad antes de construir nada, para no repetir el patrón actual (todo abierto a "isAuthenticated").

## Comportamiento actual que debemos preservar
N/A (funcionalidad nueva) — pero debe respetar exactamente las mismas reglas de negocio que Angular, por construcción (llama a las mismas Functions).

## Comportamiento esperado
1. Crear un rol dedicado `ai-agent` (o nombre a decidir) en `UserRole`, con un usuario/cuenta de servicio propio en Firebase Auth — **no comparte credenciales con ningún usuario humano**.
2. Los permisos de ese rol en `rolePermissions`/las Functions se limitan exactamente a las callables que el agente necesita invocar (empezando solo por `crearReserva`; se amplía función por función, no de una vez).
3. n8n mantiene el flujo conversacional (interpretar intención, pedir datos faltantes, confirmar con el empleado antes de ejecutar) y, al ejecutar, llama la Cloud Function callable vía HTTPS con el token de esa cuenta de servicio — nunca escribe Firestore directo.
4. Toda operación ejecutada por el agente debe quedar trazable (campo `createdBy`/`source: 'ai-agent'` o equivalente en el documento creado) para poder auditar qué hizo el agente vs. qué hizo un humano.

## Reglas de negocio
Las mismas que la Function invocada ya aplica (no se duplican aquí).

## Datos de entrada / salida
Los de la Function invocada (ver Spec 13 para el contrato).

## Validaciones
Las de la Function invocada, más: el rol `ai-agent` debe rechazar cualquier operación fuera de la lista blanca explícita.

## Permisos/autorización
Rol dedicado y acotado, ver "Comportamiento esperado" punto 1-2. **No usar una service account con Admin SDK sin restricciones** — el agente debe pasar por el mismo modelo de auth/rol que cualquier otro caller de las callables (ver hallazgo F.2.8 del análisis: si opera con Admin SDK sin restricción, ignora toda protección).

## Firestore collections/documents involucrados
Ninguno directamente (el agente no toca Firestore, solo invoca callables).

## Firebase Functions/API involucradas
Inicialmente solo `crearReserva` (Spec 05). Se amplía en Specs de seguimiento fuera de este backlog inicial, una función a la vez, tras validar la primera en producción.

## Dependencias
SPEC-13 (contratos documentados), SPEC-05 en estado VERIFIED como mínimo.

## Impacto en Angular
Ninguno directo. Indirecto: cualquier reserva creada por el agente aparece igual que una creada por Angular (misma Function, mismo formato), por lo que la UI de bookings/calendar no necesita cambios para mostrarlas.

## Impacto potencial en Flutter
Ninguno directo.

## Impacto potencial en n8n/agente IA
Es el objeto de esta Spec.

## Criterios de aceptación
- El agente solo puede invocar la(s) Function(s) explícitamente autorizadas para su rol — cualquier otra operación se rechaza con `permission-denied`.
- Una reserva creada por el agente es indistinguible en estructura de una creada por Angular, salvo por el campo de trazabilidad (`source`/`createdBy`).
- Un intento de prompt-injection que induzca al agente a "saltarse" la conversación y ejecutar una operación no confirmada por el empleado no debe poder ejecutar nada fuera de la lista blanca de Functions (defensa en profundidad: aunque el agente "se equivoque", el backend sigue validando rol + datos + reglas de negocio).

## Estrategia de pruebas
1. Test de la cuenta de servicio del agente contra el emulador: operación permitida funciona, operación fuera de la lista blanca se rechaza.
2. Prueba end-to-end en un entorno de staging de n8n: conversación completa de creación de reserva, verificar que el resultado en Firestore es idéntico al que produciría Angular con los mismos datos.
3. Prueba de "mal uso": intentar que el flujo de n8n invoque una Function no autorizada (debe fallar en el backend, no solo en el diseño del flujo de n8n).

## Riesgos de regresión
Bajo para la app existente (funcionalidad aditiva). Riesgo real está en superficie de ataque nueva si el rol del agente se diseña con permisos demasiado amplios — mitigado por la lista blanca explícita y las pruebas de mal uso.

---

## Tasks

### Task 14.1 — Diseñar el rol `ai-agent` y su cuenta de servicio dedicada
- **Dependencias:** SPEC-00 (convenciones de rol/auth), SPEC-13.
- **Validación:** decisión y diseño documentados, aprobados por el usuario.
- **Estado:** DECIDED (2026-08-17)
  - **Decisión del usuario:** usuario dedicado de Firebase Auth (email+password, ej. `ai-agent@lequinthotel.internal`), no una cuenta de servicio GCP con Admin SDK sin restricción (respeta explícitamente el hallazgo F.2.8 del análisis). n8n se loguea con esas credenciales (guardadas como credential en n8n) para obtener un ID token antes de cada llamada a una Callable Function — nunca escribe Firestore directo.
  - **Decisión de diseño (mía, documentada):** el rol `ai-agent` se agregó **solo** al tipo `UserRole` de `functions/src/shared/auth-context.ts` — deliberadamente **no** se tocó el `UserRole` enum de Angular (`src/app/core/models/user-role.enum.ts`) ni `rolePermissions`. El agente nunca inicia sesión en la SPA, así que no necesita rutas ni aparecer en el enum — y agregarlo ahí hubiera arriesgado que apareciera por accidente en el selector de rol del módulo de administración de usuarios (un humano podría auto-asignárselo o asignárselo a otro usuario sin querer). Cada Function decide explícitamente si acepta `'ai-agent'` en su propia lista blanca de `requireRole` — no se hereda por defecto en ninguna.

### Task 14.2 — Habilitar `crearReserva` para el rol `ai-agent`
- **Archivos afectados:** `functions/src/bookings/crear-reserva.ts` (ampliar `requireRole` para aceptar `ai-agent` además de roles humanos), `rolePermissions`/config asociada.
- **Dependencias:** Task 14.1, SPEC-05 VERIFIED.
- **Validación:** test de la cuenta de servicio invocando `crearReserva` con éxito y con datos inválidos (rechazo correcto).
- **Estado:** COMPLETED (2026-08-17)
  - `crearReserva` ahora acepta `['receptionist', 'manager', 'admin', 'superadmin', 'ai-agent']` en su `requireRole`. Ninguna otra Function (SPEC-06 a SPEC-11) fue tocada — `ai-agent` queda excluido de todas ellas por diseño (lista blanca explícita, no heredada).
  - 2 tests nuevos contra el emulador real: `ai-agent` puede crear una reserva exitosamente (con `createdByRole: 'ai-agent'` en el documento resultante); `ai-agent` es rechazado con `permission-denied` al intentar `confirmarReserva` (prueba explícita de que la lista blanca es por Function, no global). Total `functions/`: 85 tests en verde contra el emulador (83 previos + 2 nuevos) + 49 offline sin cambios.

### Task 14.3 — Añadir campo de trazabilidad a las escrituras de las Functions de negocio
- **Objetivo:** poder distinguir operaciones hechas por el agente de las hechas por humanos.
- **Dependencias:** Task 14.2.
- **Validación:** revisión manual de documentos creados por el agente en staging.
- **Estado:** COMPLETED (2026-08-17), con alcance ajustado
  - Se agregó `createdByRole: caller.role` (no se reutilizó el nombre `source`, que en `bookings` ya significa "canal de la reserva" — direct/website/booking.com/etc., un concepto de negocio distinto; reusar ese nombre hubiera sido confuso e incorrecto) — solo a `crearReserva`, no se "retro-aplicó" a las otras 10 Functions como sugería el texto original de la Spec. Razón: `ai-agent` solo puede invocar `crearReserva` hoy (Task 14.2), así que agregar el campo a Functions que el agente no puede llamar todavía no aporta trazabilidad real — se hace cuando (si) se amplíe la lista blanca a cada Function nueva.
  - No se tocó el modelo `Booking` de Angular (`booking.model.ts`) para tipar `createdByRole` — es opcional/aditivo, no requerido por los criterios de aceptación de esta Spec (que son sobre el backend, no sobre mostrarlo en la UI). Queda como mejora futura si se quiere visualizar en la UI qué reservas creó el agente.

### Task 14.4 — Flujo n8n de prueba end-to-end (staging) y aprobación del usuario
- **Dependencias:** Task 14.2, 14.3.
- **Validación:** aprobación explícita del usuario tras probar el caso de uso real ("Registra una reserva para Juan Pérez del 20 al 23") en staging.
- **Estado:** PENDING — bloqueada por dos cosas que no existen en esta sesión: (1) la cuenta de servicio real (`ai-agent@...`) no está provisionada en Firebase Auth de producción; (2) no hay ningún entorno de n8n desplegado para conectar. Requiere que el usuario cree la cuenta y configure n8n antes de poder probar esto — es la única Task de todo el backlog de 15 Specs que queda genuinamente fuera del alcance de lo que se puede hacer en este devcontainer.
