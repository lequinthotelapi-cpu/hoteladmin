# ✅ Firebase Functions - Desplegadas Exitosamente

## Información del Despliegue

**Fecha**: 2026-02-10  
**Proyecto**: lequinthotel-ca6ef  
**Usuario**: lequinthotel.api@gmail.com  
**Estado**: ✅ DESPLEGADO

---

## Functions Desplegadas

### forceLogoutUser

- **Tipo**: Callable (HTTPS)
- **Región**: us-central1
- **Runtime**: Node.js 20 (2nd Gen)
- **Memoria**: 256 MB
- **Versión**: v2

**Descripción**: Fuerza el cierre de sesión de un usuario específico. Solo puede ser ejecutada por usuarios con rol `admin` o `superadmin`.

**URL de la función**: 
```
https://us-central1-lequinthotel-ca6ef.cloudfunctions.net/forceLogoutUser
```

---

## Cómo Usar

### Desde la Aplicación Angular

La función ya está integrada en tu aplicación. Para usarla:

1. Ve a `/users` en tu aplicación
2. Busca un usuario con sesión activa
3. Haz clic en el menú de acciones (⋮)
4. Selecciona "Forzar Logout"
5. Confirma la acción

### Desde el Código

```typescript
// En cualquier componente o servicio
await this.userService.forceLogoutUser(uid);
```

---

## Monitoreo

### Ver Logs en Tiempo Real

```bash
firebase functions:log --only forceLogoutUser
```

### Ver en Firebase Console

https://console.firebase.google.com/project/lequinthotel-ca6ef/functions

### Ver Métricas

- Invocaciones
- Errores
- Latencia
- Uso de memoria

Todo disponible en la consola de Firebase.

---

## Seguridad

✅ **Validaciones Implementadas**:
- Usuario debe estar autenticado
- Solo admin y superadmin pueden ejecutar
- No se puede forzar logout de superadmin (excepto por otro superadmin)
- Revoca refresh tokens de Firebase Auth
- Resetea sesiones en Firestore

---

## Costos

**Tier Gratuito**:
- 2M invocaciones/mes
- 400,000 GB-segundos/mes
- 200,000 GHz-segundos/mes

**Estimado para tu uso**:
- Función muy ligera (~50ms ejecución)
- Uso esperado: < 1000 invocaciones/mes
- **Costo estimado**: $0.00/mes (dentro del tier gratuito)

---

## Troubleshooting

### Si la función no responde

1. Verificar logs:
```bash
firebase functions:log --only forceLogoutUser
```

2. Verificar permisos del usuario en Firestore

3. Verificar que el usuario tenga rol admin o superadmin

### Si hay errores de permisos

Verificar que el usuario que llama la función tenga rol `admin` o `superadmin` en Firestore.

### Si el usuario no se desconecta

La función revoca los tokens, pero el usuario debe refrescar la página o la sesión expirará en el próximo heartbeat (30 segundos).

---

## Próximos Pasos

1. ✅ Probar la función desde la aplicación
2. ✅ Monitorear logs durante las primeras pruebas
3. ✅ Configurar alertas si es necesario
4. ⏳ Considerar agregar más functions:
   - `cleanupInactiveSessions`: Limpieza automática programada
   - `sendUserNotification`: Notificaciones push
   - `generateUserReport`: Reportes de actividad

---

## Comandos Útiles

```bash
# Ver logs
firebase functions:log

# Ver logs de función específica
firebase functions:log --only forceLogoutUser

# Redesplegar
firebase deploy --only functions:forceLogoutUser

# Eliminar función
firebase functions:delete forceLogoutUser

# Ver lista de functions
firebase functions:list
```

---

## Notas

- ⚠️ Node.js 20 será deprecado en 2026-04-30
- ⚠️ Considera actualizar firebase-functions a v5+ en el futuro
- ✅ La función está en producción y lista para usar
- ✅ Todas las APIs necesarias están habilitadas

---

**Última actualización**: 2026-02-10  
**Estado**: ✅ PRODUCCIÓN  
**Próxima revisión**: 2026-04-01
