# SPEC-01 — Cerrar escalación de privilegios en `users`

**Estado:** IN PROGRESS — Task 01.1 decidida (Rules granulares) y Task 01.3 implementada+probada (15/15 tests en verde contra el emulador real **+ verificación end-to-end real en Angular/emulador, ver addendum abajo**, que encontró y corrigió un bug crítico preexistente en `AuthService` que habría roto el login de todos los usuarios si se desplegaba tal cual). Task 01.2 pospuesta (no bloquea lo hecho en `lequintweb`, sí bloquea Task 01.4/despliegue a producción). Pendiente: regresión visual completa vía UI real (bloqueada por límites de recursos del sandbox, ver addendum) y despliegue a producción. Ver detalle en cada Task.
**Naturaleza:** corrección de seguridad urgente, aislada del resto del roadmap de migración de lógica de negocio. Ver hallazgo F.2.1 en `01-ANALISIS-Y-ARQUITECTURA.md`.

## Objetivo
Impedir que un usuario autenticado pueda modificar su propio `role`, `active`, `activeUntil`, `maxSessions` o `salary` escribiendo directamente a `users/{uid}` vía el SDK de Firestore, sin romper el flujo legítimo de sesión (login/logout/heartbeat) que hoy también escribe ese mismo documento desde el cliente.

## Problema actual
`firestore.rules:20`: `allow update: if isAdmin() || request.auth.uid == userId;` sin restricción de campos. Cualquier usuario autenticado puede escalar su propio rol a `admin`/`superadmin`, reactivar su cuenta desactivada, subir su límite de sesiones o alterar su salario, usando el SDK de Firestore directamente (sin pasar por la UI ni por ningún guard de Angular, que son irrelevantes ante un ataque que use el SDK directo).

## Comportamiento actual que debemos preservar
`AuthService` (`core/services/auth.service.ts`) escribe hoy en `users/{uid}` desde el cliente en varios flujos legítimos:
- `signIn`: dentro de `runTransaction`, actualiza el mapa `sessions.{sessionId}` y `activeSessionsCount` (líneas 47-144).
- `signOut`: decrementa `activeSessionsCount`, actualiza `hasActiveSession`, elimina la sesión (líneas 152-186).
- `startHeartbeat`: actualiza `lastHeartbeat` dentro de `sessions.{sessionId}` cada 5 min (líneas 331-352).
- `cleanupInactiveSessions`, `resetUserSessions`, `fixSessionRoles`: variantes de lo anterior.

Todo esto debe seguir funcionando sin degradar UX ni romper el control de sesiones concurrentes.

## Comportamiento esperado
- Un usuario autenticado puede seguir actualizando **su propio** documento `users/{uid}` únicamente en los campos de sesión (`sessions`, `activeSessionsCount`, `hasActiveSession`) y en campos de perfil no sensibles a definir (p. ej. `avatarUrl`, `phone` si el flujo de perfil lo permite hoy — a confirmar contra `features/private/profile/`).
- Un usuario autenticado **no puede** escribir `role`, `active`, `activeUntil`, `maxSessions`, `salary`, `document`, `emergencyContact` en su propio documento salvo que sea `admin`/`superadmin`.
- `PENDIENTE DE DECISIÓN DEL USUARIO`: si Firestore Rules por sí solas no pueden expresar "puede escribir estos campos pero no estos otros" de forma suficientemente robusta para el caso de sesiones (Firestore Rules sí soporta `request.resource.data.diff(resource.data).affectedKeys()` para esto, es viable), se evalúa como alternativa mover la escritura de sesión a una Cloud Function callable (`touchSession`, `startSession`, `endSession`) en vez de reglas granulares. Esta Spec debe decidir el enfoque concreto durante el diseño de la Task 01.1, no antes — ambas opciones cierran el agujero, difieren en esfuerzo y en si tocan `AuthService`.

## Reglas de negocio
- Solo `admin`/`superadmin` puede cambiar el `role` de cualquier usuario (incluido el propio).
- Solo `admin`/`superadmin` puede cambiar `active`, `activeUntil`, `maxSessions`, `salary` de cualquier usuario.
- Un usuario puede seguir gestionando el ciclo de vida de su propia sesión (campos de sesión) sin necesitar rol admin.

## Datos de entrada / salida
Si se opta por Rules granulares: no aplica (es una regla declarativa). Si se opta por Cloud Function: `touchSession({sessionId}) → void`, `endSession({sessionId}) → void` (a definir en diseño).

## Validaciones
`firestore.rules` debe distinguir explícitamente los campos permitidos para auto-edición usando `affectedKeys()`, o la Function debe validar que el caller solo puede tocar su propia sesión.

## Permisos/autorización
`isAdmin()` (ya existente en `firestore.rules:11-14`) sigue siendo la función base para determinar admin/superadmin.

## Firestore collections/documents involucrados
`users/{uid}` (regla de escritura).

## Firebase Functions/API involucradas
Ninguna obligatoria si se resuelve con Rules granulares; potencialmente `touchSession`/`endSession` si se opta por esa alternativa.

## Dependencias
SPEC-00 (convenciones, si se opta por Function).

## Impacto en Angular
`AuthService` no debería requerir cambios si se resuelve con Rules granulares bien diseñadas (los campos que ya escribe son exactamente los que se permiten). Si se opta por Cloud Function, `AuthService.signIn/signOut/startHeartbeat` deben adaptarse a invocar la Function en vez de escribir Firestore directo — cambio de mayor alcance, a evaluar.

## Impacto potencial en Flutter
Si Flutter también inicia sesión escribiendo directo a `users/{uid}` (sin auditar en este análisis — pendiente), esta Spec podría romper su flujo de sesión si no se contempla. **Bloqueante:** antes de desplegar esta Spec a producción, auditar cómo `lequintmobile` maneja sesión/login contra Firestore.

## Impacto potencial en n8n/agente IA
Ninguno directo (el agente no gestiona sesiones de usuario humano), pero cierra uno de los riesgos más graves si el agente terminara operando con credenciales de un usuario normal en vez de una cuenta dedicada.

## Criterios de aceptación
- Un usuario no-admin no puede escribir `role`/`active`/`activeUntil`/`maxSessions`/`salary` en su propio documento (test de Rules que lo confirma).
- Un usuario no-admin sigue pudiendo hacer login/logout/heartbeat sin error de permisos (test de Rules + prueba manual en Angular).
- Un admin sigue pudiendo editar cualquier usuario sin restricción (comportamiento actual preservado).

## Estrategia de pruebas
1. Tests con `@firebase/rules-unit-testing` contra el emulador de Firestore: caso "usuario intenta auto-promoverse a admin" → debe fallar; caso "usuario actualiza su propio heartbeat" → debe pasar; caso "admin edita el rol de otro usuario" → debe pasar.
2. Prueba manual end-to-end en Angular contra el emulador: login, logout, esperar heartbeat, verificar que no hay errores de permisos en consola.
3. Si se optó por Cloud Function: tests de la Function en el emulador (caller intenta tocar la sesión de otro uid → debe rechazar).

## Riesgos de regresión
- Romper el login/logout/heartbeat es el riesgo más serio de todo este backlog en cuanto a "toda la app deja de funcionar" — por eso se prueba exhaustivamente antes de desplegar, y se recomienda desplegar primero en un proyecto Firebase de staging si existe, o al menos validar con el emulador de forma exhaustiva antes de `firebase deploy --only firestore:rules` a producción.
- Riesgo cruzado con `lequintmobile`: ver "Impacto potencial en Flutter" arriba — es bloqueante confirmarlo antes de desplegar.

---

## Tasks

### Task 01.1 — Diseñar el mecanismo (Rules granulares vs. Cloud Function de sesión)
- **Objetivo:** decidir el enfoque técnico concreto, documentando la decisión en esta misma Spec.
- **Archivos afectados:** ninguno todavía (diseño).
- **Dependencias:** ninguna.
- **Validación:** el usuario aprueba el enfoque antes de implementar.
- **Riesgos de regresión:** ninguno (es diseño).
- **Estado:** DECIDED (2026-08-17)
  - **Decisión del usuario:** Opción A — reglas de Firestore granulares con `affectedKeys()`. `AuthService` no se modifica; sigue escribiendo Firestore directo con los mismos campos de sesión que ya escribe hoy (`sessions`, `activeSessionsCount`, `hasActiveSession`). La regla `allow update` de `users/{uid}` en `firestore.rules` debe reescribirse para que un usuario no-admin solo pueda tocar esos campos de sesión en su propio documento, nunca `role`/`active`/`activeUntil`/`maxSessions`/`salary`/`document`/`emergencyContact`.
  - Se descartó por ahora la Opción B (Cloud Function de sesión: `touchSession`/`startSession`/`endSession`) por mayor esfuerzo y superficie de cambio en `AuthService`, aunque queda como posible evolución futura si se decide centralizar sesión en Functions más adelante.

### Task 01.2 — Auditar acceso a Firestore desde `lequintmobile`
- **Objetivo:** confirmar si Flutter escribe `users/{uid}` directo y con qué campos, para no romperlo.
- **Archivos afectados:** ninguno en `lequintweb` (auditoría en el otro repo).
- **Dependencias:** ninguna, pero bloquea el despliegue de esta Spec a producción.
- **Validación:** documento breve de hallazgos.
- **Riesgos de regresión:** N/A (es investigación).
- **Estado:** POSTPONED (2026-08-17) — decisión del usuario: no bloquea el diseño/implementación en `lequintweb` (Tasks 01.1/01.3). Sigue siendo **bloqueante explícito para Task 01.4 (despliegue a producción)** — no se hace `firebase deploy --only firestore:rules` sin haber confirmado antes que la regla nueva no rompe el login/sesión de `lequintmobile`.

### Task 01.3 — Implementar la regla/Function elegida
- **Objetivo:** implementar el mecanismo decidido en Task 01.1.
- **Archivos afectados:** `firestore.rules` (y `functions/src/auth/` si aplica Cloud Function), `core/services/auth.service.ts` (solo si se optó por Function).
- **Dependencias:** Task 01.1, 01.2.
- **Validación:** ver "Estrategia de pruebas".
- **Riesgos de regresión:** alto si no se prueba exhaustivamente — ver arriba.
- **Estado:** COMPLETED (2026-08-17)

  **Auditoría previa (antes de tocar la regla):** se revisó todo `src/app/` (excluyendo `examples/`) para inventariar cada write del cliente a su propio `users/{uid}`. Resultado — el único código que escribe en el propio documento es `core/services/auth.service.ts`, y toca exactamente estos campos:
  - `sessions.{sessionId}` (mapa: `createdAt`, `lastHeartbeat`, `role`) — `signIn`, `signOut`, `startHeartbeat`, `cleanupCurrentSession` (beforeunload), `resetUserSessions` (también usado por un admin sobre otro usuario, mismos campos).
  - `activeSessionsCount`, `hasActiveSession` — mismos métodos.
  - `fcmToken` — `saveFCMToken` (wired pero sin ningún caller en la UI hoy; se dejó permitido igualmente porque `UserService` ya lo expone).
  - `maxSessions` — únicamente en `ensureUserDocument`, y únicamente para fijarlo en `1` cuando el documento no lo tiene (auto-reparación de documentos antiguos).
  - `features/private/profile/` **no** edita ningún campo de `users/{uid}` directamente (solo expone el botón "cerrar todas mis sesiones", que reusa `resetUserSessions`) — no hay edición de avatar/teléfono/nombre desde el propio perfil, así que no hizo falta permitir esos campos.
  - **Hallazgo colateral (bug preexistente, no corregido en esta Task — fuera de alcance):** la rama de `ensureUserDocument` que crea el documento de un usuario nuevo (línea ~313) usa `UserRepository.create()` → `addDoc()` sobre la colección `users`, que genera un ID aleatorio en vez de escribir en `users/{uid}`. O sea, el autoaprovisionamiento de usuario en el primer login **no** aterriza en `users/{uid}` — este flujo no es afectado por la regla nueva (`allow create` no cambió), pero queda documentado como algo a revisar en una Task futura si algún día se habilita registro público real (hoy los usuarios se crean vía el módulo admin `features/private/users`, no por autoregistro).

  **Regla implementada** en `firestore.rules`, dentro de `match /users/{userId}`: `allow update` ahora es `isAdmin() || isSelfUpdate(userId)`, con dos funciones nuevas:
  - `isSelfSessionUpdate()`: usa `request.resource.data.diff(resource.data).affectedKeys().hasOnly([...])` contra la whitelist `['sessions', 'activeSessionsCount', 'hasActiveSession', 'fcmToken']` — bloquea cualquier escritura que toque un campo fuera de esa lista, incluso si viene empaquetada junto a un write de sesión legítimo en la misma petición.
  - `isSelfMaxSessionsHeal()`: permite tocar `maxSessions` en solitario **solo** si el nuevo valor es exactamente `1` (replica el único caso real de `ensureUserDocument`; no sirve para subir el límite).
  - El resto de `firestore.rules` (otras 12 colecciones) no se tocó.

  **Pruebas — emulador real de Firestore, no mocks.** Este entorno (devcontainer) no tenía `firebase-tools` ni un JRE instalado; se instalaron para esta verificación:
  - `default-jre-headless` vía `apt-get install` (paquete de sistema, no queda registrado en el repo — **si el devcontainer se reconstruye, hay que reinstalarlo o añadirlo al Dockerfile/postCreate** para poder volver a correr estas pruebas o las de Specs futuras que también usen el emulador).
  - `firebase-tools` instalado en el scratchpad de la sesión (no en el repo), solo para invocar `emulators:exec`.
  - Nuevo directorio `firestore-tests/` (Node puro, aislado de Angular/Karma y de `functions/`+Jest — proyecto propio con su `package.json`, dependencias `@firebase/rules-unit-testing` + `firebase`, y `node --test` como runner) con `rules.test.js`: 15 casos, todos corridos contra `firebase emulators:exec --only firestore` (emulador real, JAR de Firestore descargado, sin mocks):
    1. Usuario no-admin NO puede auto-asignarse `role=admin` → falla (confirmado).
    2. Usuario no-admin NO puede reactivar su propia cuenta (`active: false→true`) → falla.
    3. Usuario no-admin NO puede subir su propio `maxSessions` → falla.
    4. Usuario no-admin NO puede tocar `salary`/`activeUntil`/`document`/`emergencyContact` propios → falla (4 sub-casos).
    5. Usuario no-admin NO puede escalar `role` empaquetándolo junto a un write de sesión legítimo en la misma petición → falla (prueba específica de que `affectedKeys()` no se puede burlar mezclando campos).
    6. Usuario no-admin NO puede escribir la sesión de OTRO usuario → falla.
    7. Usuario sin autenticar NO puede escribir ningún campo → falla (comportamiento preexistente, confirmado que sigue igual).
    8. `signIn`: usuario puede crear su propia sesión (`sessions`+`activeSessionsCount`+`hasActiveSession` en una sola escritura, igual que hace `AuthService.signIn`) → **pasa**.
    9. `startHeartbeat`: usuario puede actualizar `sessions.{id}.lastHeartbeat` → **pasa**.
    10. `signOut`: usuario puede cerrar su propia sesión → **pasa**.
    11. `saveFCMToken`: usuario puede escribir su propio `fcmToken` → **pasa**.
    12. `ensureUserDocument`: usuario puede autorepararse `maxSessions=1` cuando falta → **pasa**.
    13. Admin SÍ puede cambiar el `role` de otro usuario → **pasa** (comportamiento actual preservado).
    14. Admin SÍ puede reactivar/desactivar a otro usuario → **pasa**.
    15. Cualquier usuario autenticado sigue pudiendo leer `users/{uid}` (regla de lectura no se tocó) → **pasa**.
  - Resultado: **15/15 en verde** (`node --test` — `pass 15, fail 0`).

  **Archivos nuevos/modificados en esta Task:** `firestore.rules` (regla `users/{userId}` reescrita), `firebase.json` (bloque `emulators.firestore.port: 8080`, aditivo, no afecta despliegue), `.gitignore` (añadidos `firebase-debug.log`/`firestore-debug.log`/`ui-debug.log`, generados al correr el emulador), `firestore-tests/` (nuevo, con su propio `.gitignore` para `node_modules/`).

  **No verificado todavía (pendiente):** prueba manual end-to-end en Angular real contra el emulador (login/logout/heartbeat visual, sin errores de consola) — la Task 01.3 según el Spec original pedía esto como parte de la "Estrategia de pruebas"; se decidió, en línea con el enfoque acordado de esta sesión ("dejar las revisiones de comportamiento real para el final"), priorizar cerrar primero el diseño+pruebas automatizadas de `lequintweb` y dejar la validación manual en vivo agrupada con Task 01.4 (que de todos modos la requiere explícitamente antes de desplegar a producción).

### Task 01.4 — Desplegar y verificar en producción con monitoreo
- **Objetivo:** desplegar `firestore.rules` actualizadas, verificar login/logout real de al menos un usuario de cada rol.
- **Archivos afectados:** despliegue (`firebase deploy --only firestore:rules`).
- **Dependencias:** Task 01.3.
- **Validación:** confirmación manual del usuario de que todos los roles pueden seguir iniciando/cerrando sesión con normalidad.
- **Riesgos de regresión:** alto — es el único punto de este backlog que toca el mecanismo de login de todos los usuarios existentes. Tener plan de rollback de `firestore.rules` (versión anterior guardada) listo antes de desplegar.
- **Estado:** PENDING (bloqueada además por Task 01.2)

---

## Addendum crítico (2026-08-17, durante SPEC-05): bug real de `AuthService` encontrado al probar contra la app real

Al llegar a la Task 05.3 de SPEC-05 (adaptar `BookingService.createBooking` para usar la nueva Function), se decidió verificar el flujo con la app Angular real corriendo contra los emuladores de Firestore/Functions/Auth — no solo con los tests de `firestore-tests/` que ya habían dado 15/15 en verde para esta Spec. Esa verificación **encontró un problema real que los tests de `rules-unit-testing` no habían detectado**, y que habría roto el login de todos los usuarios si la regla de SPEC-01 se desplegaba tal cual estaba.

**El bug (preexistente, no introducido por esta migración):** `AuthService` escribe la sesión del usuario con `setDoc(userRef, { [\`sessions.\${sessionId}\`]: {...} }, { merge: true })` en `signIn`, `signOut`, `startHeartbeat`, `resetUserSessions`, `cleanupInactiveSessions`, `cleanupCurrentSession` y `fixSessionRoles`. Se confirmó experimentalmente (escribiendo y releyendo el documento resultante contra el emulador) que **`setDoc(ref, data, {merge:true})` con una clave de objeto que contiene un punto NO la interpreta como ruta anidada** — a diferencia de `updateDoc()`, que sí lo hace. El resultado real en Firestore era un campo top-level literal llamado `"sessions.abc123"` (con el punto como parte del nombre), no un mapa `sessions` con `abc123` como sub-clave. El propio código de `resetUserSessions` ya tenía evidencia de esto en un comentario ("eliminar los campos duplicados de lastHeartbeat si existen") — el equipo original ya se había topado con el síntoma sin identificar la causa raíz.

**Por qué esto nunca fue un problema antes de SPEC-01:** la regla vieja (`allow update: if isAdmin() || request.auth.uid == userId`) permitía que un usuario escribiera *cualquier* campo en su propio documento, sin inspeccionar cuáles. La regla nueva de SPEC-01 sí inspecciona los campos afectados (`affectedKeys().hasOnly([...])`), y el campo literal `"sessions.abc123"` no coincide con `'sessions'` en la lista permitida → la escritura de sesión de `signIn` quedaba rechazada con `permission-denied`, y el login fallaba con un diálogo real "Permisos Insuficientes" en la UI.

**Cómo se encontró:** se montó un entorno real de prueba (emuladores Firestore+Functions+Auth + `ng serve` apuntando a ellos vía un flag nuevo `environment.useEmulators`, ver más abajo) y se automatizó el login con un navegador headless (Playwright). El primer intento de login falló con ese diálogo de permisos. Se aisló la causa con una serie de tests de reproducción en `firestore-tests/` que confirmaron, paso a paso: (1) `updateDoc` con la misma clave punteada funciona bien contra la regla; (2) `setDoc(...,{merge:true})` con la misma clave falla; (3) inspeccionando el documento resultante de un `setDoc` de prueba, se confirmó que la clave se guarda literal, no anidada.

**Decisión del usuario:** arreglar `AuthService` (no la regla). Se reemplazaron los 7 call sites que usaban `setDoc(...,{merge:true})` con claves punteadas por `updateDoc()` (o `tx.update()` dentro de las transacciones de `signIn`/`signOut`/`cleanupInactiveSessions`), que sí interpreta las claves punteadas como ruta anidada. Esto **corrige un bug de datos real y preexistente** (los campos `"sessions.X"` duplicados/literales que `resetUserSessions` ya intentaba limpiar) además de hacer que la regla de SPEC-01 funcione correctamente. Archivo modificado: `src/app/core/services/auth.service.ts` (import de `setDoc` reemplazado por `updateDoc`; sin cambios de comportamiento salvo la corrección del bug de anidamiento).

**Verificación tras el fix:** con `AuthService` corregido, el login del usuario de prueba (`test.receptionist@lequinthotel.test`, rol `receptionist`, sin campo `sessions` previo) llegó limpiamente a `/dashboard` en dos corridas separadas del navegador automatizado, sin errores de permisos en la escritura de sesión — confirmado con logs de consola y de red capturados por Playwright.

**Infraestructura nueva para esta verificación** (queda en el repo, apagada por defecto):
- `environment.ts`/`environment.prod.ts`: campo nuevo `useEmulators` (default `false` en ambos). `environment.prod.ts` lo fuerza a `false` explícitamente.
- `app.module.ts`: `provideAuth`/`provideFirestore`/`provideFunctions` ahora llaman `connectAuthEmulator`/`connectFirestoreEmulator`/`connectFunctionsEmulator` condicionalmente si `environment.useEmulators` es `true`. Con el flag en `false` (su estado actual en el repo), el comportamiento es idéntico al de antes — cero riesgo para producción.
- `firebase.json`: bloque `emulators` ampliado con `functions` (puerto 5001), `auth` (puerto 9099) y `ui` (puerto 4001), además del `firestore` ya existente de SPEC-01.

**Limitación encontrada — no se pudo completar la regresión visual completa vía UI:** después de confirmar el login, se intentó continuar el flujo hasta crear una reserva real desde la UI (`/bookings` → "Nueva Reserva" → completar el stepper → enviar). La pestaña de Chromium headless **crasheó o se colgó de forma no determinística al navegar a `/bookings`** (la página más pesada de la app: stepper multi-paso + datepicker + varios módulos de Material) — en corridas repetidas, sin ningún error de consola ni rechazo de Firestore visible cuando llegó a renderizar parcialmente. Se investigó memoria disponible del sandbox (cayó a ~1.8 GB libres de 8 GB con `ng serve` + emuladores + Chromium + el propio VS Code Server corriendo a la vez) y, tras liberar memoria matando procesos y reintentar con ~4 GB libres, **volvió a crashear igual** — así que no se puede confirmar con certeza que sea solo un problema de recursos, aunque es la explicación más probable dado que no hay ninguna señal de error real en ningún intento. **No se descarta que sea un problema real de la app**, pero tampoco hay evidencia de ello. Queda como verificación pendiente, recomendada en un entorno con más recursos o corrida directamente por el usuario.
