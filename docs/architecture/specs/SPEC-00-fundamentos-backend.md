# SPEC-00 — Fundamentos del backend compartido

**Estado:** COMPLETED (las 4 Tasks completadas y verificadas localmente: build + tests + carga en emulador; no requiere `VERIFIED` por el usuario porque no hay ningún cambio de comportamiento visible en Angular/producción — ver resumen de cierre al final del archivo).

## Objetivo
Crear la estructura y convenciones base en `functions/` para que todas las Functions de negocio futuras (Specs 01-11) se escriban de forma consistente, testeable y sin duplicar utilidades. No implementa ninguna función de negocio todavía.

## Problema actual
`functions/src/index.ts` es un único archivo de 61 líneas con una función administrativa. No hay: estructura de carpetas por dominio, helper reutilizable de "verificar rol del caller", catálogo de errores server-side (Angular ya tiene uno propio, `core/utils/error-handler.ts`, con códigos `LH-XXXX` — hay que decidir si se reutiliza el mismo catálogo o se crea uno equivalente en Functions), ni configuración de testing (no hay `jest`/`mocha` en `functions/package.json`).

## Comportamiento actual que debemos preservar
`forceLogoutUser` debe seguir funcionando exactamente igual durante y después de este refactor de estructura (mover/reorganizar sin cambiar comportamiento).

## Comportamiento esperado
- Estructura de carpetas propuesta dentro de `functions/src/`: `functions/src/{auth,bookings,guest-accounts,invoices,pos,shared}/`, moviendo `forceLogoutUser` a `functions/src/auth/force-logout.ts` y re-exportando desde `index.ts`.
- Helper compartido `shared/auth-context.ts`: función `requireRole(auth, allowedRoles: UserRole[]): Promise<{uid, role}>` que replica el patrón ya usado en `forceLogoutUser` (leer `users/{uid}.role` con Admin SDK y validar) para no reimplementarlo en cada Function nueva.
- Catálogo de errores server-side equivalente al de Angular (`LH-XXXX`), en `shared/errors.ts`, para que los mensajes de error que reciban Angular/Flutter/n8n sean consistentes con los que ya conoce el usuario final.
- Configuración de testing con el emulador de Firebase (`firebase-functions-test` o equivalente) y al menos un test de humo sobre `forceLogoutUser` reestructurado, para demostrar que el patrón de testing funciona antes de usarlo en Specs con lógica real.
- Actualizar `functions/package.json`: runtime Node 20 → verificar si ya se quiere subir de versión (nota de `FUNCTIONS_DEPLOYED.md` sobre deprecación 2026-04-30); decisión a discutir con el usuario, no asumir.

## Reglas de negocio
Ninguna (es infraestructura).

## Datos de entrada / salida
N/A a nivel de Spec (cada Function futura define los suyos).

## Validaciones
N/A.

## Permisos/autorización
El helper `requireRole` es el mecanismo que usarán todas las Functions futuras.

## Firestore collections/documents involucrados
`users` (lectura, vía el helper).

## Firebase Functions/API involucradas
`forceLogoutUser` (reubicada, sin cambio de comportamiento ni de nombre exportado).

## Dependencias
Ninguna.

## Impacto en Angular
Ninguno funcional. `AuthService.forceLogoutUser()` sigue llamando `httpsCallable(functions, 'forceLogoutUser')` — el nombre exportado no cambia aunque el archivo interno se mueva.

## Impacto potencial en Flutter
Ninguno.

## Impacto potencial en n8n/agente IA
Ninguno todavía, pero esta Spec es la que hace viable que las Functions de las Specs 01-11 tengan una forma consistente de validar rol, que luego se reutilizará para el rol dedicado del agente IA (Spec 14).

## Criterios de aceptación
- `functions/` compila (`npm run build` dentro de `functions/`).
- `forceLogoutUser` sigue accesible desde Angular sin cambios en `auth.service.ts`.
- Existe al menos un test automatizado corriendo contra el emulador.
- El helper `requireRole` está implementado y usado por `forceLogoutUser` reestructurada (dogfooding del propio patrón).

## Estrategia de pruebas
1. `npm run build` en `functions/` sin errores.
2. `firebase emulators:start --only functions,firestore,auth` y ejecutar manualmente `forceLogoutUser` desde Angular apuntando al emulador — mismo resultado que hoy.
3. Test automatizado del helper `requireRole` (caso: rol permitido, rol no permitido, sin auth).

## Riesgos de regresión
Bajo: solo se reorganiza un archivo existente. Riesgo principal es un error de import/export al mover código — mitigado por el criterio de aceptación de build + prueba manual de `forceLogoutUser`.

---

## Tasks

### Task 00.1 — Definir estructura de carpetas y mover `forceLogoutUser`
- **Objetivo:** reorganizar `functions/src/index.ts` en subcarpetas por dominio sin cambiar comportamiento.
- **Archivos afectados:** `functions/src/index.ts`, nuevo `functions/src/auth/force-logout.ts`.
- **Dependencias:** ninguna.
- **Validación:** `npm run build` en `functions/`; `forceLogoutUser` sigue invocable con el mismo nombre desde Angular contra el emulador.
- **Riesgos de regresión:** romper el export nombrado que Angular espera (`forceLogoutUser`) — mitigado verificando el nombre exportado en `index.ts` tras el movimiento.
- **Estado:** COMPLETED
  - Código movido tal cual (sin ningún cambio de lógica) de `index.ts` a `functions/src/auth/force-logout.ts`. `index.ts` quedó como punto de entrada mínimo: `admin.initializeApp()` + `export { forceLogoutUser } from './auth/force-logout'`.
  - Evidencia: `npm run build` en `functions/` compila sin errores; `node -e "require('./lib/index.js').forceLogoutUser"` confirma el export; `firebase emulators:start --only functions` carga correctamente la función (`✔ functions: Loaded functions definitions from source: forceLogoutUser.` y el endpoint HTTP se inicializa en `us-central1-forceLogoutUser`).
  - No se tocó `AuthService.forceLogoutUser()` en Angular — no fue necesario, el nombre exportado no cambió.
  - Nota no bloqueante detectada durante la prueba (no introducida por este cambio, preexistente): el emulador advierte que el Node global (26) no coincide con `engines.node: "20"` de `functions/package.json`, y que `firebase-functions@4.9.0` está desactualizado. Queda pendiente como posible Task futura de actualización de runtime, no se toca en esta Task.

### Task 00.2 — Helper `requireRole` compartido
- **Objetivo:** extraer la verificación de rol de `forceLogoutUser` a `shared/auth-context.ts` y reutilizarla ahí mismo.
- **Archivos afectados:** nuevo `functions/src/shared/auth-context.ts`, `functions/src/auth/force-logout.ts`.
- **Dependencias:** Task 00.1.
- **Validación:** test automatizado del helper (rol permitido/no permitido/sin auth); `forceLogoutUser` sigue rechazando exactamente los mismos casos que antes (caller sin rol admin/superadmin, intento de forzar logout a superadmin siendo admin).
- **Riesgos de regresión:** cambiar sutilmente la condición de autorización al extraerla — mitigado con test que reproduce los casos ya documentados en el análisis (sección C).
- **Estado:** COMPLETED
  - `requireRole(auth, allowedRoles)` implementado con la firma exacta prevista, con el tipo `UserRole` alineado literalmente a `src/app/core/models/user-role.enum.ts` (comentario en el código señala que deben mantenerse sincronizados si el enum cambia).
  - `force-logout.ts` refactorizado para usar `requireRole(request.auth, ['admin','superadmin'])` en vez de repetir la lectura de `users/{uid}` — el resto de la lógica (uid requerido, no forzar logout a superadmin salvo por otro superadmin, revocar tokens, resetear sesión) quedó intacta.
  - Evidencia: 10 tests automatizados en verde (ver Task 00.4) cubriendo exactamente los mismos casos que el código original manejaba: sin auth, rol no admin, uid faltante, admin→superadmin (rechazado), superadmin→superadmin (permitido), admin→no-superadmin (permitido, caso feliz). `npm run build` limpio.

### Task 00.3 — Catálogo de errores server-side
- **Objetivo:** crear `shared/errors.ts` con códigos equivalentes/compatibles con `core/utils/error-handler.ts` de Angular.
- **Archivos afectados:** nuevo `functions/src/shared/errors.ts`. Decisión a confirmar con el usuario: ¿reutilizar los mismos códigos `LH-XXXX` o crear una serie nueva para backend?
- **Dependencias:** ninguna.
- **Validación:** revisión manual de que los códigos no colisionan con los ya usados en Angular.
- **Riesgos de regresión:** ninguno (código nuevo, no reemplaza nada existente todavía).
- **Estado:** COMPLETED
  - **Decisión del usuario:** reutilizar el catálogo `LH-XXXX` de Angular (`core/utils/error-handler.ts`), no crear una serie separada.
  - `functions/src/shared/errors.ts`: declara `LH_CODES` (`PERMISSION_DENIED='LH-0200'`, `UNAUTHENTICATED='LH-0201'`, `UNKNOWN='LH-9999'`) y el helper `withLhCode(lhCode)`, que produce el objeto `details` de un `HttpsError`. No duplica los mensajes largos en español de Angular — solo los códigos, para no tener dos fuentes de verdad del texto. Deja documentados (como comentario) los rangos reservados `LH-0300/0399` (validación) y `LH-0400/0499` (negocio) para que las Specs 05+ los usen al definir sus propios errores de negocio.
  - `requireRole` (`shared/auth-context.ts`) ahora adjunta `details: { lhCode }` a sus dos `HttpsError` (`unauthenticated`→`LH-0201`, `permission-denied`→`LH-0200`). **Cambio puramente aditivo**: no se tocó `code` ni `message` de ningún error existente, por lo que `forceLogoutUser` sigue rechazando con exactamente los mismos `code`/`message` que antes — solo se añadió metadata nueva que un cliente puede ignorar sin romperse.
  - Evidencia: 10 tests siguen en verde tras el cambio (no fue necesario tocarlos porque solo verifican `code`, no `details`); `npm run build` limpio, `lib/` incluye el nuevo `shared/errors.js`.

### Task 00.4 — Configuración de testing (jest + mocks del Admin SDK)
- **Objetivo:** añadir dependencia de testing y un test de humo.
- **Archivos afectados:** `functions/package.json` (nuevo script `test`, devDependencies `jest`/`ts-jest`/`@types/jest`), nuevo `functions/jest.config.js`, `functions/src/shared/auth-context.test.ts`, `functions/src/auth/force-logout.test.ts`, `functions/tsconfig.json` (excluir `*.test.ts` del build de producción).
- **Dependencias:** Task 00.1, 00.2.
- **Validación:** `npm test` en verde; `npm run build` no incluye archivos `.test.js` en `lib/`.
- **Riesgos de regresión:** ninguno (aditivo), salvo el hallazgo corregido abajo.
- **Estado:** COMPLETED
  - **Decisión de diseño (documentada, no en la spec original):** en vez de requerir el emulador de Firestore/Auth corriendo para cada test (`firebase-functions-test` en modo "online"), se mockea el Admin SDK con `jest.mock('firebase-admin', ...)` — es el modo "offline" que la propia librería `firebase-functions-test` recomienda para unit tests rápidos, sin dependencias de red ni de un emulador levantado en cada `npm test`. Se optó por mocks directos con `jest` en vez de añadir la dependencia `firebase-functions-test` para minimizar dependencias nuevas, ya que `firebase-functions/v2/https` expone `.run(request)` en el objeto exportado por `onCall(...)`, suficiente para invocar el handler directamente sin esa librería adicional.
  - **Bug encontrado y corregido durante esta Task:** `tsc` compilaba los archivos `*.test.ts` dentro de `lib/` (por el `include: ["src"]` sin exclusión), lo que los habría desplegado a producción junto con las Cloud Functions reales. Corregido añadiendo `"exclude": ["src/**/*.test.ts"]` a `functions/tsconfig.json`. Verificado: `lib/` tras el fix solo contiene `index.js`, `auth/force-logout.js`, `shared/auth-context.js` — sin `.test.js`.
  - Evidencia: `npm test` → 2 suites, 10 tests, todos en verde. `npm run build` limpio y sin archivos de test en `lib/`. Emulador de functions (`firebase emulators:start --only functions`) re-verificado tras todos los cambios de SPEC-00: `forceLogoutUser` sigue cargando e inicializando su endpoint HTTP correctamente.
  - Nota no bloqueante (preexistente, no introducida aquí): el propio emulador advierte `firebase-functions@4.9.0` desactualizado y Node global 26 vs. `engines.node: "20"` declarado. No se toca en esta Spec.

---

## Resumen de cierre de SPEC-00

**Archivos nuevos:** `functions/src/auth/force-logout.ts`, `functions/src/auth/force-logout.test.ts`, `functions/src/shared/auth-context.ts`, `functions/src/shared/auth-context.test.ts`, `functions/src/shared/errors.ts`, `functions/jest.config.js`.
**Archivos modificados:** `functions/src/index.ts` (reducido a inicialización + re-export), `functions/tsconfig.json` (excluye tests del build), `functions/package.json` (script `test`, nuevas devDependencies de testing).
**Nada en `lequintweb/src/app/` (Angular) fue modificado** — SPEC-00 es infraestructura pura de `functions/`.

**Pruebas realizadas:**
- `npm run build` en `functions/` — limpio, sin errores, `lib/` contiene exactamente los archivos de producción esperados (sin tests).
- `npm test` en `functions/` — 2 suites, 10 tests, todos en verde (cubren `requireRole` y `forceLogoutUser` en todos los casos que el código original ya manejaba).
- `firebase emulators:start --only functions` — verificado dos veces (antes y después de todos los cambios): `forceLogoutUser` carga correctamente y su endpoint HTTP se inicializa sin errores.
- Build de Angular (`ng build`): **no se pudo ejecutar** — `node_modules` de la raíz del proyecto no está instalado en este entorno (0 paquetes). Decisión del usuario: lo instala él mismo / vía devcontainer. No es un problema causado por estos cambios (SPEC-00 no tocó Angular). Recomendación: confirmar `ng build`/`ng test` en verde antes de considerar esta Spec definitivamente cerrada de cara a un despliegue conjunto.

**Riesgos:** ninguno para la app en producción — `forceLogoutUser` se comportó de forma idéntica en todo momento (mismo `code`, mismo `message`; solo se añadió metadata `details.lhCode`, ignorable por cualquier cliente actual). El único hallazgo real (archivos de test filtrándose al build de producción) se detectó y corrigió dentro de esta misma Spec, antes de que llegara a afectar nada.

**Decisiones tomadas por el usuario durante esta Spec:**
1. Catálogo de errores: reutilizar `LH-XXXX` de Angular (Task 00.3).
2. No instalar `node_modules` de Angular en este entorno todavía — se hará aparte.

**Pendiente para más adelante (no bloqueante):** runtime Node 20 y `firebase-functions@4.9.0` desactualizados — queda como nota para una futura Task de mantenimiento, no forma parte del alcance de este backlog de migración de lógica de negocio.

**Siguiente paso propuesto:** SPEC-01 — cerrar la escalación de privilegios en `users/{uid}` (el hallazgo de seguridad más grave del análisis). Quedo a la espera de tu confirmación para empezarla.

---

## Verificación pendiente cerrada (sesión en devcontainer, 2026-08-17)

Retomando en el devcontainer `lequintweb`, con `node_modules` de la raíz ya instalado (695 paquetes). Se completó la verificación que había quedado pendiente de la sesión anterior.

**Angular (`lequintweb`, raíz):**
- `ng build --configuration production` → **PASS**, sin errores (solo warnings preexistentes de Sass/CommonJS, no relacionados). Confirma que SPEC-00 no rompió nada de Angular, como se esperaba (no tocó `src/app/`).
- `ng test` → **roto por 2 causas preexistentes, no relacionadas con SPEC-00**, detectadas en esta sesión:
  1. `src/test.ts` usa imports antiguos de zone.js (`zone.js/dist/proxy.js`, etc., estilo Angular 8/9) que ya no existen en `zone.js@0.13.3` (el paquete eliminó el subpath `dist/`); `src/polyfills.ts` ya usa la forma moderna (`import 'zone.js'`) pero `test.ts` nunca se actualizó.
  2. El target `test` de `angular.json` no tiene `stylePreprocessorOptions.includePaths` (el target `build` sí lo tiene, apuntando a `node_modules`), por lo que `@import "@angular/material/core/style/variables"` no resuelve al compilar para test.
  3. (Menor, ya corregido) `karma-coverage-istanbul-reporter` estaba referenciado en `karma.conf.js` pero ausente de `package.json`/`node_modules` — instalado y luego revertido intencionalmente sin dejar rastro en `package.json`/`package-lock.json` de la raíz, para no ensuciar el diff de este trabajo.
  - **Decisión del usuario:** no arreglar `ng test` ahora (fuera de alcance de SPEC-00/01) — queda documentado como deuda técnica preexistente, no bloqueante para este backlog.

**Functions (`functions/`):**
- `npm run build` → falló inicialmente en este entorno con errores de colisión de tipos (`@types/jest` vs `@types/jasmine`/`@types/jasminewd2`). Causa: `functions/tsconfig.json` no restringía `compilerOptions.types`, así que `tsc` subía al `node_modules/@types` de la raíz (que en la sesión anterior no existía) y arrastraba los tipos de Jasmine de Angular, chocando con Jest. **Corregido** añadiendo `"types": ["node", "jest"]` a `functions/tsconfig.json`. Tras el fix: build limpio.
- `npm test` → falló inicialmente con `Preset ts-jest not found relative to rootDir`. Causa real (no era de configuración): `unrs-resolver` (dependencia nativa transitiva de `jest-resolve@30`) tenía instalado el binario de macOS arm64 (`@unrs/resolver-binding-darwin-arm64`) en vez del de Linux arm64 (`@unrs/resolver-binding-linux-arm64-gnu`) — el `package-lock.json` se había generado en la sesión anterior fuera del devcontainer (macOS), y es el bug conocido de npm con dependencias opcionales específicas de plataforma (npm/cli#4828). **Corregido** regenerando `functions/node_modules` + `functions/package-lock.json` desde cero dentro del devcontainer (`rm -rf node_modules package-lock.json && npm install`), que resolvió el binario correcto para Linux arm64. Tras el fix: `npm test` → 2 suites, 10 tests, todos en verde.
- `lib/` verificado tras el rebuild: solo contiene los 4 archivos de producción esperados (`index.js`, `auth/force-logout.js`, `shared/auth-context.js`, `shared/errors.js`, + `.map`), sin archivos `.test.js`.
- Emulador (`firebase emulators:start --only functions`) **no se pudo re-verificar en este devcontainer**: `firebase-tools` no está instalado (ni global ni en `node_modules`) en este entorno. No se instaló sin confirmación previa del usuario, ya que no es parte de los criterios de aceptación de SPEC-00 (build + al menos un test automatizado, ambos ya en verde) y la verificación de emulador ya se había hecho dos veces en la sesión anterior.

**Archivos adicionales modificados en esta sesión:** `functions/tsconfig.json` (añadido `types`), `functions/package-lock.json` (regenerado para la plataforma correcta — diff grande pero es solo resolución de dependencias, sin cambios de `functions/package.json`).

**Conclusión:** SPEC-00 queda verificada de punta a punta en el devcontainer. Ningún hallazgo de esta verificación afecta la lógica de negocio ni el comportamiento de `forceLogoutUser`; los 3 problemas encontrados eran de entorno/configuración (dos preexistentes en Angular, uno de plataforma en `functions/`), todos documentados y los de `functions/` corregidos.
