---
name: seo-check
description: Audita SEO y performance de la landing (lequintlanding, Next.js) - metadata, Open Graph, sitemap/robots, imágenes, Core Web Vitals. Usar antes de un deploy o cuando se pida "revisar SEO", "revisar performance" o "auditoría SEO".
---

# SEO & Performance Check

Audita la landing de Next.js en estos puntos, en orden:

## 1. Metadata por página
- Cada `page.tsx`/`layout.tsx` exporta `metadata` (o `generateMetadata`) con `title` y `description` únicos y descriptivos (no genéricos ni duplicados entre páginas).
- `title` ideal: 50-60 caracteres. `description`: 140-160 caracteres.
- Existe `metadataBase` en el layout raíz para que las URLs absolutas (OG images, canonical) se resuelvan bien.

## 2. Open Graph / redes sociales
- `openGraph` y `twitter` definidos con `title`, `description`, `images` (1200x630 recomendado).
- Si no hay imagen OG, señalarlo como hallazgo.

## 3. Sitemap y robots
- Existe `app/sitemap.ts` o `public/sitemap.xml`.
- Existe `app/robots.ts` o `public/robots.txt` y no bloquea rutas públicas por error.

## 4. Imágenes
- Todas las imágenes usan `next/image` (no `<img>` plano) para optimización automática.
- Tienen `alt` descriptivo (no vacío salvo decorativas).
- Imágenes above-the-fold usan `priority`.

## 5. Estructura semántica
- Un solo `<h1>` por página, jerarquía de headings sin saltos (h1→h2→h3).
- Enlaces con texto descriptivo (evitar "click aquí").

## 6. Performance / Core Web Vitals
- Si hay dev server corriendo, usar Lighthouse (`npx lighthouse <url> --only-categories=performance,seo,accessibility --view`) o el skill `run` de Claude Code para levantar la app y revisar.
- Señalar fuentes no optimizadas (usar `next/font` en vez de `<link>` a Google Fonts).
- Señalar JS/CSS no usado o bundles grandes si es evidente.

## 7. Datos estructurados (opcional pero recomendable)
- Revisar si conviene JSON-LD (`Organization`, `WebSite`) dado que es una landing de producto/marca.

## Salida
Reportar hallazgos como lista priorizada: bloqueante / recomendado / opcional, con archivo y línea cuando aplique. No aplicar cambios automáticamente salvo que el usuario lo pida explícitamente.
