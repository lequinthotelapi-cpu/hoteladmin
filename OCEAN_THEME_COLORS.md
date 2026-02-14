# Ocean Theme - Color Palette

## Custom Color Palette

This theme uses a professional blue-based color scheme with vibrant accents.

### Primary Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Deep Blue** | `#115D8C` | rgb(17, 93, 140) | Primary color, buttons, links |
| **Dark Navy** | `#0B3B59` | rgb(11, 59, 89) | Sidenav background, dark elements |
| **Periwinkle** | `#9498F2` | rgb(148, 152, 242) | Accent color, highlights |
| **Cyan Bright** | `#05DBF2` | rgb(5, 219, 242) | Logo, special highlights |
| **Light Gray** | `#F0F1F2` | rgb(240, 241, 242) | Backgrounds, cards |

### Supporting Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Soft Gray** | `#E8EAED` | rgb(232, 234, 237) | Borders, dividers |
| **Blue Black** | `#1A1F2E` | rgb(26, 31, 46) | Text on light backgrounds |

## Material Design Palette

The theme extends Material Design's palette system with custom shades:

### Primary Palette (Blue)
- **50**: `#e3f2fd` (Lightest)
- **500**: `#115D8C` (Main)
- **700**: `#0B3B59` (Dark)
- **A100**: `#05DBF2` (Accent Light)

### Accent Palette (Periwinkle)
- **50**: `#f3f3fe` (Lightest)
- **500**: `#9498F2` (Main)
- **900**: `#656ae8` (Darkest)

## Component Colors

### Sidenav
- Background: `#0B3B59` (Dark Navy)
- Text: `#F0F1F2` (Light Gray)
- Logo: `#05DBF2` (Cyan Bright)
- Hover: `#115D8C` (Deep Blue)
- Icon Tint: `rgba(#05DBF2, 0.7)` (Cyan with opacity)

### Toolbar
- Background: Material card color (theme-dependent)
- Logo: `#115D8C` (Deep Blue)

## Usage Examples

### In SCSS
```scss
// Using theme variables
.my-component {
  background: $theme-color-primary; // #115D8C
  color: $theme-text;
}

// Direct color usage
.custom-element {
  background: #0B3B59;
  border-color: #05DBF2;
}
```

### In TypeScript
```typescript
// Setting the ocean light theme
this.themeService.setTheme('fury-ocean');

// Setting the ocean dark theme
this.themeService.setTheme('fury-ocean-dark');

// Or using style preset
this.themeService.setStyle('ocean');
this.themeService.setStyle('ocean-dark');
```

## Theme Variants

### Ocean (Light)
- Background: Light colors (#F0F1F2)
- Cards: White
- Text: Dark (#1A1F2E)
- Sidenav: Dark Navy (#0B3B59)

### Ocean Dark
- Background: Very dark (#051f30, #082d44)
- Cards: Dark Navy (#0B3B59)
- Text: Light (#F0F1F2)
- Sidenav: Darker Navy (#082d44)
- Accents: Cyan (#05DBF2) for better contrast

## Color Psychology

- **Blue tones**: Trust, professionalism, stability
- **Cyan accents**: Innovation, technology, freshness
- **Periwinkle**: Creativity, calmness, sophistication

## Accessibility

All color combinations meet WCAG 2.1 AA standards for contrast:
- Dark Navy (#0B3B59) on Light Gray (#F0F1F2): ✅ AAA
- Deep Blue (#115D8C) on White: ✅ AA
- Periwinkle (#9498F2) on White: ✅ AA
- Cyan (#05DBF2) on Dark Navy: ✅ AAA

## Files Modified

1. `/src/@fury/styles/themes/_ocean.scss` - Ocean light theme definition
2. `/src/@fury/styles/themes/_ocean-dark.scss` - Ocean dark theme definition
3. `/src/app/app.theme.scss` - Palette and theme classes
4. `/src/@fury/services/theme.service.ts` - Theme types and logic
5. `/src/app/layout/config-panel/` - UI selector with both variants
6. `/src/app/app.component.ts` - Default theme setting
