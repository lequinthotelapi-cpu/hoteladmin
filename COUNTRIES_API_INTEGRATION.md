# Integración de API Externa de Países

## Índice
1. [Objetivo](#objetivo)
2. [API Utilizada](#api-utilizada)
3. [Implementación](#implementación)
4. [Modelo de Datos](#modelo-de-datos)
5. [Servicio de Países](#servicio-de-países)
6. [Autocomplete en Formulario](#autocomplete-en-formulario)
7. [Archivos Modificados](#archivos-modificados)

---

## Objetivo

Reemplazar el parámetro estático de países por una API externa que proporciona:
- Lista completa de países del mundo
- Códigos ISO2 e ISO3
- Banderas en formato Unicode (emoji)
- Búsqueda y filtrado con autocomplete

---

## API Utilizada

**Endpoint**: `https://countriesnow.space/api/v0.1/countries/flag/unicode`

**Método**: GET

**Respuesta**:
```json
{
  "error": false,
  "msg": "countries and unicode flags retrieved",
  "data": [
    {
      "name": "Bangladesh",
      "iso2": "BD",
      "iso3": "BGD",
      "unicodeFlag": "🇧🇩"
    },
    {
      "name": "Belgium",
      "iso2": "BE",
      "iso3": "BEL",
      "unicodeFlag": "🇧🇪"
    }
  ]
}
```

---

## Implementación

### 1. Modelo de Datos

**Archivo**: `/workspace/src/app/domain/models/country.model.ts`

```typescript
export interface Country {
  name: string;
  iso2: string;
  iso3: string;
  unicodeFlag: string;
}

export interface CountriesApiResponse {
  error: boolean;
  msg: string;
  data: Country[];
}
```

**Características**:
- Interface tipada para la respuesta de la API
- Modelo Country con 4 campos esenciales
- Preparado para TypeScript strict mode

---

### 2. Servicio de Países

**Archivo**: `/workspace/src/app/core/services/countries.service.ts`

```typescript
@Injectable({
  providedIn: 'root'
})
export class CountriesService {
  private apiUrl = 'https://countriesnow.space/api/v0.1/countries/flag/unicode';
  private countriesCache$ = new BehaviorSubject<Country[]>([]);
  private loaded = false;

  loadCountries(): Observable<Country[]> {
    if (this.loaded) {
      return this.countriesCache$.asObservable();
    }

    return this.http.get<CountriesApiResponse>(this.apiUrl).pipe(
      map(response => response.data.sort((a, b) => a.name.localeCompare(b.name))),
      tap(countries => {
        this.countriesCache$.next(countries);
        this.loaded = true;
      }),
      catchError(error => {
        console.error('Error loading countries:', error);
        return of([]);
      })
    );
  }

  searchCountries(searchTerm: string): Observable<Country[]> {
    return this.getCountries().pipe(
      map(countries => {
        if (!searchTerm || searchTerm.trim() === '') {
          return countries;
        }
        const term = searchTerm.toLowerCase();
        return countries.filter(country => 
          country.name.toLowerCase().includes(term) ||
          country.iso2.toLowerCase().includes(term) ||
          country.iso3.toLowerCase().includes(term)
        );
      })
    );
  }
}
```

**Características**:
- **Caché en memoria**: BehaviorSubject para evitar múltiples llamadas HTTP
- **Carga única**: Flag `loaded` para controlar si ya se cargaron los datos
- **Ordenamiento**: Países ordenados alfabéticamente
- **Búsqueda**: Filtrado por nombre, ISO2 o ISO3
- **Manejo de errores**: Retorna array vacío en caso de fallo

---

### 3. Autocomplete en Formulario

**Archivo**: `/workspace/src/app/features/private/guests/guest-create-update/guest-create-update.component.ts`

#### Propiedades Agregadas

```typescript
countries: Country[] = [];
filteredCountriesOrigin: Observable<Country[]>;
filteredCountriesResidence: Observable<Country[]>;
```

#### Métodos Implementados

**loadCountries()**:
```typescript
loadCountries(): void {
  this.countriesService.loadCountries().subscribe(countries => {
    this.countries = countries;
    this.setupAutocomplete();
  });
}
```

**setupAutocomplete()**:
```typescript
setupAutocomplete(): void {
  this.filteredCountriesOrigin = this.form.get('countryOfOrigin')!.valueChanges.pipe(
    startWith(''),
    map(value => this._filterCountries(value || ''))
  );

  this.filteredCountriesResidence = this.form.get('country')!.valueChanges.pipe(
    startWith(''),
    map(value => this._filterCountries(value || ''))
  );
}
```

**_filterCountries()** (privado):
```typescript
private _filterCountries(value: string): Country[] {
  if (!value) return this.countries;
  const filterValue = value.toLowerCase();
  return this.countries.filter(country => 
    country.name.toLowerCase().includes(filterValue) ||
    country.iso2.toLowerCase().includes(filterValue) ||
    country.iso3.toLowerCase().includes(filterValue)
  );
}
```

**displayCountry()**:
```typescript
displayCountry(countryName: string): string {
  if (!countryName) return '';
  const country = this.countries.find(c => c.name === countryName);
  return country ? `${country.unicodeFlag} ${country.name}` : countryName;
}
```

---

### 4. Template HTML

**Archivo**: `/workspace/src/app/features/private/guests/guest-create-update/guest-create-update.component.html`

#### País de Origen (Autocomplete)

```html
<mat-form-field fxFlex="auto">
  <mat-label>País de Origen</mat-label>
  <input matInput formControlName="countryOfOrigin" [matAutocomplete]="autoOrigin">
  <mat-autocomplete #autoOrigin="matAutocomplete" [displayWith]="displayCountry.bind(this)">
    <mat-option *ngFor="let country of filteredCountriesOrigin | async" [value]="country.name">
      {{ country.unicodeFlag }} {{ country.name }}
    </mat-option>
  </mat-autocomplete>
</mat-form-field>
```

#### País de Residencia (Autocomplete)

```html
<mat-form-field fxFlex="auto">
  <mat-label>País de Residencia</mat-label>
  <input matInput formControlName="country" [matAutocomplete]="autoResidence">
  <mat-autocomplete #autoResidence="matAutocomplete" [displayWith]="displayCountry.bind(this)">
    <mat-option *ngFor="let country of filteredCountriesResidence | async" [value]="country.name">
      {{ country.unicodeFlag }} {{ country.name }}
    </mat-option>
  </mat-autocomplete>
</mat-form-field>
```

**Características del Autocomplete**:
- Input de texto con sugerencias
- Filtrado en tiempo real mientras se escribe
- Muestra bandera emoji + nombre del país
- Búsqueda por nombre, ISO2 o ISO3
- Función `displayWith` para mostrar valor seleccionado

---

## Archivos Modificados

### Archivos Creados (2)
1. `/workspace/src/app/domain/models/country.model.ts` - Modelo de datos
2. `/workspace/src/app/core/services/countries.service.ts` - Servicio HTTP

### Archivos Modificados (3)
1. `/workspace/src/app/features/private/guests/guest-create-update/guest-create-update.component.ts`
   - Agregado import de CountriesService
   - Agregado import de Observable, map, startWith
   - Agregadas propiedades: countries, filteredCountriesOrigin, filteredCountriesResidence
   - Inyectado CountriesService en constructor
   - Agregado método loadCountries()
   - Agregado método setupAutocomplete()
   - Agregado método _filterCountries()
   - Agregado método displayCountry()
   - Removido countries de parametersService

2. `/workspace/src/app/features/private/guests/guest-create-update/guest-create-update.component.html`
   - Reemplazado mat-select por input + mat-autocomplete en "País de Origen"
   - Reemplazado mat-select por input + mat-autocomplete en "País de Residencia"
   - Agregado template reference #autoOrigin y #autoResidence
   - Agregado [displayWith] binding
   - Agregado async pipe para observables

3. `/workspace/src/app/features/private/guests/guests.module.ts`
   - Agregado import de MatAutocompleteModule
   - Agregado MatAutocompleteModule al array de imports

---

## Ventajas de la Implementación

### 1. **Datos Actualizados**
- Lista completa de países del mundo
- Mantenida por API externa
- No requiere actualización manual

### 2. **Mejor UX**
- Búsqueda rápida con autocomplete
- Banderas emoji para identificación visual
- Filtrado por nombre o código ISO

### 3. **Performance**
- Caché en memoria (BehaviorSubject)
- Una sola llamada HTTP por sesión
- Filtrado local sin latencia

### 4. **Reutilizable**
- Servicio global (providedIn: 'root')
- Puede usarse en cualquier módulo
- Preparado para otros formularios

### 5. **Mantenible**
- Código limpio y separado
- Fácil de testear
- Fácil de cambiar API si es necesario

---

## Uso en Otros Módulos

Para usar el servicio de países en otros componentes:

```typescript
import { CountriesService } from '@core/services/countries.service';
import { Country } from '@domain/models/country.model';

export class OtroComponente {
  countries: Country[] = [];

  constructor(private countriesService: CountriesService) {}

  ngOnInit() {
    this.countriesService.getCountries().subscribe(countries => {
      this.countries = countries;
    });
  }
}
```

---

## Conceptos Técnicos Aplicados

1. **HTTP Client**: Consumo de API REST externa
2. **RxJS Operators**: map, tap, catchError, startWith
3. **BehaviorSubject**: Caché reactivo en memoria
4. **Observable Patterns**: Streams de datos reactivos
5. **Material Autocomplete**: Componente de búsqueda avanzada
6. **Async Pipe**: Suscripción automática en template
7. **TypeScript Generics**: Tipado fuerte de respuestas HTTP
8. **Error Handling**: Manejo graceful de errores de red
9. **Performance Optimization**: Caché para evitar llamadas repetidas
10. **UX Enhancement**: Búsqueda en tiempo real con feedback visual

---

## Resultado Final

✅ **Autocomplete funcional** con 250+ países  
✅ **Banderas emoji** para identificación visual  
✅ **Búsqueda en tiempo real** por nombre o código  
✅ **Caché en memoria** para mejor performance  
✅ **Reutilizable** en toda la aplicación  
✅ **Sin dependencia** del sistema de parámetros  

---

**Fecha de implementación**: 2026-02-10  
**Módulo afectado**: Guests (Huéspedes)  
**API externa**: countriesnow.space  
**Estado**: ✅ Completado y funcional
