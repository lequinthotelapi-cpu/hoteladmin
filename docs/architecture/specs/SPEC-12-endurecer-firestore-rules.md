# SPEC-12 — Endurecimiento progresivo de `firestore.rules`

**Estado:** PENDING
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
| `bookings` | 05, 06, 07, 08 | PENDING | NO |
| `guestAccounts` | 07, 09 | PENDING | NO |
| `invoices` | 10 | PENDING | NO |
| `sales` / `products` (stock) | 11 | PENDING | NO |
| `users` (campos sensibles) | 01 | PENDING | NO |
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
- **Estado:** PENDING · requiere decisión del usuario.
