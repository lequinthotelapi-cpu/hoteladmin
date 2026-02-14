# Firebase Functions - PMS Hotel

## Descripción

Este directorio contiene las Cloud Functions de Firebase para el proyecto PMS Hotel.

## Funciones Disponibles

### forceLogoutUser

Fuerza el cierre de sesión de un usuario específico. Solo puede ser ejecutada por usuarios con rol `admin` o `superadmin`.

**Parámetros:**
- `uid` (string): ID del usuario a desconectar

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuario desconectado exitosamente"
}
```

**Errores:**
- `unauthenticated`: Usuario no autenticado
- `permission-denied`: No tienes permisos para realizar esta acción
- `invalid-argument`: UID de usuario requerido
- `internal`: Error interno al ejecutar la función

## Instalación

1. Instalar dependencias:
```bash
cd functions
npm install
```

2. Compilar TypeScript:
```bash
npm run build
```

## Despliegue

### Requisitos Previos

1. Instalar Firebase CLI globalmente:
```bash
npm install -g firebase-tools
```

2. Iniciar sesión en Firebase:
```bash
firebase login
```

3. Seleccionar proyecto:
```bash
firebase use --add
```

### Desplegar Functions

```bash
# Desde la raíz del proyecto
firebase deploy --only functions

# O desde el directorio functions
cd functions
npm run deploy
```

### Desplegar función específica

```bash
firebase deploy --only functions:forceLogoutUser
```

## Desarrollo Local

### Emulador de Functions

```bash
cd functions
npm run serve
```

Esto iniciará el emulador de Functions en `http://localhost:5001`

### Probar Functions Localmente

```bash
cd functions
npm run shell
```

Ejemplo de uso en el shell:
```javascript
forceLogoutUser({ uid: 'USER_UID_HERE' })
```

## Logs

Ver logs en tiempo real:
```bash
firebase functions:log
```

Ver logs de una función específica:
```bash
firebase functions:log --only forceLogoutUser
```

## Estructura de Archivos

```
functions/
├── src/
│   └── index.ts          # Código fuente de las functions
├── lib/                  # Código compilado (generado)
├── node_modules/         # Dependencias
├── package.json          # Configuración y dependencias
├── tsconfig.json         # Configuración de TypeScript
└── .gitignore           # Archivos ignorados por git
```

## Seguridad

- Las functions validan la autenticación del usuario
- Solo admin y superadmin pueden ejecutar `forceLogoutUser`
- No se puede forzar logout de un superadmin (excepto por otro superadmin)
- Se revoca el refresh token para forzar el cierre de sesión

## Troubleshooting

### Error: "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### Error: "Not authorized"
```bash
firebase login
firebase use --add
```

### Error al compilar TypeScript
```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Ver errores en producción
```bash
firebase functions:log --only forceLogoutUser
```

## Costos

Las Cloud Functions tienen un tier gratuito generoso:
- 2M invocaciones/mes
- 400,000 GB-segundos/mes
- 200,000 GHz-segundos/mes

Para más información: https://firebase.google.com/pricing

## Próximas Functions

Funciones planeadas para futuras versiones:
- `cleanupInactiveSessions`: Limpieza automática de sesiones inactivas
- `sendUserNotification`: Enviar notificaciones push a usuarios
- `generateUserReport`: Generar reportes de actividad de usuarios
- `bulkUserUpdate`: Actualización masiva de usuarios
