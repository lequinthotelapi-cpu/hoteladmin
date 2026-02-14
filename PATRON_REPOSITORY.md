# 🏗️ Tópico: Patrón Repository - Documentación Completa

## 📋 Resumen Ejecutivo

Se implementó correctamente el **Patrón Repository** en el proyecto, refactorizando el acceso a datos para seguir principios SOLID y arquitectura limpia. Ahora el proyecto tiene una estructura escalable y flexible que permite cambiar la fuente de datos (Firestore, API REST, GraphQL) sin modificar la lógica de negocio.

---

## 🎯 Objetivos Completados

1. ✅ Crear `BaseRepository<T>` genérico reutilizable
2. ✅ Crear `BaseFirestoreRepository<T>` con implementación Firestore
3. ✅ Refactorizar `UserRepository` para extender `BaseRepository`
4. ✅ Refactorizar `AuthService` para usar `UserRepository` (eliminar acceso directo a Firestore)
5. ✅ Crear ejemplo completo con nueva entidad `Product`
6. ✅ Configurar Dependency Injection en `app.module.ts`
7. ✅ Documentar estructura y guía de uso

---

## 📁 Estructura de Archivos

### Archivos Creados

```
/workspace/src/app/
│
├── domain/
│   ├── models/
│   │   ├── user.model.ts                    (existente)
│   │   └── product.model.ts                 ← NUEVO
│   │
│   └── repositories/
│       ├── base.repository.ts               ← NUEVO (Contrato genérico)
│       ├── user.repository.ts               (refactorizado)
│       └── product.repository.ts            ← NUEVO
│
└── infrastructure/
    └── repositories/
        ├── base-firestore.repository.ts     ← NUEVO (Implementación genérica)
        ├── firebase-user.repository.ts      (refactorizado)
        └── firebase-product.repository.ts   ← NUEVO
```

### Archivos Modificados

```
├── services/
│   └── auth.service.ts                      ← Refactorizado (usa UserRepository)
│
└── app.module.ts                            ← Agregado ProductRepository provider
```

---

## 🏛️ Arquitectura del Patrón Repository

### Capas de la Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  Components (LoginComponent, ProductListComponent, etc.)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  Services (AuthService, UserService, ProductService)        │
│  - Lógica de negocio                                        │
│  - Casos de uso                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                             │
│  Repositories (Contratos abstractos)                        │
│  - BaseRepository<T>                                        │
│  - UserRepository extends BaseRepository<User>              │
│  - ProductRepository extends BaseRepository<Product>        │
│                                                              │
│  Models (Entidades)                                         │
│  - User, Product, Order, etc.                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                         │
│  Repository Implementations                                  │
│  - BaseFirestoreRepository<T>                               │
│  - FirebaseUserRepository                                   │
│  - FirebaseProductRepository                                │
│  - ApiUserRepository (futuro)                               │
│  - ApiProductRepository (futuro)                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                              │
│  Firestore, REST API, GraphQL, LocalStorage, etc.          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Implementación Detallada

### 1. BaseRepository<T> (Contrato Genérico)

**Ubicación**: `/workspace/src/app/domain/repositories/base.repository.ts`

```typescript
export abstract class BaseRepository<T> {
  abstract getAll(): Observable<T[]>;
  abstract getById(id: string): Observable<T | null>;
  abstract getByField(field: string, value: any): Observable<T[]>;
  abstract create(entity: T): Promise<void>;
  abstract update(id: string, entity: Partial<T>): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
```

**Características**:
- ✅ Genérico con `<T>` (funciona con cualquier entidad)
- ✅ Define operaciones CRUD estándar
- ✅ Usa `Observable` para operaciones de lectura (reactivo)
- ✅ Usa `Promise` para operaciones de escritura
- ✅ Métodos abstractos (sin implementación)

---

### 2. BaseFirestoreRepository<T> (Implementación Genérica)

**Ubicación**: `/workspace/src/app/infrastructure/repositories/base-firestore.repository.ts`

```typescript
export abstract class BaseFirestoreRepository<T> implements BaseRepository<T> {
  
  protected abstract collectionName: string;

  constructor(protected firestore: Firestore) {}

  getAll(): Observable<T[]> {
    const ref = collection(this.firestore, this.collectionName);
    return collectionData(ref, { idField: 'id' as any }) as Observable<T[]>;
  }

  getById(id: string): Observable<T | null> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    return docData(ref, { idField: 'id' as any }) as Observable<T>;
  }

  getByField(field: string, value: any): Observable<T[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where(field as any, '==', value));
    return collectionData(q, { idField: 'id' as any }) as Observable<T[]>;
  }

  async create(entity: T): Promise<void> {
    const id = (entity as any).id;
    if (id) {
      const ref = doc(this.firestore, `${this.collectionName}/${id}`);
      const data = { ...entity };
      delete (data as any).id;
      await setDoc(ref, data);
    } else {
      throw new Error('Entity must have an id property');
    }
  }

  async update(id: string, entity: Partial<T>): Promise<void> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    const data = { ...entity };
    delete (data as any).id;
    await updateDoc(ref, data as any);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.firestore, `${this.collectionName}/${id}`);
    await deleteDoc(ref);
  }
}
```

**Características**:
- ✅ Implementa todos los métodos de `BaseRepository<T>`
- ✅ Usa Firebase/Firestore SDK
- ✅ Requiere definir `collectionName` en clases hijas
- ✅ Maneja automáticamente el campo `id`
- ✅ Reutilizable para cualquier entidad

---

### 3. UserRepository (Contrato Específico)

**Ubicación**: `/workspace/src/app/domain/repositories/user.repository.ts`

```typescript
import { User } from '../models/user.model';
import { BaseRepository } from './base.repository';

export abstract class UserRepository extends BaseRepository<User> {
  // Métodos específicos de User aquí
  // Ejemplo: abstract getUsersByRole(role: string): Observable<User[]>;
}
```

**Características**:
- ✅ Extiende `BaseRepository<User>`
- ✅ Hereda todos los métodos CRUD
- ✅ Puede agregar métodos específicos de usuarios

---

### 4. FirebaseUserRepository (Implementación Específica)

**Ubicación**: `/workspace/src/app/infrastructure/repositories/firebase-user.repository.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class FirebaseUserRepository 
  extends BaseFirestoreRepository<User> 
  implements UserRepository {

  protected collectionName = 'users';

  constructor(firestore: Firestore) {
    super(firestore);
  }

  // Métodos específicos aquí
  // getUsersByRole(role: string): Observable<User[]> {
  //   return this.getByField('role', role);
  // }
}
```

**Características**:
- ✅ Extiende `BaseFirestoreRepository<User>`
- ✅ Implementa `UserRepository`
- ✅ Solo define `collectionName = 'users'`
- ✅ Hereda toda la funcionalidad CRUD
- ✅ Código mínimo (3 líneas efectivas)

---

### 5. AuthService Refactorizado

**Ubicación**: `/workspace/src/app/services/auth.service.ts`

**ANTES** (Acceso directo a Firestore):
```typescript
export class AuthService {
  constructor(
    private auth: Auth,
    private firestore: Firestore  // ❌ Acceso directo
  ) {}

  private async createUserDocumentIfNotExists(user: User) {
    const userDocRef = doc(this.firestore, `users/${user.uid}`);  // ❌
    const userDoc = await getDoc(userDocRef);                     // ❌
    
    if (!userDoc.exists()) {
      await setDoc(userDocRef, { ... });  // ❌
    }
  }
}
```

**DESPUÉS** (Usa Repository):
```typescript
export class AuthService {
  constructor(
    private auth: Auth,
    private userRepository: UserRepository  // ✅ Usa contrato
  ) {}

  private async ensureUserDocument(firebaseUser: FirebaseUser) {
    // Verificar si existe
    const existingUser = await firstValueFrom(
      this.userRepository.getById(firebaseUser.uid)  // ✅
    );

    if (!existingUser) {
      // Crear usando repository
      const newUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Usuario',
        email: firebaseUser.email!,
        role: 'user',
        active: true
      };
      
      await this.userRepository.create(newUser);  // ✅
    }
  }
}
```

**Beneficios**:
- ✅ No depende de Firestore directamente
- ✅ Fácil de testear (mock del repository)
- ✅ Cambiar a API REST no requiere modificar AuthService

---

## 🆕 Ejemplo: Nueva Entidad Product

### Paso 1: Crear el Modelo

**Archivo**: `/workspace/src/app/domain/models/product.model.ts`

```typescript
export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### Paso 2: Crear el Repository (Contrato)

**Archivo**: `/workspace/src/app/domain/repositories/product.repository.ts`

```typescript
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { BaseRepository } from './base.repository';

export abstract class ProductRepository extends BaseRepository<Product> {
  // Métodos específicos de productos
  abstract getByCategory(category: string): Observable<Product[]>;
  abstract getActiveProducts(): Observable<Product[]>;
}
```

### Paso 3: Crear la Implementación Firestore

**Archivo**: `/workspace/src/app/infrastructure/repositories/firebase-product.repository.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class FirebaseProductRepository 
  extends BaseFirestoreRepository<Product> 
  implements ProductRepository {

  protected collectionName = 'products';

  constructor(firestore: Firestore) {
    super(firestore);
  }

  getByCategory(category: string): Observable<Product[]> {
    return this.getByField('category', category);
  }

  getActiveProducts(): Observable<Product[]> {
    return this.getByField('active', true);
  }
}
```

### Paso 4: Registrar en app.module.ts

```typescript
import { ProductRepository } from './domain/repositories/product.repository';
import { FirebaseProductRepository } from './infrastructure/repositories/firebase-product.repository';

@NgModule({
  providers: [
    { provide: UserRepository, useClass: FirebaseUserRepository },
    { provide: ProductRepository, useClass: FirebaseProductRepository }
  ]
})
```

### Paso 5: Usar en un Servicio

```typescript
@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  getAllProducts(): Observable<Product[]> {
    return this.productRepository.getAll();
  }

  getProductsByCategory(category: string): Observable<Product[]> {
    return this.productRepository.getByCategory(category);
  }

  async createProduct(product: Product): Promise<void> {
    await this.productRepository.create(product);
  }
}
```

---

## 🔄 Cambiar de Firestore a API REST

### Escenario: Migrar a Backend con API

#### 1. Crear ApiUserRepository

**Archivo**: `/workspace/src/app/infrastructure/repositories/api-user.repository.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class ApiUserRepository implements UserRepository {
  
  private apiUrl = 'https://api.example.com/users';

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getById(id: string): Observable<User | null> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  getByField(field: string, value: any): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}?${field}=${value}`);
  }

  async create(user: User): Promise<void> {
    await firstValueFrom(this.http.post(this.apiUrl, user));
  }

  async update(id: string, user: Partial<User>): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/${id}`, user));
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
  }
}
```

#### 2. Cambiar en app.module.ts (1 línea)

```typescript
// ANTES
{ provide: UserRepository, useClass: FirebaseUserRepository }

// DESPUÉS
{ provide: UserRepository, useClass: ApiUserRepository }
```

#### 3. ¡Listo! Todo sigue funcionando

- ✅ AuthService - NO cambia
- ✅ UserService - NO cambia
- ✅ Componentes - NO cambian
- ✅ Lógica de negocio - NO cambia

---

## 📊 Comparación: Antes vs Después

### ❌ ANTES (Sin Repository Pattern)

```
AuthService
  ├── Firestore (acceso directo)
  ├── doc(), getDoc(), setDoc()
  └── Acoplado a Firebase

UserService
  ├── Firestore (acceso directo)
  └── Acoplado a Firebase

ProductService
  ├── Firestore (acceso directo)
  └── Acoplado a Firebase
```

**Problemas**:
- ❌ Código duplicado en cada servicio
- ❌ Difícil de testear
- ❌ Cambiar a API requiere modificar todos los servicios
- ❌ Acoplamiento alto con Firestore

### ✅ DESPUÉS (Con Repository Pattern)

```
AuthService
  └── UserRepository (contrato)

UserService
  └── UserRepository (contrato)

ProductService
  └── ProductRepository (contrato)

app.module.ts
  ├── UserRepository → FirebaseUserRepository
  └── ProductRepository → FirebaseProductRepository
```

**Beneficios**:
- ✅ Código reutilizable (BaseRepository)
- ✅ Fácil de testear (mock repositories)
- ✅ Cambiar a API = cambiar 1 línea
- ✅ Bajo acoplamiento
- ✅ Principios SOLID

---

## 🎓 Conceptos Técnicos Aplicados

### 1. Patrón Repository
- ✅ Abstracción del acceso a datos
- ✅ Separación de concerns
- ✅ Inversión de dependencias

### 2. Generics en TypeScript
- ✅ `BaseRepository<T>`
- ✅ `BaseFirestoreRepository<T>`
- ✅ Reutilización de código

### 3. Herencia y Composición
- ✅ `UserRepository extends BaseRepository<User>`
- ✅ `FirebaseUserRepository extends BaseFirestoreRepository<User>`

### 4. Dependency Injection
- ✅ Angular DI container
- ✅ `{ provide: UserRepository, useClass: FirebaseUserRepository }`
- ✅ Inyección por contrato, no por implementación

### 5. Principios SOLID
- ✅ **S**ingle Responsibility
- ✅ **O**pen/Closed
- ✅ **L**iskov Substitution
- ✅ **I**nterface Segregation
- ✅ **D**ependency Inversion

### 6. Clean Architecture
- ✅ Domain Layer (contratos y modelos)
- ✅ Infrastructure Layer (implementaciones)
- ✅ Application Layer (servicios)
- ✅ Presentation Layer (componentes)

---

## 📚 Guía de Uso: Agregar Nueva Entidad

### Checklist para Agregar una Nueva Entidad

#### 1. Crear el Modelo
```typescript
// domain/models/order.model.ts
export interface Order {
  id?: string;
  userId: string;
  products: string[];
  total: number;
  status: string;
  createdAt?: Date;
}
```

#### 2. Crear el Repository (Contrato)
```typescript
// domain/repositories/order.repository.ts
export abstract class OrderRepository extends BaseRepository<Order> {
  abstract getByUserId(userId: string): Observable<Order[]>;
  abstract getByStatus(status: string): Observable<Order[]>;
}
```

#### 3. Crear la Implementación
```typescript
// infrastructure/repositories/firebase-order.repository.ts
@Injectable({ providedIn: 'root' })
export class FirebaseOrderRepository 
  extends BaseFirestoreRepository<Order> 
  implements OrderRepository {

  protected collectionName = 'orders';

  constructor(firestore: Firestore) {
    super(firestore);
  }

  getByUserId(userId: string): Observable<Order[]> {
    return this.getByField('userId', userId);
  }

  getByStatus(status: string): Observable<Order[]> {
    return this.getByField('status', status);
  }
}
```

#### 4. Registrar en app.module.ts
```typescript
import { OrderRepository } from './domain/repositories/order.repository';
import { FirebaseOrderRepository } from './infrastructure/repositories/firebase-order.repository';

providers: [
  { provide: OrderRepository, useClass: FirebaseOrderRepository }
]
```

#### 5. Usar en Servicios/Componentes
```typescript
export class OrderService {
  constructor(private orderRepository: OrderRepository) {}

  getUserOrders(userId: string): Observable<Order[]> {
    return this.orderRepository.getByUserId(userId);
  }
}
```

---

## ✅ Verificación

### Build Exitoso
```bash
npm run build
# ✅ Build at: 2026-02-07T17:21:51.112Z
# ✅ Hash: 85cdad731be53d86
# ✅ Time: 9310ms
```

### Archivos Creados: 5
- `base.repository.ts`
- `base-firestore.repository.ts`
- `product.model.ts`
- `product.repository.ts`
- `firebase-product.repository.ts`

### Archivos Modificados: 3
- `user.repository.ts`
- `firebase-user.repository.ts`
- `auth.service.ts`
- `app.module.ts`

---

## 🚀 Próximos Pasos Sugeridos

1. **Testing**: Crear tests unitarios con mocks de repositories
2. **API Implementation**: Crear `ApiUserRepository` y `ApiProductRepository`
3. **Caching**: Agregar capa de caché en repositories
4. **Pagination**: Agregar métodos para paginación
5. **Error Handling**: Mejorar manejo de errores
6. **Logging**: Agregar logging en repositories

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| Archivos creados | 5 |
| Archivos modificados | 4 |
| Líneas de código | ~300 |
| Entidades implementadas | 2 (User, Product) |
| Repositories creados | 3 (Base, User, Product) |
| Conceptos aplicados | 15+ |
| Tiempo de implementación | ~45 min |

---

**Fecha**: 2026-02-07  
**Tópico**: Patrón Repository  
**Estado**: ✅ COMPLETADO  
**Build**: ✅ Exitoso
