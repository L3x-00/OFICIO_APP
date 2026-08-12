# Auditoría UX — Dimensión 1: Carrusel de bienvenida (7 slides)

**Fecha:** 2026-07-31 · **Base:** `main` @ `4254cdc` (árbol sucio, cambios sin commitear)
**Alcance:** `mobile/lib/features/auth/presentation/screens/welcome_screen.dart` +
`mobile/lib/features/auth/presentation/widgets/welcome/**` + `mobile/assets/images/onboarding/**` + `mobile/pubspec.yaml`

---

## Veredicto

El rediseño pasa a 7 slides con foto de fondo por slide. La higiene de ciclo de vida está
**correcta** (no hay fugas), pero hay **3 defectos de severidad alta**: la imagen de fondo
**no llena el contenedor** (bug de constraints con `AnimatedSwitcher`), el auto-avance
**rebobina desde el slide 7 al 1** disparando 6 cambios de página en 600 ms, y el CTA
principal usa colores de texto hardcodeados que **fallan contraste AA** en 6 de los 7 slides.

## Checklist pedido

| Punto verificado | Resultado |
|---|---|
| `slide_community_visual.dart` / `slide_service_grid.dart` borrados sin referencias | ✅ `grep` en `mobile/lib` + `mobile/test` → 0 referencias a los archivos y a `SlideCommunityVisual`/`SlideServiceGrid` |
| `AnimationController` / `PageController` / `Timer` liberados | ✅ `dispose()` (welcome_screen.dart:88-93) cancela el timer y libera ambos controllers |
| `setState` tras `dispose` | ✅ el timer tiene guarda `if (!mounted) return;` (welcome_screen.dart:66); no hay otros callbacks async |
| Indicador refleja 7 | ✅ `PageIndicators(total: _totalSlides)` con `_totalSlides = 7`; ancho ≈132 dp, cabe en 360 dp |
| Se puede terminar desde cualquier slide | ✅ "Omitir" (slides 1-6) y "Explorar Servicios" (slide 7), ambos → `browseAsGuest()` |
| Flujo posterior intacto vs HEAD | ✅ `browseAsGuest()` y push a `LoginScreen(initialMode: AuthMode.login)` idénticos a HEAD (diff solo formato) |
| Assets declarados en pubspec | ✅ `assets/images/onboarding/` ya estaba declarado por directorio (línea ~138, sin cambios); el diff de `pubspec.yaml` es solo `version: 2.0.0+137 → +142` |
| `flutter analyze` sobre los archivos | ✅ "No issues found" |
| PageView lazy | ✅ `PageView.builder` con `itemCount`; los visuales son instancias `const` |
| Precache que bloquee el primer frame | ✅ no hay `precacheImage` (ver H-6: efecto secundario = flash inicial) |

---

## Hallazgos

### H-1 · ALTA · La imagen de fondo se renderiza como una franja centrada, no llena el carrusel
`mobile/lib/features/auth/presentation/widgets/welcome/welcome_carousel.dart:46-53`

`AnimatedSwitcher` usa por defecto `AnimatedSwitcher.defaultLayoutBuilder`, que devuelve
`Stack(alignment: Alignment.center, children: [...])` — **`StackFit.loose`**
(`/c/flutter/packages/flutter/lib/src/widgets/animated_switcher.dart:231-236`).

El `Stack(fit: StackFit.expand)` externo sí da constraints tight al `AnimatedSwitcher`,
pero el `Stack` interno vuelve a pasar constraints **loose** al `Image.asset`. Como la
imagen no declara `width`/`height`, `RenderImage._sizeForConstraints`
(`rendering/image.dart:349-361`) llama a `constrainSizeAndAttemptToPreserveAspectRatio`
con el tamaño intrínseco.

Los 7 `.webp` son **941 × 1672** (ratio 0.563). Con una ventana de ~320 × 280 dp:

```
constrain(941×1672) → limita por alto: 280 → ancho = 280 × 0.563 = 157.6
Resultado: la imagen se dibuja a 157.6 × 280, CENTRADA en 320 × 280
```

`fit: BoxFit.cover` opera dentro de esa caja de 157.6 dp — no arregla nada.

**Escenario:** el usuario abre la app sin sesión → `/welcome` → ve la foto de fondo como
una banda vertical de ~158 dp en el centro de la tarjeta, con ~81 dp de fondo liso
(`c.bg`) a cada lado, todo bajo el degradado de scrim. Ocurre en los 7 slides, claro y
oscuro. Es exactamente lo contrario del efecto full-bleed que busca el cambio.

**Regresión:** sí. En HEAD el primer hijo del `Stack` era un `AnimatedContainer` con
gradiente y **sin** `AnimatedSwitcher` intermedio, por lo que sí llenaba (el `Container`
sin hijo se expande a `BoxConstraints.expand()`).

**Fix (mínimo):**
```dart
child: Image.asset(
  slides[currentPage].backgroundImage,
  key: ValueKey(slides[currentPage].backgroundImage),
  fit: BoxFit.cover,
  width: double.infinity,   // ← fuerza a llenar bajo constraints loose
  height: double.infinity,
),
```
Alternativa equivalente: pasar `layoutBuilder: (cur, prev) => Stack(fit: StackFit.expand, alignment: Alignment.center, children: [...prev, if (cur != null) cur])`.

---

### H-2 · ALTA · El auto-avance rebobina 7→1 barriendo las 6 páginas: jank, parpadeo y CTA que cambia bajo el dedo
`mobile/lib/features/auth/presentation/screens/welcome_screen.dart:63-80`

```dart
final next = (_currentPage + 1) % _totalSlides;   // 6 → 0
_pageController.animateToPage(next, duration: 600ms, ...);
```

`PageView` dispara `onPageChanged` en **cada** `ScrollUpdateNotification` donde cambia la
página redondeada, incluidas las intermedias de una animación
(`/c/flutter/packages/flutter/lib/src/widgets/page_view.dart:947-957`):

```dart
if (notification.depth == 0 && widget.onPageChanged != null && notification is ScrollUpdateNotification) {
  final int currentPage = metrics.page!.round();
  if (currentPage != _lastReportedPage) { _lastReportedPage = currentPage; widget.onPageChanged!(currentPage); }
}
```

Al ir de la página 6 a la 0 en 600 ms se atraviesan 5, 4, 3, 2, 1, 0 → **6 llamadas a
`_onPageChanged`** en 600 ms, cada una con:
- `setState` → rebuild completo de la pantalla,
- nuevo `ValueKey` en el `Image.asset` de fondo → `AnimatedSwitcher` **decodifica una
  imagen de 6.0 MB RGBA distinta**, seis veces seguidas,
- reinicio del `AnimatedSwitcher` de 400 ms del texto,
- cambio de `accent` → estroboscopio en indicadores, borde, sombra y color del botón,
- `_startAutoAdvance()` cancela y recrea el `Timer.periodic`.

**Escenarios:**
1. El usuario deja la pantalla quieta ~28 s → el carrusel rebobina violentamente pasando
   por las 7 fotos; en gama baja (mercado objetivo del proyecto) esto son frames perdidos
   y un pico de memoria/GPU.
2. **Peor, funcional:** el usuario llega al slide 7, lee "Explorar Servicios" y lleva el
   dedo al botón. A los 4 s el carrusel salta a slide 1, `isLastPage` pasa a `false` y el
   botón se convierte en "Siguiente". El tap ejecuta `pageController.nextPage()` en vez de
   `AuthProvider.browseAsGuest()` → el usuario no entra a la app y queda en el slide 2.

**Regresión:** sí en magnitud. En HEAD eran 3 slides sin imágenes (2 páginas intermedias,
cero decodificaciones); ahora son 6 páginas intermedias y 6 decodificaciones de 6 MB.

**Fix:** parar el auto-avance en el último slide en vez de dar la vuelta.
```dart
_autoAdvanceTimer = Timer.periodic(const Duration(seconds: 4), (t) {
  if (!mounted) return;
  if (_currentPage >= _totalSlides - 1) { t.cancel(); return; }   // no rebobinar
  _pageController.nextPage(duration: const Duration(milliseconds: 600), curve: Curves.easeInOut);
});
```

---

### H-3 · ALTA · El CTA principal usa `Colors.white` / `Colors.black87` hardcodeados sobre relleno sólido de acento → falla AA en 6 de 7 slides
`mobile/lib/features/auth/presentation/widgets/welcome/welcome_action_buttons.dart:47`

```dart
foregroundColor: isLastPage ? Colors.black87 : Colors.white,
```

Viola la regla de `/ui-tema`: *glifo sobre fill SÓLIDO de accent ⇒ `AppColors.onSolid(accent)`*.
`AppColors.onSolid` (app_colors.dart:81-82) decide por luminancia con umbral 0.22:
acentos claros → `amberDeep` (#2A2418), solo `primary` admite blanco.

Contraste real del texto del botón (15 px bold ⇒ umbral AA = **4.5:1**, no es "texto grande"):

| Slide | Accent | Luminancia | Color aplicado | Contraste | AA | `onSolid` correcto |
|---|---|---|---|---|---|---|
| 1 | `primary` #4B6BE5 | 0.177 | white | 4.63 | ✅ | white |
| 2 | `amber` #C4A35A | 0.387 | white | **2.40** | ❌ | amberDeep |
| 3 | `oficioAccent` #D0886A | 0.321 | white | **2.83** | ❌ | amberDeep |
| 4 | `profesionalAccent` #8B7EC8 | 0.246 | white | **3.55** | ❌ | amberDeep |
| 5 | `negocioAccent` #5A9E9F | 0.291 | white | **3.08** | ❌ | amberDeep |
| 6 | `amber` #C4A35A | 0.387 | white | **2.40** | ❌ | amberDeep |
| 7 | `primary` #4B6BE5 | 0.177 | black87 | **3.98** | ❌ | white |

**Escenario:** el usuario avanza al slide 2 (o 3/4/5/6) → el texto "Siguiente" sobre el
botón dorado/terracota/teal es apenas legible, especialmente al sol o con visión reducida.
En el slide 7, "Explorar Servicios" en negro sobre azul #4B6BE5 (3.98:1) es el CTA de
conversión de todo el onboarding.

**Regresión:** sí en el slide final. En HEAD el último slide usaba `AppColors.amber`
(lum 0.387), y `black87` sobre ámbar daba ≈8.7:1 (correcto). El cambio movió el acento
del último slide a `primary` sin tocar el `black87` hardcodeado → pasó de 8.7:1 a 3.98:1.

**Fix:**
```dart
foregroundColor: AppColors.onSolid(accentColor),
```
(elimina el ternario y cubre los 7 casos automáticamente).

---

### H-4 · MEDIA · Overflow de layout en pantallas chicas: el visual del slide no cabe en el hueco del `Expanded`
`mobile/lib/features/auth/presentation/widgets/welcome/slide_testimonials.dart:37-58`
(y `slide_provider_card.dart:38-60` en slides 3-5)

La `Column` raíz (welcome_screen.dart:114-180) tiene **un solo `Expanded(flex: 58)`** y
cinco bloques de alto intrínseco. El `Expanded` recibe `disponible − fijos`; el `Padding`
del carrusel pasa constraints **tight** al `PageView`, y cada página pasa tight al visual,
así que la `Column` interna se desborda si su contenido natural excede ese alto.

Presupuesto en un 360×640 dp con barra de estado 24 + navegación 48 (SafeArea ⇒ 568 dp):

```
TopBar                        ≈ 60
SlideText (subtítulo 3 líneas)≈ 116
SizedBox 16 + Indicadores 8 + SizedBox 12  = 36
WelcomeActionButtons          ≈ 110
SizedBox 8                    =   8
                              ────────
fijos                         ≈ 330  →  Expanded ≈ 238  →  interior del carrusel ≈ 230
```

Alto natural de los visuales:
- `SlideTestimonials`: 3 filas × ≈68.6 + 2 × 10 + padding 36 ≈ **262 dp** → desborda ~32 dp.
- `SlideProviderCard` slide 4 (con `miniTags` + 3 chips que envuelven a 2 filas) ≈ **244 dp** → borde del límite.

En 320 dp de ancho (subtítulo a 4 líneas, chips que envuelven más) o con el escalado de
texto en su tope permitido (1.25×, welcome_screen.dart:105) los fijos suben a ~350-380 dp
y el desborde llega a **~70-85 dp**.

**Escenario:** un usuario con un Android de 360×640 dp y navegación de 3 botones, o con el
tamaño de fuente del sistema en "Grande", llega al slide 6 (testimonios) o al 4
(profesional) → en debug aparece la franja "RenderFlex overflowed by N pixels"; en release
el último testimonio / los chips de servicios quedan cortados.

**Regresión:** sí. En HEAD había 3 slides con visuales más bajos y la pantalla cabía.

**Fix:** envolver el visual de cada página en algo que ceda alto, p. ej. en
`welcome_carousel.dart`:
```dart
itemBuilder: (_, i) => FittedBox(fit: BoxFit.scaleDown, child: SizedBox(height: 280, child: slides[i].visual)),
```
o reducir contenido (2 testimonios en vez de 3, `maxLines: 1` en los chips).

---

### H-5 · MEDIA · Texto de 9.5 px con `c.textMuted` sobre tarjeta blanca → 2.98:1 y el usuario no puede agrandarlo
`mobile/lib/features/auth/presentation/widgets/welcome/slide_types_grid.dart:118`

```dart
style: TextStyle(color: c.textMuted, fontSize: 9.5, height: 1.25),
```

En tema **claro** `c.textMuted` = #9B958A (lum 0.303) sobre `c.bgCard` = #FFFFFF →
**2.98:1**, por debajo del 4.5:1 de AA (y empeora porque la tarjeta es
`c.bgCard.withValues(alpha: 0.85)`, o sea la foto de fondo se traspasa un 15 %).
En oscuro (#9A8E7C sobre #1A160F) da 5.58:1 y sí pasa.

Agravante: `MediaQuery.withClampedTextScaling(maxScaleFactor: 1.25)`
(welcome_screen.dart:105) **capa** el escalado de texto del sistema, así que un usuario con
la fuente en 2.0× por baja visión ve estos textos a 11.9 px como máximo y no puede
agrandarlos más.

**Escenario:** usuario con tema claro (o "sistema" de día) en el slide 2 → los subtítulos
"Gasfiteros, electricistas, carpinteros…", "Abogados, doctores, ingenieros…" y
"Restaurantes, ferreterías, boutiques…" son gris claro sobre blanco y prácticamente no se
leen; subir la fuente del sistema no los agranda.

**Fix:** `color: c.textSecondary` (#5C574F → 7.4:1 sobre blanco) y `fontSize: 11`.

---

### H-6 · MEDIA · 8.0 MiB de `.webp` **sin pérdida** (VP8L), sin `cacheWidth`/`cacheHeight`; 42 MB de caché de imagen tras una vuelta
`mobile/assets/images/onboarding/*.webp` (7 archivos) · `welcome_carousel.dart:48-52`

Los 7 archivos son **VP8L (lossless)**, 941 × 1672 cada uno:

```
slide-1-presentación.webp        995 KB
slide-2-proveedores.webp       1 228 KB
slide-3-tarjeta-oficio.webp    1 551 KB
slide-4-tarjeta-profesional    1 221 KB
slide-5-tarjeta-negocio.webp   1 336 KB
slide-6-comentarios.webp         936 KB
slide-7-ofi.webp               1 110 KB
                            ───────────
                            8 380 258 B = 7.99 MiB
```

- **Tamaño de descarga:** +8 MiB al `.aab`. Para fotografía/ilustración, webp con pérdida
  a q80 baja a ~120-180 KB por archivo (≈1 MiB en total, ~8× menos). El mercado objetivo
  declarado en `CONTEXTO_PROYECTO.md` §1 es ciudades intermedias de Perú con gama baja.
- **Memoria:** 941 × 1672 × 4 B = **6.0 MB RGBA decodificados por imagen**. `Image.asset`
  no pasa `cacheWidth`/`cacheHeight`, así que se decodifica a resolución completa aunque
  se muestre en una caja de ~320 × 280 dp. Tras un ciclo completo del auto-avance (H-2)
  las 7 quedan residentes: **42 MB** en `PaintingBinding.imageCache` (el tope por defecto
  es 100 MiB, así que no se expulsan).
- **Primer frame:** no hay `precacheImage`, y el `AnimatedSwitcher` arranca sin hijo
  anterior → al abrir `/welcome` el carrusel se ve vacío (solo `c.bg` + borde) hasta que
  la primera imagen de 1 MB decodifica y hace fade-in de 450 ms.

**Escenario:** usuario de gama baja instala la app (descarga 8 MB extra), abre welcome, ve
la tarjeta vacía ~0.3 s, y tras 30 s la app tiene 42 MB extra de bitmaps residentes.

**Fix:** re-encodear a webp con pérdida (`cwebp -q 80`) y añadir
`cacheHeight: (280 * MediaQuery.devicePixelRatioOf(context)).round()`; opcionalmente
`precacheImage` del slide 1 en `didChangeDependencies`.

---

### H-7 · MEDIA · El fondo no sigue el arrastre: durante el swipe se ve el visual del slide nuevo sobre la foto del slide anterior
`mobile/lib/features/auth/presentation/widgets/welcome/welcome_carousel.dart:48-53` vs `:76-81`

La imagen se elige con `slides[currentPage].backgroundImage` — y `currentPage` solo se
actualiza cuando `onPageChanged` reporta la página **redondeada**. En cambio el `PageView`
mueve el contenido de forma continua con el dedo.

**Escenario:** el usuario arrastra despacio del slide 3 (Oficio, foto de gasfitero) al
slide 4 → la tarjeta de "Dra. María Fernández / Abogada" entra deslizándose sobre la foto
del gasfitero; a mitad de recorrido el fondo salta de golpe (crossfade de 450 ms) cuando
`page.round()` cambia. Además el `accent` del borde, la sombra y el botón cambian en ese
mismo instante, no progresivamente.

**Fix:** mover la imagen dentro del `itemBuilder` del `PageView` (una imagen por página,
que se desplace con su slide) en vez de tenerla como capa fija bajo el `PageView`. Eso
además elimina el `AnimatedSwitcher` y de paso H-1.

---

### H-8 · BAJA · `Image.asset` sin `errorBuilder` + nombre de asset con carácter no ASCII
`welcome_screen.dart:195` · `welcome_carousel.dart:48-52`

```dart
backgroundImage: 'assets/images/onboarding/slide-1-presentación.webp',
```

Se verificó que hoy **funciona**: el literal Dart lleva `ó` en UTF-8 NFC (`\303\263`,
comprobado con `od -c`), igual que el nombre en disco, y ambos lados del pipeline
percent-codifican de la misma forma (`flutter_tools` con `path.toUri()` →
`entryUri.path` = `…slide-1-presentaci%C3%B3n.webp`; runtime con
`Uri(path: Uri.encodeFull(key)).path`, `services/asset_bundle.dart:327`).

El riesgo concreto es de **normalización Unicode**: si el archivo pasa por un sistema o
paso de empaquetado que normaliza a NFD (`o` + U+0301) —checkout en macOS, un zip/unzip
intermedio, un CI distinto— el nombre en disco deja de coincidir byte a byte con el
literal NFC y `Image.asset` lanza `Unable to load asset`. Como no hay `errorBuilder`, el
resultado es el carrusel con el fondo en blanco y una excepción en consola, sin fallback.
Es el único asset no ASCII del repo (el resto en `pubspec.yaml` son ASCII puros).

**Fix:** renombrar a `slide-1-presentacion.webp` y añadir
`errorBuilder: (_, __, ___) => ColoredBox(color: c.bgCard)` en el `Image.asset`.

---

### H-9 · BAJA · `Colors.white` hardcodeado sobre relleno sólido de `AppColors.primary`
`mobile/lib/features/auth/presentation/widgets/welcome/slide_ofi_assistant.dart:51` y `:144`

```dart
child: const Icon(Icons.smart_toy_rounded, color: Colors.white, size: 16),   // sobre círculo primary
...
color: fromUser ? Colors.white : c.textPrimary,                              // sobre burbuja primary
```

Hoy el valor **coincide** con `AppColors.onSolid(AppColors.primary)` (luminancia 0.177 <
0.22 ⇒ blanco), así que no hay fallo visible ahora. Pero viola la regla de `/ui-tema` y es
una bomba de relojería: si alguien aclara `primary` por encima de 0.22 de luminancia (o
si estos widgets se reusan con otro acento), el glifo blanco queda ilegible sin que nada
lo detecte. El resto del archivo sí usa `AppColors.tintOn(...)` correctamente.

**Fix:** `AppColors.onSolid(AppColors.primary)` en ambos puntos.

---

## Lo que está bien (no tocar)

- **Ciclo de vida impecable:** `dispose()` cancela `_autoAdvanceTimer`, libera
  `_entryController` y `_pageController`; el callback del timer tiene guarda `mounted`. No
  hay `setState` tras dispose ni controllers huérfanos.
- **`_buildSlides()` es `const`:** aunque se llama en cada `build`, la lista se
  canonicaliza en compile-time → coste cero. Mejora respecto a HEAD, que construía
  `SlideData` nuevos por rebuild (dependía de `c`).
- **`StaggerFade`:** los `Interval(start, end)` calculados nunca violan `end >= begin`
  (start se clampea a 0.7, end = clamp(start+0.45)), así que no hay assert posible.
- **`PageView.builder`** lazy y visuales `const` → no se instancian los 7 slides de golpe.
- **`AnimatedOpacity` con opacidad 0 + `onPressed: null`** en "Omitir" del último slide:
  además de deshabilitarlo, `RenderAnimatedOpacity` lo excluye de semántica cuando
  `opacity == 0`, así que TalkBack tampoco lo anuncia. Correcto.
- **Uso de tema en los slides nuevos:** `slide_types_grid`, `slide_testimonials`,
  `slide_welcome_intro` y `slide_provider_card` usan `context.colors` + `tintOn`/`onSolid`
  de forma consistente (salvo H-5 y H-9).
