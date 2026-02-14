# Agregar SweetAlert2

## Introducción

Este tópico implementa SweetAlert2 para reemplazar todos los MatSnackBar y confirm() nativos con alertas más profesionales y visualmente atractivas.

---

## Objetivos

### Objetivos Cumplidos ✅

1. ✅ Instalar SweetAlert2 y su wrapper para Angular
2. ✅ Crear AlertService centralizado
3. ✅ Reemplazar MatSnackBar en users-list.component
4. ✅ Reemplazar MatSnackBar en user-create-update.component
5. ✅ Reemplazar confirm() nativos con SweetAlert2
6. ✅ Agregar estilos de SweetAlert2
7. ✅ Configurar dependencias CommonJS

---

## AlertService

**Archivo**: `/src/app/core/services/alert.service.ts`

### Métodos Disponibles

#### 1. success(message, title?)
Muestra una alerta de éxito con timer de 3 segundos.

```typescript
this.alertService.success('Usuario creado exitosamente');
```

#### 2. error(message, title?)
Muestra una alerta de error.

```typescript
this.alertService.error('Error al guardar usuario');
```

#### 3. warning(message, title?)
Muestra una alerta de advertencia.

```typescript
this.alertService.warning('Acción no permitida');
```

#### 4. info(message, title?)
Muestra una alerta informativa.

```typescript
this.alertService.info('Proceso completado');
```

#### 5. confirm(message, title?, confirmText?, cancelText?)
Muestra un diálogo de confirmación. Retorna Promise<boolean>.

```typescript
const confirmed = await this.alertService.confirm(
  '¿Deseas continuar con esta acción?',
  '¿Estás seguro?',
  'Sí, continuar',
  'Cancelar'
);

if (confirmed) {
  // Ejecutar acción
}
```

#### 6. confirmDelete(itemName?)
Diálogo especializado para confirmación de eliminación.

```typescript
const confirmed = await this.alertService.confirmDelete('este usuario');

if (confirmed) {
  await this.userService.deleteUser(uid);
}
```

#### 7. loading(message?)
Muestra un spinner de carga.

```typescript
this.alertService.loading('Procesando...');
// ... operación async
this.alertService.close();
```

#### 8. toast(message, icon?)
Muestra una notificación tipo toast en la esquina superior derecha.

```typescript
this.alertService.toast('Usuario activado', 'success');
```

---

## Ejemplos de Uso

### Antes (MatSnackBar)

```typescript
this.snackBar.open('Usuario creado exitosamente', 'Cerrar', { duration: 3000 });
```

### Después (SweetAlert2)

```typescript
this.alertService.success('Usuario creado exitosamente');
```

---

### Antes (confirm nativo)

```typescript
if (confirm('¿Eliminar usuario?')) {
  await this.userService.deleteUser(uid);
}
```

### Después (SweetAlert2)

```typescript
const confirmed = await this.alertService.confirmDelete('este usuario');
if (confirmed) {
  await this.userService.deleteUser(uid);
}
```

---

## Componentes Actualizados

### 1. users-list.component.ts

**Cambios**:
- Reemplazado MatSnackBar con AlertService
- Reemplazado confirm() con alertService.confirm()
- Agregado loading spinner en forceLogout
- Uso de toast para acciones rápidas

**Métodos actualizados**:
- `createUser()`: success alert
- `editUser()`: success alert
- `toggleStatus()`: toast notification
- `resetSessions()`: toast notification
- `forceLogout()`: confirm + loading + success
- `deleteUser()`: confirmDelete + success

### 2. user-create-update.component.ts

**Cambios**:
- Reemplazado MatSnackBar con AlertService
- Error handling mejorado

### 3. login.component.ts

**Cambios**:
- Reemplazado MatSnackBar con AlertService
- Agregado loading spinner durante login
- Toast notification para login exitoso
- Error alert para fallos de autenticación

**Métodos actualizados**:
- `send()`: loading + error/toast

---

## Configuración

### angular.json

```json
{
  "styles": [
    "src/styles.scss",
    "node_modules/sweetalert2/dist/sweetalert2.min.css"
  ],
  "allowedCommonJsDependencies": [
    "sweetalert2"
  ]
}
```

---

## Tipos de Alertas

### Success
- Color: Verde (#4caf50)
- Timer: 3 segundos
- Progress bar: Sí
- Icono: ✓

### Error
- Color: Rojo (#f44336)
- Timer: No
- Icono: ✗

### Warning
- Color: Naranja (#ff9800)
- Timer: No
- Icono: ⚠

### Info
- Color: Azul (#2196f3)
- Timer: No
- Icono: ℹ

### Confirm
- Botones: Sí/No
- Colores: Azul/Gris
- Icono: ?

### Toast
- Posición: Top-end
- Timer: 3 segundos
- Hover: Pausa timer

---

## Archivos Modificados/Creados

### Archivos Creados (1)

1. **`/src/app/core/services/alert.service.ts`**
   - Servicio centralizado para SweetAlert2
   - 8 métodos públicos
   - Configuración personalizada

### Archivos Modificados (3)

1. **`/src/app/features/private/users/users-list/users-list.component.ts`**
   - Reemplazado MatSnackBar (6 ocurrencias)
   - Reemplazado confirm() (2 ocurrencias)
   - Agregado loading spinner

2. **`/src/app/features/private/users/user-create-update/user-create-update.component.ts`**
   - Reemplazado MatSnackBar (1 ocurrencia)

3. **`/src/app/features/public/login/login.component.ts`**
   - Reemplazado MatSnackBar (2 ocurrencias)
   - Agregado loading spinner
   - Toast para login exitoso
   - Error alert para fallos

4. **`/workspace/angular.json`**
   - Agregado estilos de SweetAlert2
   - Agregado a allowedCommonJsDependencies

---

## Conceptos Técnicos Aplicados

1. **Service Pattern**: Servicio centralizado reutilizable
2. **Async/Await**: Manejo de promesas en confirmaciones
3. **TypeScript Generics**: Tipos de SweetAlert2
4. **Dependency Injection**: Inyección del servicio
5. **Promise<boolean>**: Retorno de confirmaciones
6. **Timer Progress Bar**: UX mejorada
7. **Toast Notifications**: Notificaciones no intrusivas
8. **Loading States**: Feedback visual durante operaciones

---

## Ventajas sobre MatSnackBar

1. **Más visual**: Alertas centradas y llamativas
2. **Confirmaciones**: Diálogos de confirmación integrados
3. **Loading**: Spinner de carga incluido
4. **Toast**: Notificaciones tipo toast
5. **Personalizable**: Fácil de customizar
6. **Iconos**: Iconos integrados por tipo
7. **Animaciones**: Transiciones suaves
8. **Timer visual**: Progress bar en alertas con timer

---

## Próximos Pasos

### Funcionalidades Pendientes

1. **Personalizar tema**: Colores del tema Ocean
2. **Agregar más tipos**: Question, custom icons
3. **Reemplazar en otros componentes**: Dashboard, login, etc.
4. **Agregar sonidos**: Feedback auditivo opcional
5. **Configuración global**: Defaults personalizados

---

## Estadísticas del Tópico

| Métrica | Valor |
|---------|-------|
| Archivos creados | 1 |
| Archivos modificados | 4 |
| Líneas de código agregadas | ~150 |
| MatSnackBar reemplazados | 9 |
| confirm() reemplazados | 2 |
| Métodos en AlertService | 8 |
| Tiempo de implementación | ~30 min |

---

**Última actualización**: 2026-02-10  
**Estado**: ✅ Completado y compilando correctamente  
**Build Hash**: 1cf88cafef5d0f3d
