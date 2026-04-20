# Bitácora de Errores de Arquitectura

Registro de errores estructurales encontrados en auditoría del 2026-04-17.
Cada error incluye: qué pasó, por qué ocurrió y la regla de oro para no repetirlo.

---

## Error 1 — Validación rota en campos opcionales con Regex (DTO RUC/DNI)

**Archivo**: `backend/src/auth/dto/register-provider.dto.ts`

**Qué pasó**:
El campo `ruc` tenía `@IsOptional()` + `@Matches(/^\d{11}$/)`. Flutter envía `""` (string vacío)
cuando el usuario deja el campo en blanco, no `null`. El decorador `@IsOptional()` de
`class-validator` solo omite la validación si el valor es `null` o `undefined`, **no si es `""`**.
Resultado: cualquier registro de NEGOCIO sin RUC lanzaba un `ValidationException` 400 silencioso.

**Raíz del error**:
Asumir que Flutter y NestJS comparten el mismo concepto de "campo vacío".
Flutter serializa formularios vacíos como `""`, no como campo ausente.

**Parche aplicado**:
```typescript
// Decorador NullIfEmpty transforma "" → null antes de las validaciones
const NullIfEmpty = () =>
  Transform(({ value }) => (value === '' || value === undefined ? null : value));

@NullIfEmpty()
@IsOptional()
@ValidateIf(o => o.ruc !== null && o.ruc !== undefined)
@Matches(/^\d{11}$/, { message: 'El RUC debe tener exactamente 11 dígitos' })
ruc?: string | null;
```

**Regla de oro**:
> Todo campo opcional que venga de Flutter debe tener `@Transform` que convierta `""` a `null`
> **antes** de cualquier `@IsOptional()` o `@Matches`. Nunca confiar en que el cliente envíe `null`.

---

## Error 2 — Notificaciones de plan sin aislamiento por tipo de perfil

**Archivos**: `backend/src/events/events.gateway.ts`, `backend/src/admin/admin.service.ts`,
`backend/src/provider-profile/provider-profile.service.ts`,
`mobile/lib/features/auth/presentation/providers/auth_provider.dart`

**Qué pasó**:
Un usuario con perfil OFICIO y perfil NEGOCIO recibe una notificación de aprobación/rechazo
de plan. La notificación solo incluía `targetUserId`, sin indicar a qué perfil pertenecía.
Si el usuario tenía activo el perfil OFICIO en el panel, una notificación del perfil NEGOCIO
podía disparar `_syncProviderStatus()` y mezclar el estado visible en la UI.

**Raíz del error**:
El modelo de notificaciones fue diseñado cuando un usuario solo podía tener un perfil.
Al agregar soporte multi-perfil (OFICIO + NEGOCIO) no se actualizó el payload de notificaciones.

**Parche aplicado**:
- Añadido `targetProfileType String?` al modelo `AdminNotification` en Prisma.
- Añadido `targetProfileType?: string` al `NotificationPayload` del WebSocket.
- Flutter filtra en `_handleRemoteNotification`: si `targetProfileType != _activeProfileType`, ignora la notificación.

**Regla de oro**:
> Cada notificación que afecte a un perfil específico (no al usuario) debe incluir
> `targetProfileType`. Nunca usar solo `targetUserId` cuando el usuario puede tener
> múltiples perfiles del mismo dominio.

---

## Error 3 — Sin protección contra solicitudes de plan duplicadas

**Archivo**: `backend/src/provider-profile/provider-profile.service.ts`

**Qué pasó**:
`requestPlanUpgrade()` cancelaba solicitudes PENDIENTES previas y creaba una nueva cada vez.
Un usuario podía tocar el botón múltiples veces seguidas (tap rápido, retry de red, etc.)
y generar N registros en `plan_requests` en el mismo segundo, saturando la tabla y
creando inconsistencia en el panel del administrador.

**Raíz del error**:
La lógica de "cancelar primero, crear después" tiene una race condition si dos requests
llegan concurrentes. Además, el frontend no tenía debounce y el usuario podía generar
múltiples taps legítimos.

**Parche aplicado**:
```typescript
// Antes de crear, verificar existencia
const existingPending = await this.prisma.planRequest.findFirst({
  where: { providerId: provider.id, status: 'PENDIENTE' },
});
if (existingPending) {
  throw new ConflictException('Ya tienes una solicitud en proceso.');
}
```

**Regla de oro**:
> Para cualquier recurso "singleton por estado" (solo puede existir una solicitud PENDIENTE
> por proveedor), siempre verificar existencia y lanzar `ConflictException` antes de crear.
> No usar el patrón "cancelo-y-creo" porque no es atómico bajo concurrencia.

---

## Error 4 — Enum `ProviderType` con valores fantasma (PROFESSIONAL, BUSINESS)

**Archivo**: `backend/prisma/schema.prisma`

**Qué pasó**:
El enum `ProviderType` contenía 4 valores: `OFICIO`, `NEGOCIO`, `PROFESSIONAL`, `BUSINESS`.
Los valores `PROFESSIONAL`/`BUSINESS` eran alias del viejo naming que nunca se usaron en la BD
(la columna `type` siempre almacenó `OFICIO`/`NEGOCIO`). Sin embargo, existía un campo
`providerType ProviderType @default(PROFESSIONAL)` que sí los referenciaba, causando:
1. Confusión al leer el schema — parecía que había 4 tipos de proveedor válidos.
2. El campo `providerType` en la BD era redundante con `type` pero con diferente semántica.
3. Al regenerar el cliente Prisma, los tipos TypeScript incluían los 4 valores aumentando
   superficie de error.

**Raíz del error**:
Refactor a medias: se renombraron los tipos en el código pero no se eliminaron los valores
obsoletos del enum ni el campo de BD que los usaba.

**Parche aplicado**:
- Eliminados `PROFESSIONAL` y `BUSINESS` del enum `ProviderType`.
- Eliminado el campo `providerType` del modelo `Provider`.
- `providers.service.ts` mantiene compatibilidad legacy con alias de string para no romper
  versiones viejas de Flutter: `if (type === 'OFICIO' || type === 'PROFESSIONAL')`.
- Ejecutado `db push --accept-data-loss` + `prisma generate` para sincronizar BD y cliente.

**Regla de oro**:
> Un enum de Prisma solo debe contener valores que se almacenan en la BD.
> Si un valor existe solo como alias en el código, mantenlo como constante TypeScript,
> no como valor de enum. Ejecutar `prisma db push` después de cada cambio de schema.

---
## ERROR 5
Error de Estancamiento en Flujos de Onboarding/Auth
Problema: Al completar el registro, validación OTP o selección de rol, la aplicación se quedaba "estancada" en la pantalla actual (OnboardingScreen o OtpScreen) a pesar de que el estado del Provider ya había cambiado.

Causa: Confiar exclusivamente en el notifyListeners() del Provider sin gestionar manualmente el stack de navegación de Flutter. El switch del main.dart no siempre tiene prioridad sobre las rutas que están "encima" en el Navigator.

Regla de Oro: > "Al finalizar un proceso de autenticación o configuración inicial, SIEMPRE se debe ejecutar un comando de navegación explícito después de llamar al método del Provider.

Si la lógica de la pantalla principal reside en un switch en main.dart, usa Navigator.of(context).pop() para limpiar la pantalla actual y permitir que el AppRoot se reconstruya.

Si se requiere una limpieza total del historial, usa Navigator.of(context).pushAndRemoveUntil hacia la pantalla de destino para evitar que el usuario regrese a pantallas de login/onboarding con el botón atrás."

Evitar: Dejar la función de navegación vacía esperando que el Provider haga todo el trabajo de cambio de pantalla por sí solo.
---

## Error 6 — pubspec.yaml con config de flutter_launcher_icons dentro de `flutter:`

**Archivo**: `mobile/pubspec.yaml`

**Qué pasó**:
Se añadió la configuración de `flutter_launcher_icons` como bloque hijo de `flutter:` en lugar de
como sección raíz independiente. Causó el error: `Unexpected child "flutter_launcher_icons" found under "flutter"`.
`flutter pub get` falló completamente, bloqueando la instalación de nuevas dependencias.

**Regla de oro**:
> `flutter_launcher_icons:` es una sección raíz del YAML, **nunca** va dentro de `flutter:`.
> También removerlo de `dev_dependencies:` si no se va a usar activamente.
> Cualquier configuración de herramientas de build va al nivel raíz, no anidada bajo `flutter:`.

---

## Error 7 — Permisos no declarados crashean en runtime (Android/iOS)

**Archivos**: `android/AndroidManifest.xml`, `ios/Runner/Info.plist`

**Qué pasó**:
`image_picker` y `geolocator` funcionan internamente, pero en Android ≥13 y en iOS,
el sistema operativo requiere declaraciones explícitas. Sin ellas: crash silencioso o
denegación automática de permisos sin dialog al usuario.

**Permisos requeridos por feature**:
- Cámara: `CAMERA` (Android) + `NSCameraUsageDescription` (iOS)
- Galería: `READ_MEDIA_IMAGES` (Android ≥13), `READ_EXTERNAL_STORAGE` maxSdk=32, `NSPhotoLibraryUsageDescription` (iOS)
- GPS: `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION` (Android) + `NSLocationWhenInUseUsageDescription` (iOS)

**Regla de oro**:
> Todo feature que acceda a hardware (cámara, GPS, almacenamiento) necesita:
> 1. Declaración en `AndroidManifest.xml` Y `Info.plist`
> 2. Solicitud explícita en runtime via `permission_handler` o `geolocator`
> 3. Manejo del estado "denegado permanentemente" → guiar al usuario a Ajustes

---

---

## Error 8 — `use_build_context_synchronously` en ternario tras `await`

**Archivo**: `mobile/lib/features/providers_list/presentation/screens/provider_detail_sheet.dart`

**Qué pasó**:
El linter de Dart reporta `use_build_context_synchronously` incluso cuando hay un guard `if (!context.mounted) return;` antes de un ternario que pasa `context` a funciones async. El flow-analysis del linter no reconoce el guard como dominante en ambas ramas del ternario.

**Regla de oro**:
> Ante un ternario `? await f1(context) : await f2(context)`, el guard
> `if (!context.mounted) return;` no silencia el lint. Añadir
> `// ignore: use_build_context_synchronously` en la línea del ternario,
> o refactorizar a `if/else` con un guard antes de cada rama.

---

---

## Error 9 — Ordenamiento por campo de relación en Prisma (plan priority)

**Archivo**: `backend/src/providers/providers.service.ts`

**Qué pasó**:
Intentar `orderBy: { subscription: { plan: 'asc' } }` en Prisma falla porque no es una
relación 1:1 trivialmente ordenable por un campo de enum (el orden léxico de PREMIUM/ESTANDAR/BASICO
no corresponde al orden de prioridad de negocio). Además Prisma no permite mezclar un sort primario
de relación con uno secundario de campo propio en el mismo `orderBy`.

**Raíz del error**:
Confiar en que Prisma puede ordenar por campo de relación con semántica de negocio arbitraria.
El sort de enum sigue el orden de declaración en el schema, no el valor semántico del negocio.

**Solución aplicada**:
Campo denormalizado `planPriority Int @default(4)` en `Provider`.
Se actualiza solo en `admin.service.ts` (dos puntos: `approvePlanRequest` y `updateProviderSubscription`).
`findAll` usa `orderBy: [{ planPriority: 'asc' }, secondarySort]`.

**Regla de oro**:
> Para ordenar por una jerarquía de negocio derivada de una relación, desnormaliza un campo
> entero en la tabla principal. Actualízalo en todos los puntos donde cambia el estado fuente.
> Nunca confíes en el orden léxico de un enum para representar prioridad de negocio.

---

---

## Error 10 — Categorías mezcladas para OFICIO y NEGOCIO

**Archivos**: `backend/prisma/schema.prisma`, `backend/prisma/seed.ts`,
`backend/src/providers/providers.service.ts`, `mobile/.../onboarding_screen.dart`

**Qué pasó**:
OFICIO y NEGOCIO compartían el mismo árbol de categorías. Un negocio (restaurante, farmacia) aparecía junto a profesionales independientes (electricistas, gasfiteros) en el mismo picker. El UX era confuso y las categorías no correspondían a la realidad del mercado peruano.

**Raíz del error**:
La arquitectura de categorías fue diseñada cuando solo existía un tipo de proveedor. Al agregar NEGOCIO no se segregó el catálogo.

**Parche aplicado**:
- Campo `forType String?` en modelo `Category`: `'OFICIO'` | `'NEGOCIO'` | `null` (ambos).
- Seed rediseñado con 2 árboles independientes: 7 padres × ~35 subs para OFICIO (profesionales Perú), 7 padres × ~38 subs para NEGOCIO (establecimientos Perú).
- `GET /providers/categories?type=OFICIO|NEGOCIO` filtra por `forType`.
- Flutter `_loadCategories()` pasa `forType: widget.providerType`.
- Admin `create-provider-modal`: OFICIO = 2 dropdowns en cascada; NEGOCIO = accordion jerárquico visual.
- Admin `categories/page`: badge OFICIO/NEGOCIO + campo `forType` en formulario.

**Regla de oro**:
> Cuando dos tipos de entidad comparten una tabla de clasificación pero su catálogo es semánticamente distinto, añadir un campo discriminador (`forType`) desde el inicio. Nunca forzar un catálogo único para dominios diferentes.

---

## Error 11 — Fotos no vinculadas al perfil correcto en onboarding multi-perfil

**Archivo**: `mobile/lib/features/auth/presentation/screens/onboarding_screen.dart`

**Qué pasó**:
Tras registrar un perfil profesional (OFICIO) desde la pantalla standalone, las fotos
se subían al servidor pero no aparecían en el panel. `saveProviderImage(url)` se llamaba
sin el parámetro `type`, por lo que el backend ejecutaba `findProviderByUser(userId)`
sin discriminador y devolvía el **primer** perfil encontrado — que podía ser NEGOCIO si
el usuario tenía ambos. La imagen quedaba vinculada al perfil equivocado.

**Raíz del error**:
Se asumió que `saveProviderImage(url)` sin `type` siempre apunta al perfil recién creado.
No es cierto cuando el usuario tiene múltiples perfiles.

**Parche aplicado**:
```dart
await repo.saveProviderImage(url, type: widget.providerType);
```

**Regla de oro**:
> Toda llamada a `saveProviderImage`, `updateMyProfile`, `saveServices` o cualquier método
> del `DashboardRepository` que opere sobre "mi perfil" **debe** pasar `type: widget.providerType`
> cuando se ejecuta desde un contexto que conoce el tipo (onboarding, panel, settings).
> Sin `type`, el backend retorna el primer perfil del usuario, no el correcto.

---

## Error 12 — Favoritos persisten entre sesiones (no se limpian en logout)

**Archivos**: `mobile/lib/main.dart`, `mobile/lib/features/favorites/presentation/providers/favorites_provider.dart`

**Qué pasó**:
Al cerrar sesión, el corazón de favorito permanecía marcado en las tarjetas.
Al iniciar sesión con otra cuenta, los favoritos de la cuenta anterior seguían visibles.
Causa: `FavoritesProvider.clear()` existe pero nunca se llamaba.
`AuthProvider.logout()` limpia el estado de usuario pero no tiene acceso a `FavoritesProvider`
(no tiene `BuildContext`). `_MainNavigationState.initState()` solo llamaba
`favs.initialize(userId)` una vez en el primer build, no cuando cambiaba la cuenta.

**Raíz del error**:
El ciclo de vida de `FavoritesProvider` no estaba acoplado al ciclo de vida de auth.
Se asumió que `_MainNavigation` se reconstruye con un userId nuevo automáticamente —
pero el `IndexedStack` preserva el estado de los widgets hijos.

**Parche aplicado**:
En `_AppRootState._onAuthChanged()` (main.dart):
```dart
final favs = context.read<FavoritesProvider>();
if (auth.user != null) {
  favs.initialize(auth.user!.id);   // restaura favoritos al hacer login
} else {
  favs.clear();                      // limpia favoritos al hacer logout
}
```

**Regla de oro**:
> El ciclo de vida de cualquier provider que almacene datos **por usuario** (`FavoritesProvider`,
> notificaciones personales, carrito, etc.) debe estar acoplado a `_onAuthChanged()` en `_AppRootState`.
> Login → `initialize(userId)`. Logout → `clear()`. Nunca depender de `initState()` de un widget
> hijo para este propósito, porque ese widget puede no reconstruirse cuando cambia la cuenta.

---

## Error 13 — UI de "Quiero ser parte" no reacciona al cambio de estado de aprobación

**Archivo**: `mobile/lib/shared/widgets/join_us_modal.dart`

**Qué pasó**:
El modal `JoinUsModal` mostraba un `_PendingBanner` estático para perfiles en espera.
Cuando el administrador aprobaba un perfil en tiempo real (WebSocket `PROVIDER_APPROVED` →
`AuthProvider._syncProviderStatus()` → `notifyListeners()`), el `Consumer<AuthProvider>` reconstruía
correctamente, pero la lógica de condición solo chequeaba `oficioStatus == 'PENDIENTE'`.
Al cambiar a `'APROBADO'`, ni el banner ni una nueva acción se mostraban — el proveedor
recién aprobado no veía ningún botón de "Ir a mi panel" en el modal.

Adicionalmente, cuando ambos perfiles estaban aprobados, el modal mostraba texto estático
"Ya tienes perfil de Profesional y de Negocio registrados." sin opción de navegar.

**Raíz del error**:
Las condiciones del `Consumer` solo contemplaban `PENDIENTE` y "puede registrarse".
Los estados `APROBADO` y `RECHAZADO` no tenían rama de UI.

**Parche aplicado**:
- Añadidas condiciones `hasApprovedOficio` / `hasApprovedNegocio` que muestran `_ApprovedProfileBanner`
  con botón "Ir a mi panel [tipo]" que navega directamente a `ProviderPanel`.
- Cuando ambos aprobados: botón único "Ir a mi panel" que abre `_showPanelChoiceModal`.
- `_showPanelChoiceModal` replicado en `_JoinUsModalState` para independencia de contexto.

**Regla de oro**:
> En cualquier widget que use `Consumer<AuthProvider>` para mostrar estado de proveedor,
> deben existir ramas explícitas para TODOS los valores posibles: `canRegister`, `PENDIENTE`,
> `APROBADO`, `RECHAZADO`. Un estado no contemplado produce UI vacía invisible al usuario.

---

## Error 14 — Tipos de notificación `REVIEW_REPLY` y `PLAN_*` sin ícono/color en la bandeja

**Archivo**: `mobile/lib/features/notifications/domain/models/notification_model.dart`

**Qué pasó**:
`AppNotification.iconColor` y `AppNotification.icon` solo manejaban `PROVIDER_APPROVED`,
`PROVIDER_REJECTED`, `NEW_REVIEW`, `PASSWORD_CHANGED`, `NEW_PROVIDER`.
Los tipos `REVIEW_REPLY`, `PLAN_APROBADO`, `PLAN_RECHAZADO` caían en el caso `_` (genérico),
mostrando el ícono y color por defecto en lugar de uno semánticamente correcto.

**Regla de oro**:
> Cada nuevo tipo de notificación emitido por el backend debe tener entrada explícita
> en `AppNotification.icon` y `AppNotification.iconColor`. Al añadir un tipo en el backend,
> actualizar el modelo Dart en el mismo commit.

---

## Error 15 — Ubicación no capturada en registro → filtros de localización vacíos

**Archivos**: `onboarding_screen.dart`, `backend/prisma/schema.prisma`, `mobile/lib/features/auth/domain/models/user_model.dart`

**Qué pasó**:
Los registros de cliente, profesional y negocio no pedían departamento/provincia/distrito.
Al abrir la pantalla principal, `ProvidersProvider` filtraba sin ubicación y devolvía
todos los proveedores del país, haciendo irrelevante la búsqueda local.
La carga de ubicación desde `AuthProvider` no se propagaba a `ProvidersProvider` al init,
así que incluso usuarios con ubicación guardada veían resultados globales.

**Raíz del error**:
La ubicación se diseñó como campo opcional de perfil, no como requisito de registro.
`ProvidersProvider` no tenía mecanismo de pre-seed con la ubicación del usuario autenticado.

**Regla de oro**:
> Departamento, provincia y distrito son obligatorios en TODOS los formularios de registro
> (cliente, profesional, negocio). Al completar onboarding, llamar siempre a
> `ProvidersProvider.setUserLocation(...)` para que el filtro quede activo desde la primera carga.
> En `_AppRootState._onAuthChanged()`: si `auth.user?.hasLocation == true`, pre-seed
> `ProvidersProvider` con la ubicación guardada para que el usuario siempre vea resultados locales.

---

## Resumen de Reglas de Oro

| # | Área | Regla |
|---|------|-------|
| 1 | Validación | Flutter envía `""`, no `null`. Siempre `@Transform` antes de `@IsOptional` |
| 2 | Notificaciones | Con multi-perfil, toda notif de perfil necesita `targetProfileType` |
| 3 | Concurrencia | Recursos singleton-por-estado: verificar antes de crear, no cancelar-y-crear |
| 4 | Schema | Solo valores reales en enums Prisma. Alias de código = constantes TS, no enum values |
| 5 | Navegación | Siempre navegación explícita al terminar auth/onboarding, no solo `notifyListeners` |
| 6 | pubspec | `flutter_launcher_icons:` va a nivel raíz, nunca dentro de `flutter:` |
| 7 | Permisos | Hardware (cámara, GPS, galería) requiere manifest + runtime request + fallback a Ajustes |
| 8 | Async/Context | Guard `mounted` no silencia lint en ternarios. Usar `// ignore` o refactorizar a if/else |
| 9 | Ordenamiento | Jerarquía de negocio → campo entero denormalizado. Nunca sort por enum léxico ni relación |
| 10 | Relaciones Prisma | Todo modelo nuevo necesita campo inverso (`relation`) en AMBOS lados. `prisma format` lo detecta |
| 11 | Categorías duales | Catálogos de entidades distintas (OFICIO vs NEGOCIO) necesitan discriminador `forType`. Nunca catálogo único para dominios semánticamente diferentes |
| 12 | Multi-perfil imágenes | `saveProviderImage` sin `type` apunta al primer perfil. Siempre pasar `type: widget.providerType` en contextos multi-perfil |
| 13 | Favoritos por sesión | Providers con estado por usuario: `initialize(userId)` en login y `clear()` en logout, acoplado a `_onAuthChanged()`. Nunca solo en `initState()` |
| 14 | UI estado aprobación | `Consumer<AuthProvider>` para proveedor: ramas para TODOS los estados (canRegister, PENDIENTE, APROBADO, RECHAZADO). Estado no contemplado = UI vacía |
| 15 | Tipos de notificación | Cada tipo nuevo en backend necesita entrada en `AppNotification.icon` y `iconColor`. Actualizar en el mismo commit |
| 16 | Ubicación en registro | `department`/`province`/`district` obligatorios en TODO registro. Al completar onboarding, pre-seed `ProvidersProvider` con la ubicación. En `_onAuthChanged`, restaurar el filtro si el usuario ya tiene ubicación guardada |
| 17 | Extension methods — import obligatorio | `when()` en `ApiResult` es un extension method definido en `failures.dart`. Cualquier screen que llame `.when()` directamente sobre un `ApiResult` **debe** importar `failures.dart` explícitamente. Sin el import, el compilador reporta "method not defined" aunque el tipo sea correcto |
| 18 | `when()` en `ApiResult` — firma failure | El callback `failure` recibe `AppException`, no `String`. Acceder al mensaje con `.message`. Patrón: `failure: (e) => _showError(e.message)` |
| 19 | Enums nuevos en Prisma — shadow DB | Al agregar un enum nuevo con `prisma migrate dev`, la shadow database puede fallar por "unsafe use of new enum value". Usar `prisma db push` para esquemas en desarrollo activo, reservar `migrate dev` para producción con SQL manual |
| 20 | AdminGuard inexistente | No existe `AdminGuard` en el proyecto. Proteger rutas de admin con `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN')`. Nunca referenciar guards que no estén en `src/auth/` |
| 21 | `TrustRejectionPayload` — definir fuera de clase | Clases de payload/DTO usadas como tipos en `AuthProvider` deben declararse **antes** de la clase, no dentro. Dart no soporta clases anidadas públicas |

