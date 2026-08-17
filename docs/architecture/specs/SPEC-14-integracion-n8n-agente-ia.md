# SPEC-14 — Integración n8n / agente conversacional

**Estado:** PENDING

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
- **Estado:** PENDING · requiere decisión del usuario.

### Task 14.2 — Habilitar `crearReserva` para el rol `ai-agent`
- **Archivos afectados:** `functions/src/bookings/crear-reserva.ts` (ampliar `requireRole` para aceptar `ai-agent` además de roles humanos), `rolePermissions`/config asociada.
- **Dependencias:** Task 14.1, SPEC-05 VERIFIED.
- **Validación:** test de la cuenta de servicio invocando `crearReserva` con éxito y con datos inválidos (rechazo correcto).
- **Estado:** PENDING

### Task 14.3 — Añadir campo de trazabilidad (`source`) a las escrituras de las Functions de negocio
- **Objetivo:** poder distinguir operaciones hechas por el agente de las hechas por humanos, en todas las Functions relevantes (retro-aplicar a Specs 05-11 ya construidas).
- **Dependencias:** Task 14.2.
- **Validación:** revisión manual de documentos creados por el agente en staging.
- **Estado:** PENDING

### Task 14.4 — Flujo n8n de prueba end-to-end (staging) y aprobación del usuario
- **Dependencias:** Task 14.2, 14.3.
- **Validación:** aprobación explícita del usuario tras probar el caso de uso real ("Registra una reserva para Juan Pérez del 20 al 23") en staging.
- **Estado:** PENDING
