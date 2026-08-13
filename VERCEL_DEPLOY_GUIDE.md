# Deploy en Vercel — Guía y Proceso

## Contexto

El proyecto es un PMS (Property Management System) para hotel, construido en Angular 16 con Firebase como backend. Anteriormente se desplegaba en un VPS Contabo via SSH + rsync. Al dejar de funcionar el VPS, se migró el deploy a Vercel.

---

## Estrategia de ramas

- `main` → código base, fuente de verdad
- `vercel` → rama de deploy, sale de `main`, contiene ajustes específicos para Vercel
- Cualquier push o PR a la rama `vercel` dispara el pipeline de CI/CD

---

## Paso 1 — Crear cuenta en Vercel

1. Ir a **vercel.com**
2. Click en **Sign Up** → **Continue with GitHub**
3. Autorizar los permisos solicitados

---

## Paso 2 — Crear rama `vercel` desde `main`

```bash
git checkout main
git checkout -b vercel
git push origin vercel
```

En esta rama se eliminaron todos los archivos `.md` de contexto interno y los scripts `.sh` que no afectan el funcionamiento de la app, para mantener el repositorio limpio en producción.

---

## Paso 3 — Vincular el proyecto con Vercel CLI

Dentro del devcontainer o entorno local:

```bash
npm i -g vercel
vercel link
```

- Seleccionar **Search all** para buscar proyectos existentes
- Si no encuentra ninguno, crea uno nuevo automáticamente
- Responder **N** cuando pregunta si conectar con un repositorio Git (se hace manualmente después)
- Al terminar, se genera `.vercel/project.json` con `projectId` y `orgId`

> **Importante:** agregar `.vercel/` al `.gitignore` para no exponer estos IDs en el repositorio público.

---

## Paso 4 — Crear token de Vercel

1. Ir a **vercel.com/account/tokens**
2. Crear un nuevo token con nombre descriptivo (ej: `github-actions`)
3. Guardar el token — solo se muestra una vez

---

## Paso 5 — Agregar secrets en GitHub

Ir a: **github.com/{usuario}/{repo} → Settings → Secrets and variables → Actions**

Agregar los siguientes secrets:

| Secret | Valor |
|---|---|
| `VERCEL_TOKEN` | Token creado en el paso anterior |
| `VERCEL_ORG_ID` | Valor `orgId` del archivo `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Valor `projectId` del archivo `.vercel/project.json` |

> **Nota:** Si el token de GitHub no permite modificar workflows, ir a **github.com/settings/tokens**, editar el token y activar el scope **workflow**.

---

## Paso 6 — Configurar el proyecto en el dashboard de Vercel

Ir a: **vercel.com → proyecto → Settings → General → Build & Development Settings**

Configurar:
- **Framework Preset:** `Other`
- **Build Command:** vacío
- **Output Directory:** `.`

Esto evita que Vercel intente ejecutar su propio build (`ng build`) en sus servidores, ya que el build lo hace GitHub Actions.

---

## Paso 7 — Agregar `vercel.json`

En la raíz del proyecto (rama `vercel`), crear el archivo `vercel.json` para manejar el routing de Angular SPA:

```json
{
  "buildCommand": null,
  "outputDirectory": ".",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Este archivo también debe copiarse al directorio `dist/fury` antes del deploy, ya que es desde ahí que se sube el contenido a Vercel.

---

## Paso 8 — Workflow de GitHub Actions

Archivo: `.github/workflows/deploy.yml`

```yaml
name: Build and Deploy to Vercel

on:
  push:
    branches:
      - vercel
  pull_request:
    branches:
      - vercel

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Angular
        run: npm run build -- --configuration production

      - name: Copy vercel.json to dist
        run: cp vercel.json dist/fury/vercel.json

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Deploy to Vercel
        run: vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        working-directory: dist/fury
```

---

## Problemas encontrados y soluciones

### 1. Error de SASS en el build
**Error:** `Undefined function` en `styles.scss`
**Causa:** El workflow usaba Node 20 pero el proyecto fue desarrollado con Node 18, causando incompatibilidad con la versión de SASS.
**Solución:** Cambiar `node-version: 20` a `node-version: 18` en el workflow.

---

### 2. Vercel CLI desactualizado
**Error:** `Your Vercel CLI version is outdated. This endpoint requires version 47.2.2 or later.`
**Causa:** La GitHub Action `amondnet/vercel-action@v25` incluye una versión antigua del CLI de Vercel.
**Solución:** Reemplazar la action de terceros por instalación directa del CLI oficial con `npm install -g vercel@latest`.

---

### 3. Error `--prebuilt` sin output
**Error:** `no prebuilt output found in ".vercel/output"`
**Causa:** El flag `--prebuilt` espera que el build esté en `.vercel/output` (formato de Vercel), pero Angular genera el output en `dist/fury`.
**Solución:** Quitar el flag `--prebuilt` y apuntar el `working-directory` directamente a `dist/fury`.

---

### 4. Vercel ejecuta su propio build ignorando el nuestro
**Error:** `sh: line 1: ng: command not found` — Vercel intentaba correr `ng build` en sus servidores.
**Causa:** Vercel detectó el proyecto como Angular y configuró automáticamente su propio pipeline de build, ignorando el `vercel.json`.
**Solución:** Ir al dashboard de Vercel → Settings → Build & Development Settings y configurar **Framework Preset** en `Other`, **Build Command** vacío y **Output Directory** en `.`.

---

### 5. Workflow no se dispara con cambios solo en configuración
**Situación:** Después de ajustar configuraciones sin cambios en archivos trackeados, el workflow no se disparaba.
**Solución:** Forzar un trigger con commit vacío:
```bash
git commit --allow-empty -m "ci: trigger deploy"
git push origin vercel
```
