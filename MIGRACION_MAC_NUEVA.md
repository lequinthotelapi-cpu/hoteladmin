# 🖥️ Migración a Mac nueva

Guía para dejar este proyecto corriendo en la Mac nueva. El repo remoto está
completo (`main` sincronizado, sin cambios pendientes al 2026-08-02), así que
no hace falta copiar carpetas ni respaldar volúmenes de Docker: todo lo
necesario está en GitHub o se regenera solo.

## 1. Instalar en la Mac nueva

- **Docker Desktop**
- **Visual Studio Code**
- Extensión de VS Code **"Dev Containers"** (`ms-vscode-remote.remote-containers`)
- **Git**
- Opcional (solo si vas a hacer `firebase deploy` desde el host, fuera del
  contenedor): `npm install -g firebase-tools` y luego `firebase login`

## 2. Configurar la identidad de GitHub (cuenta personal vs. empresa)

En tu Mac vieja el git global tiene la cuenta de la empresa, y este proyecto
usa una cuenta personal distinta. Antes de clonar, evita tocar la config
`--global` de la Mac nueva (para no romper otros proyectos de la empresa) y
usa una de estas opciones:

- **SSH con clave dedicada** para la cuenta personal (recomendado), o
- Clonar con HTTPS y dejar que el `postStartCommand` del devcontainer fije
  el `user.name`/`user.email` **dentro del contenedor** automáticamente
  (ya está configurado en `.devcontainer/devcontainer.json`, no hay que
  tocar nada).

⚠️ El remoto actual (`origin`) tiene un token de GitHub embebido en la URL.
**No lo reuses en la Mac nueva** — clona con SSH o con un login limpio, y
revoca ese token viejo en GitHub cuando puedas.

## 3. Clonar el proyecto

```bash
git clone https://github.com/lequinthotelapi-cpu/hoteladmin.git
cd hoteladmin
```

(o con SSH si ya configuraste la clave: `git@github.com:lequinthotelapi-cpu/hoteladmin.git`)

## 4. Levantar el Dev Container

1. Abrir la carpeta `hoteladmin` en VS Code.
2. `Cmd+Shift+P` → **"Dev Containers: Reopen in Container"**.
3. Espera: construye la imagen y corre `npm install` solo (`postCreateCommand`).
4. Dentro del contenedor (terminal integrada de VS Code):
   ```bash
   npm start
   ```
5. Abrir `http://localhost:4200`.

## 5. Qué NO hace falta migrar

- `node_modules`, caché de npm, caché de Angular → se regeneran solos.
- Volúmenes de Docker de la Mac vieja → no se transfieren ni hacen falta,
  son solo caché de rendimiento.
- Archivos `.env` → este proyecto no usa ninguno; la config de Firebase vive
  en `src/environments/environment.ts`, que ya está en git.

## 6. Verificación rápida

```bash
git status                 # debe decir "working tree clean"
git log --oneline -1       # debe coincidir con el último commit de main
```

Si algo no coincide con lo que ves en GitHub, es que faltó hacer `git pull`
en la Mac vieja antes de dar por cerrado el trabajo ahí.
