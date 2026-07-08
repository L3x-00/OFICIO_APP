---
name: ui-tema
description: >-
  Reglas del sistema de tema/color de Servi móvil (claro/oscuro adaptativo,
  contraste AA). Usar SIEMPRE antes de crear o editar pantallas/widgets Flutter
  con colores, o cuando el usuario reporte problemas de tema, contraste o
  legibilidad en la app móvil.
---

# Sistema de tema móvil — reglas exactas

Dos fuentes de color, NUNCA mezclarlas mal:

## 1. Colores por tema → `context.colors` (AppThemeColors)

`final c = context.colors;` en cada build (import
`core/theme/app_theme_colors.dart`). Tokens: `c.bg` · `c.bgCard` · `c.bgInput`
· `c.textPrimary` · `c.textSecondary` · `c.textMuted` · `c.border` ·
`c.warmDeep` · `c.isDark`.

**PROHIBIDO** en superficies temáticas:
- `AppColors.bgDark/bgCard/bgInput/textPrimary/textSecondary/textMuted`
  (estáticos, solo oscuro — en claro dan fondo oscuro/texto ilegible).
- `Colors.white`/`Colors.black` como texto/fondo temático.
- Bordes `Colors.white.withValues(...)` → usar `c.border`.
- Hex crudos `Color(0xFF...)` para fondos/texto — solo tokens.

## 2. Acentos de marca → `AppColors.*` (estáticos a propósito)

`amber` (protagonista) · `primary` (azul) · `busy` · `available` · `delayed` ·
`star` · `verified` · `favorite` · `whatsapp` · `premium` · `business`.

**Contraste AA — helpers obligatorios:**
- Texto/ícono de un accent sobre su PROPIO tinte claro
  (`accent.withValues(alpha: 0.05-0.2)` de fondo) →
  `AppColors.tintOn(accent, c.isDark)` (el accent crudo se lava en claro).
- Glifo sobre fill SÓLIDO de accent (botón/avatar relleno) →
  `AppColors.onSolid(accent)` (decide por luminancia; nunca `Colors.black`/
  `Colors.white` a mano).
- Accent sobre superficie temática (c.bgCard) sin tinte propio → accent crudo OK.

## 3. const

Al meter `c.X` en un subárbol const, quitar el `const` SOLO del nodo mínimo
afectado (el TextStyle/Icon), no del subárbol entero.

## 4. Estructura y comportamiento

- Feature-first: `features/<x>/{data,domain,presentation}`.
- Providers compartidos (Auth/Dashboard/Chat/Providers) son GLOBALES y limpian
  caché en logout — nunca locales a un tab de IndexedStack.
- Tema default = sistema (`ThemeMode.system`); nunca forzar dark por defecto.
- Tamaños móviles: cuerpo ≤ 26px, títulos ≤ 34px, íconos ≤ 64px.

## 5. Tests

Widget que lee `context.colors` → host de test con el ThemeExtension real:
```dart
MaterialApp(theme: AppThemeColors.buildDark(), home: Scaffold(body: child))
```
Sin eso: "Null check operator used on a null value".

## 6. Verificación al terminar

```bash
cd mobile && grep -rE "AppColors\.(bgDark|bgCard|bgInput|textPrimary|textSecondary|textMuted)" lib --include="*.dart"
# ↑ debe dar 0 resultados
flutter analyze <archivos>
```
