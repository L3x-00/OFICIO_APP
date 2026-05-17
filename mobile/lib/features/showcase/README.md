# Feature Discovery (Showcase / Coach Marks)

Tutorial de primera vez para ambos roles de la app: **cliente** y
**proveedor (admin)**. Basado en el paquete
[`showcaseview`](https://pub.dev/packages/showcaseview).

## Estructura

| Archivo | Contiene |
|---|---|
| `showcase_data.dart` | Todos los `GlobalKey` + decks de pasos (registered/guest/admin builders). |
| `showcase_manager.dart` | Persistencia en `SharedPreferences` (per-user y per-tab). |
| `showcase_overlay.dart` | Widgets de wiring: `ShowcaseTarget`, `ShowcaseRoot`, `HomeShowcaseHost`, `AdminShowcaseWrapper`, `AdminTabShowcase`. |

## Aclaración importante — quién tiene las GlobalKeys

Los GlobalKeys del showcase **NO viven directamente en los widgets
target**. Se asignan vía `ShowcaseTarget(step: ..., child: <widget>)`
en el call-site (la pantalla que orquesta el árbol).

Por ejemplo, `SubastaBanner` no tiene una `GlobalKey` propia; la
recibe cuando `providers_screen.dart` lo envuelve con
`ShowcaseTarget(step: kShowcaseSubastaBanner..., child: SubastaBanner())`.

Esto es intencional:
- Los widgets de UI puros siguen siendo reutilizables sin
  conocimiento del sistema de tutorial.
- Si el widget cambia (refactor, nuevo viewMode), basta con que el
  call-site siga envolviendo igual — el widget no sabe nada.
- El paquete `showcaseview` ya monta `Showcase` como un wrapper que
  mide el `RenderBox` del child; no necesita que el child tenga la
  key propia.

Excepción: `home_header.dart` recibe el `planBadgeStep` como prop
desde `panel_home_tab` y lo aplica internamente — porque la
estructura del header anida el `SubscriptionBanner` con condicionales,
sería incómodo wrapearlo desde afuera.

## Dos flujos independientes

### Cliente — `ProvidersScreen` (vía `AppShell`)

```
AppShell  ──┐
            ├─ ShowcaseRoot
            │   └─ ShowCaseWidget (cliente)
            │       └─ Scaffold del shell + BottomNav (con keys)
            │           └─ Tab 0 = ProvidersScreen
            │               └─ HomeShowcaseHost (registra user activo)
            │                   └─ _AutoStart (dispara cuando monta)
```

- Decks: `kShowcaseStepsRegistered` (10 pasos) / `kShowcaseStepsGuest` (6 pasos).
- Disparo: primera vez que entra a la pantalla principal.
- Persistencia:
  - `has_seen_onboarding_{userId}` (registrado).
  - `has_seen_onboarding_guest` (invitado).

### Admin — `ProviderPanel` (abierto via `rootNavigator.push`)

```
ProviderPanel ──┐
                ├─ AdminShowcaseWrapper
                │   └─ ShowCaseWidget (admin, AISLADO del cliente)
                │       └─ Scaffold + Tabs
                │           ├─ AdminTabShowcase(tab: home)  ← dispara aquí
                │           ├─ AdminTabShowcase(tab: services)
                │           ├─ AdminTabShowcase(tab: stats)
                │           └─ (otros tabs sin tutorial)
```

- Decks: `buildAdminHomeSteps()` / `buildAdminServicesSteps()` /
  `buildAdminStatsSteps()` — dinámicos según runtime (plan, atLimit,
  hasChartData, hasBothProfiles).
- Gate: SOLO dispara si `verificationStatus == 'APROBADO'`
  (chequeado vía `dash.profile?.isVerified` en cada tab).
- Persistencia: `has_seen_admin_{tab}_{userId}_{providerType}`
  (providerType lowercase).
- Tab change durante tour: `dismissActive` cierra el spotlight sin
  marcar como visto (C-9). El user vuelve a verlo en la próxima
  sesión.

## Comportamientos clave (auditoría)

- **Lista de providers vacía** (C-1): el deck filtra keys cuyo
  `currentContext == null` antes de `startShowCase`. Si la primera
  ServiceCard nunca aparece, ese paso simplemente se omite y se
  reintenta en la próxima build cuando carguen los providers.

- **Dashboard cargando async** (C-4): `AdminTabShowcase` usa
  `didUpdateWidget` para reaccionar a cambio de `isApproved`/`steps`
  — si la primera build llega con `dash.profile=null`, el tour
  dispara cuando termina de cargar.

- **Identidad cliente cambia mid-sesión** (C-8): si user invitado
  completa el tour guest y luego se registra sin cerrar la app,
  `_AutoStart.didUpdateWidget` resetea `_started` y dispara el tour
  registered.

- **Equipos lentos** (C-6): en vez de delay fijo de 500ms, el deck
  hace polling cada 80ms hasta que TODAS las keys estén montadas
  (max 1.5s para cliente, 1s para admin).

- **Tap en barrier** (C-7): bloqueado con `disableBarrierInteraction: true`.
  Avance/cierre solo vía los botones del tooltip.

- **Tab change durante tour admin** (C-9): `dismissActive` cancela
  el spotlight pero NO marca como visto. En la próxima sesión, el
  user verá el tour normalmente.

- **Plan GRATIS para stats** (C-14): no dispara — `_StatsUpsellScreen`
  se renderiza antes que `AdminTabShowcase`. Si el user upgrade a
  ESTANDAR/PREMIUM mientras la app está abierta, el tour dispara la
  primera vez que el tab stats renderiza con plan pago.

## QA helpers

```dart
// Resetear flag de un user para ver el tour de nuevo
await ShowcaseManager.reset(userId: 123, isGuest: false);

// Resetear flag de un tab del panel admin
await ShowcaseManager.resetAdminTab(
  tab: AdminTab.home,
  userId: 123,
  providerType: 'OFICIO',
);
```
