# SPEC-13 — Contratos compartidos (Flutter/n8n)

**Estado:** PENDING

## Objetivo
Documentar formalmente el contrato (entrada/salida/errores) de cada Cloud Function de negocio construida en las Specs 01-11, para que Flutter y n8n puedan integrarse sin necesidad de leer el código TypeScript de Functions ni adivinar comportamiento.

## Problema actual
No existe ningún contrato documentado de las Functions porque, salvo `forceLogoutUser`, no existían Functions de negocio antes de este proyecto.

## Comportamiento actual que debemos preservar
N/A (es documentación nueva).

## Comportamiento esperado
Un documento (`docs/architecture/CONTRATOS-API.md`, o generado desde los tipos TypeScript de `functions/src/*/types.ts` si se decide esa vía) por cada callable ya `VERIFIED`, con: nombre, input, output, errores posibles (código + significado), rol requerido, ejemplo de payload. **Decisión a tomar con el usuario:** ¿basta con un documento Markdown curado a mano, o vale la pena invertir en generar un paquete de tipos TypeScript compartido (consumible por Angular directamente, y como referencia — no ejecución directa — para Flutter/n8n)? Esto es una decisión de alcance, no se asume.

## Reglas de negocio
N/A.

## Datos de entrada / salida
N/A a nivel de esta Spec (documenta los de las Functions ya construidas).

## Validaciones
N/A.

## Permisos/autorización
El documento debe dejar explícito el rol requerido por cada Function, para que quien diseñe el rol dedicado del agente IA (Spec 14) sepa exactamente qué necesita.

## Firestore collections/documents involucrados
N/A.

## Firebase Functions/API involucradas
Todas las de Specs 01-11 ya `VERIFIED` al momento de escribir esta Spec.

## Dependencias
Al menos las Specs 05-08 (dominio de reservas) en estado VERIFIED — no tiene sentido documentar contratos de Functions que todavía no existen o no están probadas.

## Impacto en Angular
Ninguno funcional — es documentación. Puede motivar extraer los tipos de input/output a un archivo compartido si el equipo decide invertir en ello, pero no es obligatorio para esta Spec.

## Impacto potencial en Flutter
Es el habilitador directo para que el equipo de Flutter empiece a integrar estas Functions con información completa y sin ambigüedad.

## Impacto potencial en n8n/agente IA
Es el habilitador directo de la Spec 14 — el diseño del agente conversacional necesita el contrato exacto de cada Function que va a poder invocar (qué datos pedir al usuario, qué errores puede recibir y cómo traducirlos a lenguaje natural).

## Criterios de aceptación
Cada Function de negocio ya `VERIFIED` tiene su contrato documentado con ejemplo de payload real probado contra el emulador.

## Estrategia de pruebas
No aplica prueba de código — se valida por revisión (¿el contrato documentado coincide exactamente con lo que la Function realmente acepta/devuelve, verificado contra un test real, no contra la intención original?).

## Riesgos de regresión
Ninguno (documentación).

---

## Tasks

### Task 13.1 — Decidir alcance: Markdown curado vs. paquete de tipos compartido
- **Dependencias:** ninguna.
- **Validación:** decisión del usuario.
- **Estado:** PENDING · requiere decisión del usuario.

### Task 13.2 — Documentar contrato de cada Function ya VERIFIED
- **Dependencias:** Task 13.1; Specs 05-11 en VERIFIED (al menos las que se quieran exponer primero).
- **Validación:** contrato verificado contra un test real, no contra la intención de diseño.
- **Estado:** PENDING
