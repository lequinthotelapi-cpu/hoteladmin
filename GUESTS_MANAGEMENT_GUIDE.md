# Guía Completa: Sistema de Gestión de Huéspedes

## Índice
1. [Arquitectura del Módulo](#arquitectura-del-módulo)
2. [Modelo de Datos](#modelo-de-datos)
3. [Capa de Repositorio](#capa-de-repositorio)
4. [Capa de Servicio](#capa-de-servicio)
5. [Componentes UI](#componentes-ui)
6. [Validaciones](#validaciones)
7. [Integración con Parámetros](#integración-con-parámetros)
8. [Firebase Storage](#firebase-storage)
9. [Reglas de Seguridad](#reglas-de-seguridad)

---

## Arquitectura del Módulo

### Estructura de Carpetas
```
src/app/
├── domain/models/
│   └── guest.model.ts                          # Interfaces Guest, Companion
├── core/
│   ├── repositories/
│   │   ├── guest.repository.ts                 # Interfaz abstracta
│   │   └── guest-firebase.repository.ts        # Implementación Firebase
│   └── services/
│       ├── guest.service.ts                    # Lógica de negocio
│       └── storage.service.ts                  # Upload de fotos
└── features/private/guests/
    ├── guests-list/
    │   ├── guests-list.component.ts            # Lista con tabla
    │   ├── guests-list.component.html
    │   └── guests-list.component.scss
    ├── guest-create-update/
    │   ├── guest-create-update.component.ts    # Formulario stepper
    │   ├── guest-create-update.component.html
    │   └── guest-create-update.component.scss
    └── guests.module.ts                        # Módulo Angular
```

### Patrón de Diseño
- **Repository Pattern**: Abstracción de acceso a datos
- **Service Layer**: Lógica de negocio y validaciones
- **Component Layer**: Presentación y UI

---

## Modelo de Datos

### Archivo: `src/app/domain/models/guest.model.ts`

```typescript
export interface Guest {
  // Identificación
  id: string;
  
  // Información Personal Básica (REQUERIDOS)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Documento de Identidad (REQUERIDOS)
  documentType: string;        // Valor de parámetro 'documentTypes'
  documentNumber: string;
  
  // Clasificación (REQUERIDOS)
  guestType: string;           // Valor de parámetro 'guestTypes'
  status: string;              // Valor de parámetro 'guestStatuses'
  vip: boolean;
  
  // Información Adicional (OPCIONALES)
  dateOfBirth?: Date;
  countryOfOrigin?: string;    // País de origen - Valor de parámetro 'countries'
  gender?: 'masculino' | 'femenino' | 'otro';
  alternativePhone?: string;
  photoUrl?: string;
  
  // Dirección (OPCIONALES)
  address?: string;
  city?: string;
  country?: string;            // País de residencia
  
  // Acompañantes (OPCIONALES)
  companions?: Companion[];
  
  // Notas (OPCIONALES)
  notes?: string;
  
  // Auditoría
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface Companion {
  firstName: string;
  lastName: string;
  relationship?: string;
  age?: number;
}
```

### Campos Importantes

#### Campos Requeridos (9)
- `id`: Identificador único generado por Firestore
- `firstName`, `lastName`: Nombre completo del huésped
- `email`: Correo electrónico (único en la base de datos)
- `phone`: Teléfono principal
- `documentType`, `documentNumber`: Identificación oficial
- `guestType`: Tipo de huésped (individual, corporativo, grupo)
- `status`: Estado actual (active, inactive, blacklisted)
- `vip`: Indicador de huésped VIP (solo admin puede modificar)

#### Campos Opcionales (11)
- `dateOfBirth`: Fecha de nacimiento
- `countryOfOrigin`: País de origen (reutiliza parámetro 'countries')
- `gender`: Género del huésped
- `alternativePhone`: Teléfono secundario
- `photoUrl`: URL de la foto en Firebase Storage
- `address`, `city`, `country`: Dirección de residencia
- `companions`: Array de acompañantes
- `notes`: Notas adicionales

#### Auditoría
- `createdAt`, `createdBy`: Registro de creación
- `updatedAt`, `updatedBy`: Última modificación

---

## Capa de Repositorio

### Archivo: `src/app/core/repositories/guest-firebase.repository.ts`

#### Conversión de Timestamps
```typescript
private convertTimestamps(data: any): any {
  if (!data) return data;
  
  const converted = { ...data };
  
  if (converted.createdAt instanceof Timestamp) {
    converted.createdAt = converted.createdAt.toDate();
  }
  if (converted.updatedAt instanceof Timestamp) {
    converted.updatedAt = converted.updatedAt.toDate();
  }
  if (converted.dateOfBirth instanceof Timestamp) {
    converted.dateOfBirth = converted.dateOfBirth.toDate();
  }
  
  return converted;
}
```

#### Métodos Principales
- `getAll()`: Observable de todos los huéspedes
- `getById(id)`: Observable de un huésped específico
- `create(data)`: Crear nuevo huésped
- `update(id, data)`: Actualizar huésped existente
- `delete(id)`: Eliminar huésped
- `searchByEmail(email)`: Buscar por email (validación unicidad)
- `searchByDocument(type, number)`: Buscar por documento (validación unicidad)

---

## Capa de Servicio

### Archivo: `src/app/core/services/guest.service.ts`

#### Validaciones Implementadas

**1. Validación de Email**
```typescript
private isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

**2. Validación de Teléfono**
```typescript
private isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
}
```

**3. Validación de Unicidad**
- Email único en la base de datos
- Documento único (tipo + número)

**4. Validación de Permisos VIP**
- Solo admin/superadmin pueden crear/modificar huéspedes VIP
- Validación en create y update

#### Métodos Principales
- `getAll()`: Obtener todos los huéspedes
- `getById(id)`: Obtener huésped por ID
- `create(data)`: Crear con validaciones
- `update(id, data)`: Actualizar con validaciones
- `delete(id)`: Eliminar huésped
- `toggleVipStatus(id, vip)`: Cambiar estado VIP (solo admin)

---

## Componentes UI

### Lista de Huéspedes

**Archivo**: `src/app/features/private/guests/guests-list/guests-list.component.ts`

#### Características
- Tabla con 8 columnas configurables (ListColumn)
- Filtro de búsqueda en tiempo real
- Paginación (10, 25, 50, 100 registros)
- Ordenamiento por columnas (MatSort)
- Toggle VIP con confirmación
- Menú de acciones (Editar, Eliminar)
- Click en fila para editar
- Botón flotante (+) para crear

#### Columnas Disponibles
```typescript
columns: ListColumn[] = [
  { name: 'Foto', property: 'photo', visible: true },
  { name: 'Nombre', property: 'fullName', visible: true },
  { name: 'Email', property: 'email', visible: true },
  { name: 'Teléfono', property: 'phone', visible: true },
  { name: 'Tipo', property: 'guestType', visible: true },
  { name: 'Estado', property: 'status', visible: true },
  { name: 'VIP', property: 'vip', visible: true },
  { name: 'Acciones', property: 'actions', visible: true }
];
```

#### Badges de Estado
- **Active**: Verde (#4caf50)
- **Inactive**: Gris (#9e9e9e)
- **Blacklisted**: Rojo (#f44336)

### Formulario de Huésped

**Archivo**: `src/app/features/private/guests/guest-create-update/guest-create-update.component.ts`

#### Estructura (3 Steps con mat-horizontal-stepper)

**Step 1: Información Básica**
- Upload de foto con preview
- Nombre y Apellido
- Email y Teléfono
- Tipo y Número de Documento
- Tipo de Huésped y Estado
- Checkbox VIP

**Step 2: Información Adicional**
- Fecha de Nacimiento (DatePicker)
- Género (select)
- País de Origen (select desde parámetros)
- Teléfono Alternativo
- Dirección completa
- Notas (textarea)

**Step 3: Acompañantes**
- Lista dinámica (FormArray)
- Agregar/Eliminar acompañantes
- Campos: Nombre, Apellido, Relación, Edad

#### Validaciones de Foto
- Solo archivos de imagen
- Tamaño máximo: 5MB
- Preview antes de guardar

---

## Validaciones

### Validaciones de Creación
1. ✅ Formato de email válido
2. ✅ Formato de teléfono válido (mínimo 7 dígitos)
3. ✅ Email único en la base de datos
4. ✅ Documento único (tipo + número)
5. ✅ VIP solo si usuario es admin/superadmin

### Validaciones de Actualización
1. ✅ Formato de email válido (si se modifica)
2. ✅ Formato de teléfono válido (si se modifica)
3. ✅ Email único (excluyendo el actual)
4. ✅ Documento único (excluyendo el actual)
5. ✅ VIP solo si usuario es admin/superadmin

---

## Integración con Parámetros

### Parámetros Utilizados
- **documentTypes**: Tipos de documento (Pasaporte, Cédula, etc.)
- **guestTypes**: Tipos de huésped (Individual, Corporativo, Grupo)
- **guestStatuses**: Estados (Activo, Inactivo, Lista Negra)
- **countries**: Países (para origen y residencia)

### Uso en Componentes
```typescript
loadParameters(): void {
  this.documentTypes = this.parametersService.getOptions('documentTypes');
  this.guestTypes = this.parametersService.getOptions('guestTypes');
  this.guestStatuses = this.parametersService.getOptions('guestStatuses');
  this.countries = this.parametersService.getOptions('countries');
}
```

---

## Firebase Storage

### Archivo: `src/app/core/services/storage.service.ts`

#### Upload de Fotos
```typescript
async uploadGuestPhoto(file: File): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const fileName = `guest_${timestamp}.${extension}`;
  const storageRef = ref(this.storage, `guests/photos/${fileName}`);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
}
```

#### Eliminación de Fotos
```typescript
async deleteGuestPhoto(photoUrl: string): Promise<void> {
  try {
    const storageRef = ref(this.storage, photoUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting guest photo:', error);
  }
}
```

### Estructura de Almacenamiento
```
/guests/photos/
  ├── guest_1770692439129.jpg
  ├── guest_1770692441393.png
  └── guest_1770692442085.jpg
```

---

## Reglas de Seguridad

### Firestore Rules (`firestore.rules`)
```javascript
// Reglas para huéspedes
match /guests/{guestId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAuthenticated();
  allow delete: if isAdmin();
}
```

### Storage Rules (`storage.rules`)
```javascript
// Reglas para fotos de huéspedes
match /guests/photos/{fileName} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

---

## Configuración del Módulo

### Archivo: `src/app/features/private/guests/guests.module.ts`

#### Providers
```typescript
providers: [
  { provide: GuestRepository, useClass: GuestFirebaseRepository },
  GuestService
]
```

#### Imports Clave
- `MatStepperModule`: Para el formulario con steps
- `MatDatepickerModule`: Para fecha de nacimiento
- `MatSlideToggleModule`: Para toggle VIP
- `FurySharedModule`: Componentes compartidos del template

---

## Rutas

### Configuración en `app-routing.module.ts`
```typescript
{
  path: 'guests',
  loadChildren: () => import('./features/private/guests/guests.module').then(m => m.GuestsModule),
}
```

### Menú en `app.component.ts`
```typescript
{
  name: 'Huéspedes',
  routeOrFunction: '/guests',
  icon: 'person',
  position: 13,
}
```

---

## Estadísticas del Build

```
✅ Build exitoso
Hash: 560929905e22ddf0
Módulo Guests: 22.18 KB (5.67 KB comprimido)
Tiempo de compilación: ~17s
```

---

## Características Implementadas

### ✅ CRUD Completo
- Crear huésped con validaciones
- Leer/Listar huéspedes
- Actualizar información
- Eliminar huésped (con confirmación)

### ✅ UI/UX
- Tabla estilo all-in-one-table
- Formulario con stepper horizontal (3 pasos)
- Filtro de columnas configurable
- Búsqueda en tiempo real
- Paginación y ordenamiento
- Badges de colores para estados
- Toggle VIP con permisos

### ✅ Validaciones
- Email único y formato válido
- Documento único (tipo + número)
- Teléfono formato válido
- VIP solo admin/superadmin
- Foto máximo 5MB

### ✅ Integración
- Parámetros del sistema
- Firebase Storage
- SweetAlert2 para alertas
- Auditoría completa

### ✅ Seguridad
- Reglas Firestore desplegadas
- Reglas Storage configuradas
- Validación de permisos VIP
- Conversión de Timestamps

---

## Próximos Pasos Sugeridos

1. **Búsqueda Avanzada**: Filtros por tipo, estado, VIP
2. **Exportación**: Excel/PDF de lista de huéspedes
3. **Historial**: Registro de cambios en huéspedes
4. **Estadísticas**: Dashboard con métricas de huéspedes
5. **Integración**: Vincular con módulo de reservaciones
