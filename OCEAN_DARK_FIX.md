# Fix: Ocean Dark - Paleta Personalizada

## Problema Identificado

El tema `fury-ocean-dark` estaba mostrando colores grises de Material Design por defecto:
- ❌ `#212121` - Gris muy oscuro (background)
- ❌ `#424242` - Gris medio (cards)
- ❌ No combinaban con `#082d44` del sidenav

**Causa**: `mat.define-dark-theme()` usa paletas de background y foreground por defecto de Material.

## Solución Implementada

Sobrescribir las paletas `background` y `foreground` del tema dark con nuestros colores Ocean.

### Código Anterior
```scss
$ocean-dark-theme: mat.define-dark-theme((
  color: (
    primary: $ocean-primary,
    accent: $ocean-accent,
    warn: $theme-warn
  )
));
```

### Código Nuevo
```scss
$ocean-dark-theme: mat.define-dark-theme((
  color: (
    primary: $ocean-primary,
    accent: $ocean-accent,
    warn: $theme-warn
  ),
  // Custom dark background palette with ocean colors
  background: (
    status-bar: #051f30,      // Navy más oscuro
    app-bar: #082d44,         // Navy oscuro (match sidenav)
    background: #0B3B59,      // Navy medio
    hover: rgba(#115D8C, 0.08),
    card: #0e4f75,            // Navy medio-claro
    dialog: #0e4f75,
    raised-button: #0e4f75,
    selected-button: #115D8C,
    tooltip: #115D8C,
    // ... más propiedades
  ),
  // Custom dark foreground palette
  foreground: (
    base: #F0F1F2,            // Gris claro
    text: #F0F1F2,
    divider: rgba(#05DBF2, 0.12),  // Cyan con opacidad
    hint-text: rgba(#F0F1F2, 0.5),
    secondary-text: rgba(#F0F1F2, 0.7),
    // ... más propiedades
  ),
));
```

## Paleta Background Personalizada

| Propiedad | Color | Uso |
|-----------|-------|-----|
| `status-bar` | `#051f30` | Barra de estado (más oscuro) |
| `app-bar` | `#082d44` | Toolbar (match sidenav) |
| `background` | `#0B3B59` | Fondo principal |
| `card` | `#0e4f75` | Tarjetas y elevaciones |
| `dialog` | `#0e4f75` | Diálogos y modales |
| `hover` | `rgba(#115D8C, 0.08)` | Estado hover |
| `selected-button` | `#115D8C` | Botones seleccionados |
| `tooltip` | `#115D8C` | Tooltips |

**Todos los colores son de la paleta Ocean** - Progresión natural de oscuro a claro.

## Paleta Foreground Personalizada

| Propiedad | Color | Uso |
|-----------|-------|-----|
| `base` | `#F0F1F2` | Color base de texto |
| `text` | `#F0F1F2` | Texto principal |
| `icon` | `#F0F1F2` | Iconos |
| `divider` | `rgba(#05DBF2, 0.12)` | Divisores (cyan sutil) |
| `hint-text` | `rgba(#F0F1F2, 0.5)` | Texto de ayuda |
| `secondary-text` | `rgba(#F0F1F2, 0.7)` | Texto secundario |
| `disabled` | `rgba(#F0F1F2, 0.38)` | Elementos deshabilitados |

**Usa cyan (#05DBF2) para divisores** - Mantiene coherencia con la paleta.

## Cambio Adicional

### Antes
```scss
.fury-ocean-dark {
  @include mat.all-component-colors($ocean-dark-theme);
  // ...
}
```

### Después
```scss
.fury-ocean-dark {
  @include mat.all-component-themes($ocean-dark-theme);
  // ...
}
```

**Razón**: `all-component-themes` incluye colores, tipografía y densidad. Necesario para que las paletas custom funcionen correctamente.

## Resultado Visual

### Antes (con grises de Material)
```
Sidenav:    #082d44 (azul oscuro) ✓
Background: #212121 (gris oscuro) ✗ No combina
Cards:      #424242 (gris medio) ✗ No combina
```

### Después (con paleta Ocean)
```
Sidenav:    #082d44 (navy oscuro) ✓
Background: #0B3B59 (navy medio) ✓ Combina perfectamente
Cards:      #0e4f75 (navy claro) ✓ Progresión natural
App-bar:    #082d44 (navy oscuro) ✓ Match con sidenav
```

## Progresión de Colores Ocean Dark

De más oscuro a más claro:
1. `#051f30` - Status bar (casi negro azulado)
2. `#082d44` - Sidenav, app-bar
3. `#0B3B59` - Background principal
4. `#0e4f75` - Cards, dialogs
5. `#115D8C` - Elementos interactivos
6. `#05DBF2` - Acentos cyan
7. `#F0F1F2` - Texto

**Todos son tonos azules** - Coherencia visual total.

## Conceptos Aplicados

### Material Design Theming Avanzado
- ✅ Sobrescritura de paletas `background` y `foreground`
- ✅ Uso de `rgba()` para opacidades
- ✅ Estados de interacción (hover, selected, disabled)
- ✅ Diferencia entre `all-component-colors` y `all-component-themes`

### Design System
- ✅ Progresión coherente de colores
- ✅ Jerarquía visual clara
- ✅ Consistencia en toda la UI
- ✅ Accesibilidad mantenida

### SCSS
- ✅ Mapas complejos en SCSS
- ✅ Funciones `rgba()` con variables
- ✅ Sobrescritura de valores por defecto

## Verificación

```bash
npm run build
# ✅ Build at: 2026-02-07T16:40:59.629Z
# ✅ Sin errores
# ✅ Tema compila correctamente
```

## Testing Visual

1. Iniciar app: `npm start`
2. Abrir Config Panel (⚙️)
3. Seleccionar "Ocean Dark"
4. Verificar:
   - ✅ Sidenav y toolbar tienen el mismo tono
   - ✅ Cards son azul navy, no gris
   - ✅ Background es azul oscuro, no gris
   - ✅ Divisores tienen tinte cyan sutil
   - ✅ Texto es gris claro (#F0F1F2)

## Comparación Final

| Elemento | Material Default | Ocean Dark Custom |
|----------|------------------|-------------------|
| Background | `#303030` gris | `#0B3B59` navy |
| Card | `#424242` gris | `#0e4f75` navy |
| App-bar | `#212121` gris | `#082d44` navy |
| Divider | `rgba(white, 0.12)` | `rgba(#05DBF2, 0.12)` cyan |
| Text | `white` | `#F0F1F2` gris claro |

**Resultado**: Tema completamente coherente con la paleta Ocean.

## Archivos Modificados

- `/src/app/app.theme.scss` - Agregadas paletas custom background y foreground

**Líneas agregadas**: ~40  
**Conceptos nuevos**: Custom theme palettes, Material theming avanzado

---

**Fix aplicado**: 2026-02-07  
**Problema**: Colores grises no coherentes  
**Solución**: Paletas background/foreground personalizadas  
**Estado**: ✅ RESUELTO
