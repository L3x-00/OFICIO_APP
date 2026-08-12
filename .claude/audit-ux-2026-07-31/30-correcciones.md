# Correcciones aplicadas

## Dimensión 1 — Carrusel (9 hallazgos: 4 confirmados, 5 refutados)

| # | Hallazgo | Veredicto | Acción |
|---|---|---|---|
| H-1 | Imagen de fondo no llena el carrusel (`AnimatedSwitcher` pasa constraints loose ⇒ franja centrada de ~158-266 dp) | **CONFIRMADO alta** (regresión) | ✅ `width/height: double.infinity` en `Image.asset` — `welcome_carousel.dart` |
| H-3 | CTA con `Colors.white`/`Colors.black87` fijos sobre fill de accent: falla AA 4.5:1 en 6 de 7 slides; el CTA final pasó de 8.7:1 a 3.98:1 | **CONFIRMADO alta** (regresión) | ✅ `foregroundColor: AppColors.onSolid(accentColor)` — `welcome_action_buttons.dart` |
| H-2 | Auto-avance rebobina 7→1 barriendo 6 páginas en 600 ms | CONFIRMADO, severidad rebajada a **baja** (el escéptico refutó las re-decodificaciones —ImageCache 100 MiB, hit por valor— y el "voltea el CTA", que ya pasaba en HEAD con 3 slides) | ✅ el timer se cancela en el último slide en vez de dar la vuelta — `welcome_screen.dart`. Corrige de paso el volteo de CTA preexistente |
| H-6 | 7 `.webp` **VP8L sin pérdida**, 941×1672, 7.99 MiB totales; 42 MB de bitmaps residentes tras una vuelta | **CONFIRMADO media** | ⚠️ NO aplicado — re-encodear arte del propietario no es una corrección de bug. Ver "Pendiente para el propietario" |
| H-5 | Texto 9.5 px `c.textMuted` sobre tarjeta blanca (2.98:1) | REFUTADO baja | — el "agravante" del clamp de texto era falso (`main.dart:156` ya clampea toda la app); no es defecto de este cambio |
| H-4 | Overflow en 360×640 | REFUTADO baja | presupuesto mal medido, "regresión" falsa |
| H-7 | El fondo no sigue el arrastre del dedo | REFUTADO ninguna | el mecanismo existe, la consecuencia descrita no |
| H-9 | `Colors.white` sobre `primary` en `slide_ofi_assistant` | REFUTADO ninguna | coincide con `onSolid(primary)`; sin fallo alcanzable |
| H-8 | Asset con tilde (`slide-1-presentación.webp`) | REFUTADO ninguna | prueba empírica: `build/unit_test_assets/` lo empaquetó bien; NFC coincide en ambos lados del pipeline |

## Dimensiones 2-5 — auditadas inline (el límite de subagentes se agotó, resetea 8pm)

Los 4 agentes restantes murieron por límite de sesión en dos intentos. Auditadas a mano
con los mismos criterios. Hallazgos:

| Hallazgo | Veredicto | Acción |
|---|---|---|
| **Bottom nav: `height: 68` fijo con `SafeArea` interno** — el SDK hace lo contrario (`BottomNavigationBar` usa `minHeight: kBottomNavigationBarHeight + viewPadding.bottom`, `bottom_navigation_bar.dart:1107/1122/1133`, o sea SUMA el inset). Con alto fijo el `SafeArea` se come el alto y al tab central le quedan 68−inset dp para 69 dp de contenido: desborda ~25 dp con navegación por gestos y ~49 dp con 3 botones | **CONFIRMADO alta** | ✅ alto por contenido con `ConstrainedBox(minHeight: 68)` dentro del `SafeArea` — `app_shell.dart` |
| **`greeting_header.dart`: `Timer.periodic(2s)` corre también con sesión iniciada**, donde el mensaje es fijo ⇒ `setState` + rebuild cada 2 s sin cambiar un píxel | **CONFIRMADO media** | ✅ el timer se crea solo si `isGuest` y se cancela al iniciar sesión |
| `greeting_header.dart` sin salto de línea final | CONFIRMADO baja | ✅ `dart format` |
| Índices de rama del nav: ¿off-by-one? | REFUTADO | usa `AppRoutes.tabExplorar/tabFavoritos/tabPerfil` (constantes preexistentes en `app_router.dart`, sin tocar, que ya contemplan `kOfertasEnabled`). No hay índice hardcodeado |
| Alertas inalcanzable tras salir del bottom nav | REFUTADO | la campana del AppBar hace `goBranch(AppRoutes.tabAlertas)`; Ofertas no tiene rama (flag apagado) |
| Showcase roto: `kShowcaseAlertsTab` sin widget montado / `firstWhere` sin match para invitados | REFUTADO | la key se montó en la campana del AppBar; `firstWhere` consulta el deck *registered* (que sí lo contiene) y `isLastShowcaseStep` recibe `isGuest` — el deck invitado no lo incluye ⇒ `false`, sin excepción |
| Reglas de `/ui-tema` en los archivos nuevos | REFUTADO | `grep` de `AppColors.bgDark\|bgCard\|bgInput\|textPrimary\|textSecondary\|textMuted` en `lib/` ⇒ **0 resultados**. Los `Colors.white` que quedan están en archivos preexistentes, fuera de este diff |
| Refactor del formulario de onboarding | REFUTADO | ya auditado línea por línea por un agente independiente en la tanda anterior: camino de submit/pago byte-idéntico, cero controllers huérfanos, guarda `mounted` conservada |

## Regresión dejada por escrito

`test/widgets/welcome_carousel_background_test.dart` — falla con 0.0 dp de ancho si se
quitan las dos líneas del fix H-1 (verificado quitándolas y volviéndolas a poner).

## Verificación final

- `flutter analyze lib test` → **14 infos de estilo preexistentes**, 0 warnings, 0 errores.
- `flutter test` → **238/238** (eran 231 antes de la tanda; +7 tests nuevos).
- `dart format` aplicado a todo lo tocado.

### Pendiente para el propietario (no es bug, es decisión de producto)

Los 7 `.webp` están en **modo sin pérdida** (VP8L): 7.99 MiB que se suman al `.aab`,
con un mercado objetivo de gama baja. Con pérdida a q80 bajan a ~1 MiB en total:

```bash
cd mobile/assets/images/onboarding
for f in *.webp; do cwebp -q 80 -resize 720 0 "$f" -o "${f%.webp}-q80.webp"; done
```

No lo apliqué porque re-encodear las ilustraciones es una transformación con
pérdida sobre material del propietario, no la corrección de un defecto.
