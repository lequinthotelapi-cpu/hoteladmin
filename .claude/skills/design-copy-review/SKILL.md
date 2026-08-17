---
name: design-copy-review
description: Revisa consistencia visual, accesibilidad y copy de marketing de la landing (lequintlanding). Usar cuando se pida "revisar el diseño", "revisar el copy", "consistencia visual" o antes de publicar una sección nueva.
---

# Design & Copy Review

Revisa la landing en dos frentes. No es una auditoría de bugs de código (para eso usar `/code-review`) — el foco es percepción visual y mensaje.

## 1. Consistencia visual
- Espaciados, tamaños de fuente y colores usan las mismas variables/tokens en todas las secciones (buscar valores hardcodeados sueltos que rompan el sistema, ej. un `padding: 13px` aislado entre `p-4`/`p-6` de Tailwind).
- Jerarquía tipográfica coherente entre secciones (mismo peso/tamaño para headings del mismo nivel).
- Botones y CTAs con estilo consistente (mismo componente, no variantes ad-hoc).
- Responsive: revisar que las secciones no rompan en mobile (viewport angosto) - imágenes, texto que se corta, overflow horizontal.
- Contraste de color suficiente (texto sobre fondo) para accesibilidad (WCAG AA: 4.5:1 texto normal, 3:1 texto grande).

## 2. Copy de marketing
- El mensaje principal (hero) es claro en menos de 5 segundos de lectura: qué es, para quién, por qué importa.
- Un solo CTA principal por sección, verbo de acción claro (evitar "Enviar", preferir "Reservar demo", "Empezar ahora", etc. según el producto).
- Sin jerga innecesaria ni frases genéricas de relleno ("solución integral", "líder del mercado") salvo que sean intencionales.
- Tono consistente entre secciones (formal/informal, tú/usted).
- Sin errores ortográficos o gramaticales en español.
- Textos alternativos (`alt`) de imágenes describen contenido real, no repiten el copy visible.

## Salida
Listar hallazgos agrupados por sección de la landing (Hero, Features, Pricing, Footer, etc.), marcando cada uno como bloqueante o sugerencia, con referencia a archivo/componente cuando aplique. No reescribir el copy salvo que el usuario lo pida explícitamente.
