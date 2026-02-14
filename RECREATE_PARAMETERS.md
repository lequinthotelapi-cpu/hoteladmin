# Recrear Parámetros en Firestore

## Problema
Las categorías `taskTypes` y `taskPriorities` no aparecen en el listado de parámetros porque fueron agregadas después de la creación inicial.

## Solución Rápida

### Opción 1: Desde Firebase Console (Recomendado)
1. Ir a Firebase Console: https://console.firebase.google.com
2. Seleccionar tu proyecto
3. Ir a Firestore Database
4. Buscar la colección `parameters`
5. **Eliminar TODA la colección `parameters`**
6. Cerrar sesión en tu app
7. Volver a iniciar sesión
8. Los parámetros se recrearán automáticamente con TODAS las categorías

### Opción 2: Desde la App (Agregar solo las faltantes)
1. Ir a `/parameters` en tu app
2. Abrir la consola del navegador (F12)
3. Ejecutar este código:

```javascript
// Obtener referencia a Firestore
const firestore = firebase.firestore();

// Crear taskTypes
firestore.collection('parameters').doc('taskTypes').set({
  id: 'taskTypes',
  name: 'Tipos de Tarea',
  description: 'Tipos de tareas de housekeeping',
  options: [
    { value: 'cleaning', label: 'Limpieza', active: true, order: 0 },
    { value: 'maintenance', label: 'Mantenimiento', active: true, order: 1 },
    { value: 'inspection', label: 'Inspección', active: true, order: 2 },
    { value: 'deep-cleaning', label: 'Limpieza Profunda', active: true, order: 3 }
  ],
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
}).then(() => console.log('taskTypes creado'));

// Crear taskPriorities
firestore.collection('parameters').doc('taskPriorities').set({
  id: 'taskPriorities',
  name: 'Prioridades de Tarea',
  description: 'Niveles de prioridad para tareas',
  options: [
    { value: 'low', label: 'Baja', active: true, order: 0 },
    { value: 'normal', label: 'Normal', active: true, order: 1 },
    { value: 'high', label: 'Alta', active: true, order: 2 },
    { value: 'urgent', label: 'Urgente', active: true, order: 3 }
  ],
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
}).then(() => console.log('taskPriorities creado'));

// Recargar la página después de 2 segundos
setTimeout(() => location.reload(), 2000);
```

### Opción 3: Método Programático (Agregar al código)

Voy a crear un método en ParametersService para forzar la recreación:

```typescript
// En parameters.service.ts
async forceRecreateParameters(): Promise<void> {
  // Eliminar caché
  this.parametersCache.clear();
  this.loadedSubject.next(false);
  
  // Recrear parámetros
  await this.initializeDefaultParameters();
  
  // Marcar como cargado
  this.loadedSubject.next(true);
}
```

## Verificación
Después de aplicar cualquiera de las opciones:
1. Ir a `/parameters`
2. Deberías ver 20 categorías en total
3. Buscar "Tipos de Tarea" y "Prioridades de Tarea"
4. Ir a `/housekeeping` y crear una tarea
5. Los dropdowns deberían mostrar las opciones

## Categorías Completas (20 total)
1. Tipos de Documento
2. Tipos de Huésped
3. Estados de Huésped
4. Tipos de Habitación
5. Estados de Habitación
6. Tipos de Cama
7. Amenidades
8. Países
9. Monedas
10. Métodos de Pago
11. Fuentes de Reserva
12. Estados de Reserva
13. Categorías de Producto
14. Unidades de Medida
15. Categorías de Gasto
16. Motivos de Movimiento
17. Cargos de Empleado
18. Departamentos
19. **Tipos de Tarea** ⭐ (Nueva)
20. **Prioridades de Tarea** ⭐ (Nueva)
21. Problemas de Mantenimiento

Total: 21 categorías
