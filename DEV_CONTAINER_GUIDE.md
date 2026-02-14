# 🚀 Guía Dev Container - Angular 16

## 📋 Requisitos Previos
- Docker Desktop instalado y corriendo
- Visual Studio Code
- Extensión "Dev Containers" instalada

## ⚡ Inicio Rápido

### 1. Abrir en Dev Container
```
Ctrl+Shift+P (Cmd+Shift+P en Mac)
→ "Dev Containers: Reopen in Container"
```

### 2. Primera vez (automático)
- Se construye el container
- Se instalan dependencias (`npm install`)
- Listo para desarrollar

### 3. Iniciar servidor
```bash
npm start
```
Servidor disponible en: `http://localhost:4200`

## 🔄 Comandos Diarios

### Abrir/Cerrar Dev Container
| Acción | Atajo |
|--------|-------|
| Abrir en container | `Ctrl+Shift+P` → "Reopen in Container" |
| Salir del container | `Ctrl+Shift+P` → "Reopen Folder Locally" |
| Reconstruir container | `Ctrl+Shift+P` → "Rebuild Container" |

### Comandos de Desarrollo
```bash
# Iniciar servidor de desarrollo
npm start

# Instalar nueva dependencia
npm install nombre-paquete

# Generar componente
ng generate component mi-componente

# Build de producción
npm run build

# Ejecutar tests
npm test

# Verificar persistencia
./check-persistence.sh
```

## 🔧 Comandos Útiles

### Angular CLI
```bash
ng version                    # Ver versión
ng generate component nombre  # Crear componente
ng generate service nombre    # Crear servicio
ng build                      # Build del proyecto
ng test                       # Ejecutar tests
```

### NPM
```bash
npm install                   # Instalar dependencias
npm install paquete --save    # Instalar y guardar
npm list                      # Ver dependencias instaladas
npm outdated                  # Ver paquetes desactualizados
```

## 💾 Persistencia Garantizada

### ✅ Lo que persiste automáticamente:
- **Código fuente** - Todos tus cambios
- **node_modules** - Dependencias instaladas
- **package.json** - Configuración del proyecto
- **Cache npm** - Instalaciones rápidas
- **Configuraciones VS Code** - Settings y extensiones

### 🚫 Lo que NO afecta tu Mac:
- Instalaciones globales de Node/Angular
- Configuraciones npm globales
- Variables de entorno del sistema

## 🐛 Solución de Problemas

### Container no inicia
```bash
# Reconstruir desde cero
Ctrl+Shift+P → "Dev Containers: Rebuild Container"
```

### npm install lento
```bash
# Limpiar cache (dentro del container)
npm cache clean --force
npm install
```

### Puerto 4200 ocupado
```bash
# Cambiar puerto en package.json
"start": "ng serve --port 4201"
```

### Permisos de archivos
```bash
# Dentro del container
chown -R root:root /workspace
```

## 📁 Estructura de Archivos

```
proyecto/
├── .devcontainer/
│   ├── devcontainer.json    # Configuración VS Code
│   └── docker-compose.yml   # Servicios Docker
├── Dockerfile               # Imagen del container
├── src/                     # Código fuente Angular
├── package.json            # Dependencias del proyecto
└── DEV_CONTAINER_GUIDE.md  # Esta guía
```

## 🎯 Flujo de Trabajo Típico

1. **Abrir proyecto**: `Ctrl+Shift+P` → "Reopen in Container"
2. **Esperar**: Container se construye automáticamente
3. **Desarrollar**: Editar código normalmente
4. **Servidor**: `npm start` para ver cambios
5. **Instalar**: `npm install paquete` si necesitas algo
6. **Cerrar**: `Ctrl+Shift+P` → "Reopen Folder Locally"

## 🔒 Seguridad y Aislamiento

- **Tu Mac permanece intacto** - Nada se instala globalmente
- **Entorno aislado** - Container completamente separado
- **Configuraciones seguras** - No afecta proyectos de oficina
- **Persistencia local** - Cambios se guardan en tu máquina

## 📞 Soporte

Si tienes problemas:
1. Verifica que Docker Desktop esté corriendo
2. Reconstruye el container: "Rebuild Container"
3. Revisa los logs en la terminal de VS Code

---

**¡Listo para desarrollar! 🎉**