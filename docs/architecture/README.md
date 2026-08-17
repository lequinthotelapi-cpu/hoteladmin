# Migración a arquitectura de backend centralizado — índice

Objetivo del proyecto: que `lequintweb` (Angular), `lequintmobile` (Flutter) y el futuro agente de IA (n8n/WhatsApp) usen la **misma** lógica de negocio, centralizada en Firebase Functions, sin romper nada de lo que hoy funciona en Angular.

Metodología: Spec-Driven Development (SDD). Ningún código de aplicación se toca hasta aprobar el backlog. Después, se trabaja **una Spec/Task a la vez**.

```
ANÁLISIS → ARQUITECTURA OBJETIVO → SPECS → TASKS → IMPLEMENTACIÓN INCREMENTAL → PRUEBAS → SIGUIENTE TASK
```

## Documentos

1. [`01-ANALISIS-Y-ARQUITECTURA.md`](./01-ANALISIS-Y-ARQUITECTURA.md) — **FASE 1 (completa)**: arquitectura actual, inventario de lógica de negocio, Firebase Functions existentes, qué queda en Angular vs. qué se centraliza, problemas y riesgos encontrados (incluye hallazgos de seguridad urgentes), arquitectura objetivo, plan de migración, orden recomendado, riesgos de regresión, pruebas recomendadas.
2. [`02-SPECS-BACKLOG.md`](./02-SPECS-BACKLOG.md) — índice de las 15 Specs, su orden, dependencias y estado.
3. [`specs/`](./specs/) — una Spec por archivo (SPEC-00 a SPEC-14), cada una con su desglose de Tasks y estado individual.

## Estado actual

**FASE 1 completada — pendiente de tu aprobación para empezar FASE 2 (implementación).**

Antes de aprobar, dos cosas conviene que decidas explícitamente (quedan marcadas como "requiere decisión del usuario" en las Specs correspondientes):

- **SPEC-01** (seguridad): cerrar la escalación de privilegios en `users/{uid}` es el hallazgo más grave de todo el análisis (cualquier usuario autenticado puede auto-asignarse rol `admin`/`superadmin` hoy mismo escribiendo directo a Firestore). Es independiente del resto del roadmap — puedo priorizarla antes que cualquier otra cosa si prefieres.
- El **orden general** (00→14) asume que quieres seguir exactamente la secuencia de menor a mayor riesgo descrita en la sección I del análisis. Si prefieres empezar por otro punto (p. ej. directamente por `crearReserva` porque es el caso de uso que más te importa para el agente IA), lo ajustamos.

## Cómo se actualiza este backlog

Cada vez que se trabaje una Task: se actualiza su estado en el archivo de la Spec correspondiente y, si corresponde, la fila de la tabla en `02-SPECS-BACKLOG.md`. Una Task solo pasa a `VERIFIED` tras confirmación manual tuya de que la funcionalidad real sigue funcionando.
