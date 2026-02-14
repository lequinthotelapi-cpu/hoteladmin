# Guía Completa: Sistema de Autenticación y Gestión de Usuarios

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [Sistema de Autenticación](#sistema-de-autenticación)
4. [Gestión de Sesiones](#gestión-de-sesiones)
5. [Gestión de Usuarios](#gestión-de-usuarios)
6. [Firebase Functions](#firebase-functions)
7. [Configuración de Entorno](#configuración-de-entorno)
8. [Flujos de Trabajo](#flujos-de-trabajo)

---

## Arquitectura General

### Estructura de Carpetas
```
src/app/
├── models/
│   └── user.model.ts                    # Interfaces y tipos de usuario
├── services/
│   ├── auth.service.ts                  # Servicio de autenticación
│   └── auth.guard.ts                    # Guard para rutas protegidas
├── core/
│   ├── repositories/
│   │   ├── user.repository.ts           # Interfaz abstracta
│   │   └── user-firebase.repository.ts  # Implementación Firebase
│   └── services/
│       ├── user.service.ts              # Servicio de gestión de usuarios
│       └── storage.service.ts           # Servicio de almacenamiento (avatares)
└── pages/
    ├── authentication/
    │   ├── login/                       # Componente de login
    │   ├── register/                    # Componente de registro
    │   └── forgot-password/             # Recuperación de contraseña
    └── users/
        ├── users.component.ts           # Lista de usuarios
        └── user-create-update/          # CRUD de usuarios
```

---

## Modelo de Datos

### Archivo: `src/app/models/user.model.ts`

```typescript
export type UserRole = 'superadmin' | 'admin' | 'member' | 'viewer' | 'guest';
export type Gender = 'masculino' | 'femenino';

export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  document: string;
  gender: Gender;
  role: UserRole;
  active: boolean;
  activeUntil?: Date;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt?: Date;
  maxSessions?: number;
  activeSessionsCount?: number;
  hasActiveSession?: boolean;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  document: string;
  gender: Gender;
  role: UserRole;
  active?: boolean;
  activeUntil?: Date;
  avatarUrl?: string;
  maxSessions?: number;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  document?: string;
  gender?: Gender;
  role?: UserRole;
  active?: boolean;
  activeUntil?: Date;
  avatarUrl?: string;
  maxSessions?: number;
  activeSessionsCount?: number;
  hasActiveSession?: boolean;
}
```

### Campos Importantes

#### Campos Básicos
- `uid`: ID único del usuario (generado por Firebase Auth)
- `firstName`, `lastName`: Nombre completo del usuario
- `email`: Correo electrónico (único)
- `document`: Documento de identidad
- `gender`: Género del usuario

#### Campos de Autorización
- `role`: Rol del usuario con 5 niveles:
  - `superadmin`: Acceso total, sin límites de sesiones
  - `admin`: Gestión de usuarios y configuración
  - `member`: Usuario estándar con acceso completo
  - `viewer`: Solo lectura
  - `guest`: Acceso limitado

#### Campos de Estado
- `active`: Usuario activo/inactivo
- `activeUntil`: Fecha de expiración de la cuenta (opcional)
- `avatarUrl`: URL de la imagen de perfil

#### Campos de Sesiones
- `maxSessions`: Número máximo de sesiones simultáneas permitidas (default: 1)
- `activeSessionsCount`: Contador de sesiones activas actuales
- `hasActiveSession`: Indicador booleano de sesión activa
- `sessions`: Objeto con sesiones activas (estructura: `{sessionId: {createdAt, lastHeartbeat, role}}`)
- `lastHeartbeat`: Timestamp del último heartbeat recibido

---

## Sistema de Autenticación

### Archivo: `src/app/services/auth.service.ts`

#### Características Principales

1. **Login con Control de Sesiones**
```typescript
async signIn(email: string, password: string) {
  const result = await signInWithEmailAndPassword(this.auth, email, password);
  await this.createUserDocumentIfNotExists(result.user);
  
  const uid = result.user.uid;
  const userRef = doc(this.firestore, `users/${uid}`);
  this.sessionId = this.generateSessionId();

  try {
    await runTransaction(this.firestore, async tx => {
      const snap = await tx.get(userRef);
      const data = snap.data() || {};
      
      // Superadmin no tiene límite de sesiones
      const isSuperadmin = data['role'] === 'superadmin';

      if (!isSuperadmin) {
        const active = data['activeSessionsCount'] || 0;
        const max = data['maxSessions'] || 1;

        if (active >= max) {
          throw new Error('MAX_SESSIONS');
        }
      }

      tx.set(
        userRef,
        { 
          activeSessionsCount: (data['activeSessionsCount'] || 0) + 1,
          hasActiveSession: true,
          lastHeartbeat: serverTimestamp(),
          [`sessions.${this.sessionId}`]: {
            createdAt: serverTimestamp(),
            lastHeartbeat: serverTimestamp(),
            role: data['role'] || 'guest'
          }
        },
        { merge: true }
      );
    });
    
    this.startHeartbeat(uid);
  } catch (e: any) {
    await signOut(this.auth);
    if (e.message === 'MAX_SESSIONS') {
      throw new Error('Límite de sesiones alcanzado');
    }
    throw e;
  }
  
  return result;
}
```

2. **Logout con Limpieza de Sesión**
```typescript
async signOut() {
  this.stopHeartbeat();
  
  const uid = this.auth.currentUser?.uid;
  if (uid && this.sessionId) {
    const userRef = doc(this.firestore, `users/${uid}`);
    
    await runTransaction(this.firestore, async tx => {
      const snap = await tx.get(userRef);
      const active = snap.data()?.['activeSessionsCount'] || 0;
      const newCount = Math.max(active - 1, 0);
      
      tx.set(
        userRef,
        { 
          activeSessionsCount: newCount,
          hasActiveSession: newCount > 0,
          [`sessions.${this.sessionId}`]: null
        },
        { merge: true }
      );
    });
  }
  
  this.sessionId = null;
  localStorage.removeItem('isLoggedIn');
  return await signOut(this.auth);
}
```

3. **Sistema de Heartbeat**
```typescript
private startHeartbeat(uid: string): void {
  this.stopHeartbeat();
  
  this.heartbeatInterval = setInterval(async () => {
    if (this.sessionId) {
      const userRef = doc(this.firestore, `users/${uid}`);
      try {
        await setDoc(
          userRef,
          {
            lastHeartbeat: serverTimestamp(),
            [`sessions.${this.sessionId}.lastHeartbeat`]: serverTimestamp()
          },
          { merge: true }
        );
      } catch (error) {
        console.error('Error enviando heartbeat:', error);
      }
    }
  }, 30000); // 30 segundos
}
```

#### Métodos Principales

- `signIn(email, password)`: Login con validación de sesiones
- `signUp(email, password)`: Registro de nuevo usuario
- `signOut()`: Cierre de sesión con limpieza
- `getCurrentUser()`: Obtener usuario actual de Firebase Auth
- `getUserData(uid)`: Obtener datos completos del usuario desde Firestore
- `resetPassword(email)`: Enviar correo de recuperación
- `forceLogoutUser(uid)`: Forzar cierre de todas las sesiones (admin)
- `resetUserSessions(uid)`: Resetear contador de sesiones
- `cleanupInactiveSessions(uid, timeoutMinutes)`: Limpiar sesiones inactivas

---

## Gestión de Sesiones

### Concepto de Sesiones Múltiples

El sistema permite controlar cuántas sesiones simultáneas puede tener un usuario:

1. **Campo `maxSessions`**: Define el límite (default: 1)
2. **Campo `activeSessionsCount`**: Contador actual de sesiones
3. **Objeto `sessions`**: Almacena información de cada sesión activa

### Estructura de Sesión
```typescript
sessions: {
  "1234567890_abc123": {
    createdAt: Timestamp,
    lastHeartbeat: Timestamp,
    role: "admin"
  },
  "1234567891_def456": {
    createdAt: Timestamp,
    lastHeartbeat: Timestamp,
    role: "admin"
  }
}
```

### Reglas de Sesiones

1. **Superadmin**: Sin límite de sesiones
2. **Otros roles**: Respetan el campo `maxSessions`
3. **Heartbeat**: Cada 30 segundos para mantener sesión viva
4. **Timeout**: Sesiones sin heartbeat por 5+ minutos se consideran inactivas

### Limpieza de Sesiones Inactivas

```typescript
async cleanupInactiveSessions(uid: string, timeoutMinutes: number = 5): Promise<void> {
  const userRef = doc(this.firestore, `users/${uid}`);
  const snap = await getDoc(userRef);
  const data = snap.data();
  
  if (!data || !data['sessions']) return;
  
  const isSuperadmin = data['role'] === 'superadmin';
  if (isSuperadmin) return;
  
  const sessions = data['sessions'];
  const now = Date.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  let inactiveCount = 0;
  
  const updates: any = {};
  
  for (const [sessionId, sessionData] of Object.entries(sessions)) {
    const lastHeartbeat = (sessionData as any)?.lastHeartbeat;
    if (lastHeartbeat) {
      const lastHeartbeatTime = lastHeartbeat.seconds ? lastHeartbeat.seconds * 1000 : lastHeartbeat;
      if (now - lastHeartbeatTime > timeoutMs) {
        updates[`sessions.${sessionId}`] = null;
        inactiveCount++;
      }
    }
  }
  
  if (inactiveCount > 0) {
    await runTransaction(this.firestore, async tx => {
      const snap = await tx.get(userRef);
      const active = snap.data()?.['activeSessionsCount'] || 0;
      const newCount = Math.max(active - inactiveCount, 0);
      
      tx.set(
        userRef,
        {
          ...updates,
          activeSessionsCount: newCount,
          hasActiveSession: newCount > 0
        },
        { merge: true }
      );
    });
  }
}
```

---

## Gestión de Usuarios

### Archivo: `src/app/core/services/user.service.ts`

#### Características

1. **Caché de Usuarios con Estado Online**
```typescript
export interface UserWithOnlineStatus extends User {
  online: boolean;
}

private usersSubject = new BehaviorSubject<User[]>([]);
private usersCache$: Observable<User[]> | null = null;
public users$: Observable<UserWithOnlineStatus[]>;

constructor() {
  this.users$ = combineLatest([
    this.usersSubject.asObservable(),
    this.notificationServer.onlineUsers$.pipe(startWith({ count: 0, users: [] }))
  ]).pipe(
    map(([users, onlineData]) => {
      if (users.length === 0) return [];
      
      const onlineUserIds = onlineData.users;
      return users.map(user => ({
        ...user,
        online: onlineUserIds.includes(user.uid)
      }));
    })
  );
}
```

2. **Métodos CRUD**
- `createUser(userData)`: Crear usuario con Firebase Auth + Firestore
- `getUser(uid)`: Obtener usuario por ID
- `getAllUsers()`: Listar todos los usuarios
- `getUsersByRole(role)`: Filtrar por rol
- `updateUser(uid, userData)`: Actualizar datos
- `deleteUser(uid)`: Eliminar usuario
- `toggleUserStatus(uid, active)`: Activar/desactivar

3. **Gestión de Avatares**
- `uploadAvatar(file, uid)`: Subir imagen a Firebase Storage
- `deleteAvatar(uid)`: Eliminar imagen

4. **Gestión de Sesiones**
- `resetUserSessions(uid)`: Resetear sesiones
- `forceLogoutUser(uid)`: Forzar logout (llama a Cloud Function)

### Archivo: `src/app/core/repositories/user-firebase.repository.ts`

Implementación del patrón Repository para Firebase:

```typescript
@Injectable()
export class UserFirebaseRepository extends UserRepository {
  async createUser(userData: CreateUserData): Promise<User> {
    const currentUser = this.auth.currentUser;
    
    const userCredential = await createUserWithEmailAndPassword(
      this.auth, 
      userData.email, 
      userData.password
    );

    const user: User = {
      uid: userCredential.user.uid,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      document: userData.document,
      gender: userData.gender,
      role: userData.role,
      active: userData.active ?? true,
      avatarUrl: userData.avatarUrl,
      createdAt: new Date()
    };

    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userDocRef, user);

    // Restaurar usuario actual (importante para admin)
    if (currentUser) {
      await this.auth.updateCurrentUser(currentUser);
    }

    return user;
  }
}
```

### Archivo: `src/app/core/services/storage.service.ts`

Gestión de archivos en Firebase Storage:

```typescript
@Injectable({ providedIn: 'root' })
export class StorageService {
  async uploadUserAvatar(file: File, uid: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${uid}_${timestamp}.${file.name.split('.').pop()}`;
    const filePath = `users/avatars/${fileName}`;
    const storageRef = ref(this.storage, filePath);
    
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  }

  async deleteUserAvatar(uid: string): Promise<void> {
    const filePath = `users/avatars/${uid}`;
    const storageRef = ref(this.storage, filePath);
    await deleteObject(storageRef);
  }
}
```

---

## Firebase Functions

### Archivo: `functions/src/index.ts`

Cloud Function para forzar logout de usuarios:

```typescript
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();

export const forceLogoutUser = onCall(
  async (request) => {
    // Validar autenticación
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    // Validar permisos (solo admin/superadmin)
    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    const callerRole = callerDoc.data()?.role;

    if (callerRole !== 'admin' && callerRole !== 'superadmin') {
      throw new HttpsError('permission-denied', 'No autorizado');
    }

    const uid = request.data.uid;

    if (!uid) {
      throw new HttpsError('invalid-argument', 'UID requerido');
    }

    try {
      // Revocar todos los refresh tokens
      await admin.auth().revokeRefreshTokens(uid);

      // Resetear sesiones en Firestore
      await admin.firestore().collection('users').doc(uid).update({
        activeSessionsCount: 0,
        hasActiveSession: false
      });

      return { 
        success: true,
        message: 'Usuario desconectado exitosamente'
      };
    } catch (error: any) {
      throw new HttpsError('internal', 'Error al forzar logout: ' + error.message);
    }
  }
);
```

### Despliegue de Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

---

## Configuración de Entorno

### Archivo: `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://your-api-url/api',
  firebaseConfig: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

### Configuración de Firebase en `app.module.ts`

```typescript
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideFunctions, getFunctions } from '@angular/fire/functions';

@NgModule({
  imports: [
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideFunctions(() => getFunctions())
  ]
})
export class AppModule { }
```

---

## Flujos de Trabajo

### 1. Flujo de Login

```
Usuario ingresa credenciales
    ↓
AuthService.signIn()
    ↓
Firebase Auth valida credenciales
    ↓
Verificar si usuario existe en Firestore
    ↓
Verificar rol (superadmin = sin límite)
    ↓
Verificar activeSessionsCount < maxSessions
    ↓
Generar sessionId único
    ↓
Transacción Firestore:
  - Incrementar activeSessionsCount
  - Agregar sesión a objeto sessions
  - Actualizar lastHeartbeat
    ↓
Iniciar heartbeat cada 30s
    ↓
Verificar usuario activo (active = true)
    ↓
Verificar fecha de expiración (activeUntil)
    ↓
Guardar isLoggedIn en localStorage
    ↓
Redirigir a dashboard
```

### 2. Flujo de Creación de Usuario

```
Admin abre modal de creación
    ↓
Completa formulario con datos
    ↓
UserService.createUser()
    ↓
UserFirebaseRepository.createUser()
    ↓
Firebase Auth crea usuario
    ↓
Guardar currentUser (admin)
    ↓
Crear documento en Firestore con:
  - Datos básicos
  - role, active, maxSessions
  - activeSessionsCount = 0
    ↓
Si hay avatar:
  StorageService.uploadAvatar()
    ↓
Restaurar currentUser (admin)
    ↓
Actualizar lista de usuarios
```

### 3. Flujo de Forzar Logout

```
Admin selecciona "Forzar Logout"
    ↓
Confirmar acción con SweetAlert
    ↓
UserService.forceLogoutUser(uid)
    ↓
AuthService.forceLogoutUser(uid)
    ↓
Llamar Cloud Function
    ↓
Function valida permisos
    ↓
admin.auth().revokeRefreshTokens(uid)
    ↓
Actualizar Firestore:
  - activeSessionsCount = 0
  - hasActiveSession = false
    ↓
Usuario es desconectado automáticamente
    ↓
Actualizar lista de usuarios
```

### 4. Flujo de Heartbeat

```
Usuario logueado
    ↓
startHeartbeat() inicia interval de 30s
    ↓
Cada 30 segundos:
  - Actualizar lastHeartbeat en Firestore
  - Actualizar sessions.{sessionId}.lastHeartbeat
    ↓
Si falla heartbeat:
  - Log error pero continuar
    ↓
Al hacer logout:
  - stopHeartbeat() limpia interval
```

### 5. Flujo de Limpieza de Sesiones Inactivas

```
Ejecutar cleanupInactiveSessions(uid, 5)
    ↓
Obtener documento de usuario
    ↓
Si es superadmin: salir (no limpiar)
    ↓
Iterar sobre objeto sessions
    ↓
Para cada sesión:
  - Calcular tiempo desde lastHeartbeat
  - Si > 5 minutos: marcar para eliminar
    ↓
Si hay sesiones inactivas:
  Transacción Firestore:
    - Eliminar sesiones inactivas
    - Decrementar activeSessionsCount
    - Actualizar hasActiveSession
```

---

## Validaciones Importantes

### En Login
1. Credenciales válidas
2. Usuario existe en Firestore
3. Usuario activo (`active = true`)
4. Fecha no expirada (`activeUntil > now`)
5. Sesiones disponibles (`activeSessionsCount < maxSessions`)

### En Creación de Usuario
1. Email único
2. Contraseña segura (mínimo 6 caracteres)
3. Todos los campos requeridos
4. Rol válido
5. maxSessions >= 1

### En Actualización
1. No cambiar email (deshabilitado en formulario)
2. No cambiar contraseña desde admin (usar resetPassword)
3. Validar fecha activeUntil si se proporciona

---

## Consideraciones de Seguridad

1. **Transacciones Atómicas**: Usar `runTransaction` para operaciones críticas
2. **Validación de Roles**: Verificar permisos en Cloud Functions
3. **Revocación de Tokens**: Usar `revokeRefreshTokens` para logout forzado
4. **Heartbeat**: Mantener sesiones activas y detectar inactividad
5. **Firestore Rules**: Configurar reglas de seguridad apropiadas

### Ejemplo de Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Leer: usuario autenticado puede leer su propio documento o ser admin
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'superadmin']);
      
      // Escribir: solo admin/superadmin
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'superadmin'];
    }
  }
}
```

---

## Resumen de Campos Clave

| Campo | Tipo | Descripción | Default |
|-------|------|-------------|---------|
| `uid` | string | ID único de Firebase Auth | Auto |
| `email` | string | Correo electrónico único | - |
| `role` | UserRole | Rol del usuario | 'guest' |
| `active` | boolean | Usuario activo/inactivo | true |
| `activeUntil` | Date | Fecha de expiración | null |
| `maxSessions` | number | Sesiones simultáneas permitidas | 1 |
| `activeSessionsCount` | number | Sesiones activas actuales | 0 |
| `hasActiveSession` | boolean | Indicador de sesión activa | false |
| `sessions` | object | Objeto con sesiones activas | {} |
| `lastHeartbeat` | Timestamp | Último heartbeat recibido | - |

---

## Próximos Pasos para Implementación

1. **Configurar Firebase Project**
   - Crear proyecto en Firebase Console
   - Habilitar Authentication (Email/Password)
   - Crear Firestore Database
   - Habilitar Storage
   - Configurar Functions

2. **Copiar Archivos**
   - Copiar modelos, servicios y repositorios
   - Ajustar imports según estructura del proyecto
   - Configurar environment.ts con credenciales

3. **Instalar Dependencias**
   ```bash
   npm install @angular/fire firebase
   npm install --save-dev firebase-tools
   ```

4. **Configurar Módulos**
   - Importar Firebase modules en app.module.ts
   - Registrar servicios y repositorios
   - Configurar rutas con AuthGuard

5. **Desplegar Functions**
   ```bash
   firebase init functions
   cd functions
   npm install
   firebase deploy --only functions
   ```

6. **Configurar Firestore Rules**
   - Aplicar reglas de seguridad
   - Configurar índices si es necesario

7. **Probar Flujos**
   - Login/Logout
   - Creación de usuarios
   - Control de sesiones
   - Forzar logout
   - Heartbeat

---

**Fin del documento**
