# Backlog de Specs — Migración incremental a backend centralizado

Metodología SDD. Ningún código de aplicación se modifica hasta que el usuario apruebe este backlog. A partir de la aprobación, se trabaja **una Spec/Task a la vez**, nunca en paralelo, salvo indicación explícita.

Estados válidos: `PENDING` · `IN_PROGRESS` · `BLOCKED` · `COMPLETED` · `VERIFIED`.
Una Task pasa a `COMPLETED` solo con evidencia de compilación/tests en verde; pasa a `VERIFIED` solo tras confirmación manual del usuario de que la funcionalidad afectada sigue funcionando igual.

## Índice y orden de ejecución

| # | Spec | Estado | Depende de | Riesgo de romper algo | Archivo |
|---|---|---|---|---|---|
| 00 | Fundamentos del backend compartido | COMPLETED | — | Ninguno (no toca app existente) | [specs/SPEC-00-fundamentos-backend.md](specs/SPEC-00-fundamentos-backend.md) |
| 01 | Cerrar escalación de privilegios en `users` | IN PROGRESS (regla + fix crítico de AuthService verificados en vivo; falta regresión visual completa y despliegue, ver addendum) | 00 | Bajo, si se listan bien los campos que el cliente necesita seguir escribiendo | [specs/SPEC-01-cerrar-escalacion-privilegios.md](specs/SPEC-01-cerrar-escalacion-privilegios.md) |
| 02 | Contador atómico centralizado | COMPLETED | 00 | Bajo (aditivo, con fallback) | [specs/SPEC-02-contador-atomico.md](specs/SPEC-02-contador-atomico.md) |
| 03 | Cálculo centralizado de pricing/IVA | COMPLETED | 00 | Bajo-medio (redondeos) | [specs/SPEC-03-pricing-iva-centralizado.md](specs/SPEC-03-pricing-iva-centralizado.md) |
| 04 | Validación server-side de disponibilidad | COMPLETED (04.3 recomendación pendiente de confirmar, no bloqueante) | 00 | Medio | [specs/SPEC-04-validar-disponibilidad.md](specs/SPEC-04-validar-disponibilidad.md) |
| 05 | `crearReserva` centralizada | COMPLETED — verificada en producción real por el usuario | 02, 03, 04 | Alto (flujo crítico de negocio) | [specs/SPEC-05-crear-reserva.md](specs/SPEC-05-crear-reserva.md) |
| 06 | `confirmarReserva` / `cancelarReserva` | IN PROGRESS (código completo y probado; falta que despliegues y confirmes) | 05 | Medio | [specs/SPEC-06-confirmar-cancelar-reserva.md](specs/SPEC-06-confirmar-cancelar-reserva.md) |
| 07 | `registrarCheckIn` transaccional | IN PROGRESS (código completo y probado; falta que despliegues y confirmes) | 05, 06 | Alto (crea Guest Account + cambia habitación) | [specs/SPEC-07-checkin.md](specs/SPEC-07-checkin.md) |
| 08 | `registrarCheckOut` transaccional | IN PROGRESS (código completo y probado; falta que despliegues y confirmes) | 07 | Alto | [specs/SPEC-08-checkout.md](specs/SPEC-08-checkout.md) |
| 09 | Cargos/pagos/cierre de Guest Account | IN PROGRESS (código completo y probado; falta que despliegues y confirmes) | 03, 07 | Alto (dinero real) | [specs/SPEC-09-guest-account-cargos-pagos.md](specs/SPEC-09-guest-account-cargos-pagos.md) |
| 10 | Emisión de factura centralizada | IN PROGRESS (código completo y probado; falta que despliegues y confirmes) | 02, 09 | Medio-alto (impacto fiscal) | [specs/SPEC-10-facturacion.md](specs/SPEC-10-facturacion.md) |
| 11 | Venta POS transaccional | IN PROGRESS (código completo y probado; hallazgo de doble IVA a decidir; falta que despliegues y confirmes) | 03 | Alto (stock + caja) | [specs/SPEC-11-pos-venta-transaccional.md](specs/SPEC-11-pos-venta-transaccional.md) |
| 12 | Endurecimiento progresivo de `firestore.rules` | IN PROGRESS (bookings/guestAccounts/sales/invoices endurecidos y probados; products/inventario necesita su propia Spec nueva) | Cada spec funcional ya VERIFIED (el usuario decidió no esperar) | Alto si se hace fuera de orden — bajo si se hace después de validar | [specs/SPEC-12-endurecer-firestore-rules.md](specs/SPEC-12-endurecer-firestore-rules.md) |
| 13 | Contratos compartidos (Flutter/n8n) | COMPLETED — `docs/architecture/CONTRATOS-API.md` | 05–11 | Bajo (documentación + tipos) | [specs/SPEC-13-contratos-compartidos.md](specs/SPEC-13-contratos-compartidos.md) |
| 14 | Integración n8n — agente conversacional | PENDING | 13 | Bajo para la app existente; alto en superficie de ataque si se hace mal | [specs/SPEC-14-integracion-n8n-agente-ia.md](specs/SPEC-14-integracion-n8n-agente-ia.md) |

## Notas sobre el orden

- **00 y 01 pueden ejecutarse casi en paralelo conceptualmente**, pero se piden en secuencia porque 01 usa las convenciones de auth/rol definidas en 00.
- **01 es la única Spec de este backlog que no es "migración de lógica de negocio a Functions"** en sentido estricto — es una corrección de seguridad urgente (ver hallazgo F.2.1 del análisis). Se incluye aquí porque toca `firestore.rules`, la misma superficie que el resto del proyecto, y porque el usuario pidió atención especial a seguridad. Se puede priorizar antes que el resto si el usuario lo prefiere, incluso antes de terminar de revisar todo el backlog — es aislada.
- **05 es la Spec "ejemplo" del objetivo del proyecto** (`crearReserva(datos)`) y la plantilla de convenciones para 06-11.
- **12 no es una sola Task grande**: cada sub-tarea de endurecimiento de regla se ejecuta como parte del cierre de la Spec funcional correspondiente (p. ej. "endurecer `bookings`" es la última Task de la Spec 05/06, no una spec aparte ejecutada al final). El archivo SPEC-12 documenta la estrategia general y sirve de checklist maestro de qué colección ya quedó protegida y cuál no.
- **13 y 14 dependen de tener varias Functions de negocio ya probadas en producción** — no tiene sentido definir el contrato compartido ni conectar el agente antes de que exista suficiente superficie útil que exponerle.

## Política de estado (recordatorio)

- `PENDING`: no iniciada.
- `IN_PROGRESS`: en desarrollo activo.
- `BLOCKED`: depende de una decisión del usuario o de otra Spec no resuelta — debe indicar el motivo explícito.
- `COMPLETED`: código escrito, compila, tests unitarios/emulador en verde. **No implica que Angular ya la consuma en producción.**
- `VERIFIED`: el usuario confirmó manualmente (o vía prueba dirigida) que la funcionalidad real sigue funcionando igual o mejor, en el entorno real/staging. Solo entonces se puede considerar retirar la implementación antigua o avanzar el endurecimiento de rules asociado (Spec 12).
