# 🚀 Guía de Despliegue - Firebase Functions

## Proyecto: lequinthotel-ca6ef

---

## Opción 1: Despliegue Rápido (Recomendado)

### Paso 1: Autenticación

Abre una terminal en tu máquina local (fuera del contenedor Docker):

```bash
firebase login
```

Esto abrirá tu navegador para autenticarte con Google.

### Paso 2: Desplegar

```bash
cd /ruta/a/tu/proyecto/workspace
./deploy-functions.sh
```

O manualmente:

```bash
cd /ruta/a/tu/proyecto/workspace
firebase deploy --only functions
```

---

## Opción 2: Despliegue con Token CI

### Paso 1: Generar Token

```bash
firebase login:ci
```

Copia el token que te proporciona.

### Paso 2: Desplegar con Token

```bash
cd /ruta/a/tu/proyecto/workspace
./deploy-functions.sh "TU_TOKEN_AQUI"
```

O manualmente:

```bash
firebase deploy --only functions --token "TU_TOKEN_AQUI"
```

---

## Verificar Despliegue

### 1. Ver en Firebase Console

https://console.firebase.google.com/project/lequinthotel-ca6ef/functions

### 2. Ver Logs

```bash
firebase functions:log
```

### 3. Ver Logs de Función Específica

```bash
firebase functions:log --only forceLogoutUser
```

### 4. Probar la Función

Desde tu aplicación Angular, la función ya está configurada para ser llamada:

```typescript
// En UserService
await this.userService.forceLogoutUser(uid);
```

---

## Troubleshooting

### Error: "Firebase CLI not found"

```bash
npm install -g firebase-tools
```

### Error: "Not authorized"

```bash
firebase login
```

### Error: "Project not found"

Verifica que el proyecto existe:
```bash
firebase projects:list
```

Si no aparece `lequinthotel-ca6ef`, verifica tu cuenta de Google.

### Error al compilar Functions

```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Ver errores detallados

```bash
firebase deploy --only functions --debug
```

---

## Configuración Actual

- **Proyecto**: lequinthotel-ca6ef
- **Región**: us-central1 (default)
- **Runtime**: Node.js 18
- **Functions**:
  - `forceLogoutUser`: Forzar logout de usuarios

---

## Costos

Firebase Functions tiene un tier gratuito:
- 2M invocaciones/mes
- 400,000 GB-segundos/mes
- 200,000 GHz-segundos/mes

Tu función `forceLogoutUser` es muy ligera y no debería generar costos significativos.

---

## Próximos Pasos Después del Despliegue

1. ✅ Verificar que la función aparece en Firebase Console
2. ✅ Probar desde la aplicación Angular
3. ✅ Monitorear logs para errores
4. ✅ Configurar alertas si es necesario

---

## Comandos Útiles

```bash
# Ver todas las functions desplegadas
firebase functions:list

# Ver logs en tiempo real
firebase functions:log --only forceLogoutUser

# Eliminar una función
firebase functions:delete forceLogoutUser

# Desplegar solo una función específica
firebase deploy --only functions:forceLogoutUser

# Ver configuración del proyecto
firebase use
```

---

## Notas Importantes

1. **Primera vez**: El despliegue puede tardar 2-3 minutos
2. **Actualizaciones**: Despliegues posteriores son más rápidos (~1 minuto)
3. **Región**: Por defecto se despliega en us-central1
4. **Permisos**: Asegúrate de tener permisos de editor en el proyecto Firebase

---

## Soporte

Si encuentras problemas:
1. Revisa los logs: `firebase functions:log`
2. Verifica la consola de Firebase
3. Revisa la documentación: https://firebase.google.com/docs/functions

---

**Última actualización**: 2026-02-10
**Proyecto**: lequinthotel-ca6ef
**Estado**: ✅ Listo para desplegar
