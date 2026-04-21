# OficioApp — Estado Actual del Proyecto

**Última actualización**: 2026-04-19
**Estado**: Hito 7.0 — Auditoría Admin Completa + Real-time + Analytics Estratégico

---

## 📊 Resumen Ejecutivo

OficioApp es un marketplace de servicios locales para ciudades intermedias del Perú (Huancayo, Huanta) con **3 aplicaciones completamente funcionales**:

- ✅ App móvil Flutter (clientes y proveedores)
- ✅ Backend NestJS con JWT, WebSockets, PostGIS, Redis, MinIO
- ✅ Panel admin Next.js con CRUD completo, métricas, moderación y solicitudes de plan

**Stack de Lenguajes**: TypeScript 81.4%, Dart 14.8%, C++ 1.9%, CMake 1.4%, Swift 0.2%, HTML 0.1%

---

## ✅ Hitos Completados (0 → 6.0)

| Hito | Estado | Qué incluye |
|------|--------|-------------|
| **0-1** | ✅ | Docker, Prisma, JWT, AuthProvider, SecureStorage |
| **2** | ✅ | ServiceCard, sistema de colores, diseño base |
| **3** | ✅ | Listado de proveedores, filtros, caché Redis, detalle con mapa |
| **4** | ✅ | Reseñas, validación GPS+QR, upload de fotos |
| **5** | ✅ | Panel admin, dashboard 8 métricas, moderación reseñas |
| **5.5** | ✅ | Feature-First architecture, ApiInterceptor tipado, auth centralizada |
| **5.6** | ✅ | Logout, ProfileScreen, OnboardingScreen animado, FavoritesProvider global |
| **5.7** | ✅ | SplashScreen, WelcomeScreen carrusel, LoginScreen, JoinUsModal animado |
| **5.8** | ✅ | Panel proveedor 5 tabs (Home, Perfil, Servicios, Stats, Ajustes), DashboardProvider |
| **5.9** | ✅ | Fix multicuentas — limpieza de estado entre logins, isolación por tipo de perfil |
| **5.9.1** | ✅ | Formulario NEGOCIO diferenciado: RUC, Nombre Comercial, Razón Social, Delivery toggle |
| **5.9.2** | ✅ | Suscripciones interactivas: PlanRequest, admin approval, notifs tiempo real |
| **6.0** | ✅ | Migración SVG de íconos sociales (Google/Facebook/Apple), widget reutilizable |
| **6.1** | ✅ | 4 parches de arquitectura: validación DTO, aislamiento notifs, anti-spam PlanRequest, limpieza enum |
| **6.2** | ✅ | Panel tiempo real: socket.io-client admin, toasts live, bell badge, auto-reload páginas |
| **6.2.1** | ✅ | Detección tarjeta propia: oculta WhatsApp/Llamar, muestra "Ir a mi panel" (list + detail) |
| **6.2.2** | ✅ | Sistema recomendaciones: modal post-reseña, contador en tarjetas, endpoint backend |
| **6.3** | ✅ | Permisos explícitos: GPS real en reseñas, URL Maps en onboarding, PermissionService centralizado |
| **6.4** | ✅ | Respuestas a reseñas: hilo chat, autorización revisor+proveedor, notifs cruzadas, foto adjunta |
| **6.5** | ✅ | Prioridad de plan: PREMIUM→ESTANDAR→BASICO→GRATIS en listado; reseña editable (1 por usuario) |
| **6.6** | ✅ | Reportar proveedor: botón en detail sheet, 6 motivos, detalle opcional, 1 reporte por usuario |
| **6.7** | ✅ | Flujo re-registro tras rechazo: banner rojo + botón "Volver a registrarse" con datos pre-llenados; badge separado verificación vs confianza |
| **6.8** | ✅ | Sistema de Confianza: formulario cámara-only DNI/negocio, backend trust-validation module, badge "Confiable", panel admin /trust-validation con comparativa, notif rechazo tiempo real |
| **7.0** | ✅ | Auditoría admin completa: real-time WebSocket integrado en dashboard, analytics estratégico con 13 KPIs reales, 4 variantes de tarjeta en listado mobile |

---

## 🏗️ Arquitectura Técnica

### Mobile (Flutter 3.41.6 / Dart 3.x)

**Arquitectura**: Feature-First Clean Architecture, Provider pattern (ChangeNotifier)

```
mobile/lib/
├── core/
│   ├── network/      dio_client.dart, api_interceptor.dart, socket_service.dart
│   ├── theme/        theme_provider.dart, app_theme_colors.dart
│   ├── constants/    app_colors.dart, app_strings.dart
│   └── errors/       app_exception.dart, failures.dart
├── features/
│   ├── auth/
│   │   ├── data/     auth_repository.dart, auth_local_storage.dart, saved_accounts_storage.dart
│   │   ├── domain/   user_model.dart
│   │   └── presentation/
│   │       ├── providers/   auth_provider.dart
│   │       ├── screens/     splash, welcome, onboarding, login, otp_verification,
│   │       │                profile, edit_profile, change_password, forgot_password,
│   │       │                reset_password, saved_accounts
│   │       └── widgets/     social_login_button.dart ← NUEVO (SVG)
│   ├── providers_list/
│   │   ├── data/     providers_repository.dart, reviews_repository.dart
│   │   ├── domain/   provider_model.dart, review_model.dart
│   │   └── presentation/
│   │       ├── providers/   providers_provider.dart
│   │       └── screens/     providers_screen (toggle 4 vistas: Lista/Mosaico/Contenido/Detalle), provider_detail_sheet
│   │       └── widgets/     service_card.dart ← NUEVO: ServiceCard, ServiceCardList, ServiceCardMosaic, ServiceCardContent
│   ├── favorites/            favorites_screen, favorites_provider.dart
│   ├── notifications/        notifications_screen, notifications_provider.dart, notification_model.dart
│   └── provider_dashboard/
│       ├── data/     dashboard_repository.dart
│       ├── domain/   dashboard_profile_model.dart, service_item_model.dart
│       └── presentation/
│           ├── providers/   dashboard_provider.dart
│           └── screens/     provider_panel (main), panel_home_tab, panel_profile_tab,
│                            panel_services_tab, panel_stats_tab, panel_settings_tab
└── shared/
    └── widgets/     join_us_modal.dart, provider_type_selector.dart
```

**Packages clave**:

| Paquete | Versión | Uso |
|---------|---------|-----|
| provider | ^6.1.5 | State management |
| dio | ^5.9.0 | HTTP client |
| flutter_svg | ^2.2.4 | SVG icons (social login, plan checks) |
| go_router | ^14.8.1 | Navegación declarativa |
| flutter_map | ^7.0.2 | Mapa de proveedores |
| socket_io_client | ^2.0.3 | Notificaciones en tiempo real |
| flutter_secure_storage | ^10.0.0 | Tokens JWT seguros |
| cached_network_image | ^3.4.1 | Imágenes con caché |
| image_picker | ^1.2.1 | Upload de fotos |
| flutter_rating_bar | ^4.0.1 | Estrellas de reseñas |
| shimmer | ^3.0.0 | Skeleton loading |
| json_serializable | ^6.13.1 | Codegen de modelos |

---

### Backend (NestJS 11 / TypeScript ESM)

**Arquitectura**: Monolito modular. Todos los imports locales usan extensión `.js` (ESM nativo).

```
backend/src/
├── auth/            JWT, registro, login, OTP, forgot-password, reset-password; emite emitAdminEvent('NEW_PROVIDER') al registrar
├── users/           Perfil de usuario, cambio de contraseña, foto de perfil
├── providers/       Listado público, detalle, analytics, métricas admin
├── reviews/         Reseñas, validación GPS+QR, upload de fotos
├── provider-profile/ Panel personal del proveedor, imágenes, notificaciones, plan-request
├── favorites/       Guardar/quitar proveedores favoritos
├── admin/           CRUD completo, verificación, moderación, plan requests; emite emitAdminEvent en approve/reject/plan-approve
├── events/          WebSocket Gateway (Socket.io); emitAdminEvent() ← NUEVO método para canal admin
└── common/          Guards, interceptors, filtros globales
```

**Endpoints principales**:

| Módulo | Endpoints |
|--------|-----------|
| `auth` | POST /register, /login, /register/provider, /refresh, /me, /forgot-password, /reset-password, /send-otp, /verify-otp |
| `users` | GET/PATCH /users/me, PATCH /users/profile-picture |
| `providers` | GET /providers, /providers/categories, /providers/:id, POST /providers/:id/track |
| `reviews` | POST /reviews, GET /reviews/provider/:id, PATCH /reviews/:id/moderate |
| `provider-profile` | GET/PATCH /provider-profile/me, PATCH availability, GET analytics, POST images, POST plan-request |
| `favorites` | POST/GET /favorites/:userId/:providerId |
| `admin` | CRUD providers, users, categories, reviews, plan-requests, notifications, reports |
| `events` | WebSocket namespace: notifications, joinRoom |

**Variables de entorno** (`.env`):
```
DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN
JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
PORT, NODE_ENV, API_BASE_URL
```

**Packages clave**:

| Paquete | Versión | Uso |
|---------|---------|-----|
| @nestjs/core | ^11.0.1 | Framework |
| @prisma/client | ^7.6.0 | ORM |
| @nestjs/jwt | ^11.0.2 | Autenticación |
| socket.io | ^4.8.3 | WebSockets |
| cache-manager-redis-yet | ^5.1.5 | Caché Redis |
| @nestjs/throttler | ^6.5.0 | Rate limiting |
| bcrypt | ^6.0.0 | Hash contraseñas |
| multer | ^2.1.1 | Upload de archivos |
| class-validator | ^0.15.1 | Validación DTOs |

---

### Admin Panel (Next.js 15 / TypeScript + Tailwind v3)

**Arquitectura**: SSR con App Router, Server/Client components.

```
admin/
├── app/
│   ├── page.tsx              Dashboard (8 métricas KPI) + EN VIVO indicator + pendingCount badge + liveAlert banner
│   ├── providers/            CRUD + cola de aprobación
│   ├── verification/         Cola de verificación documental
│   ├── reviews/              Moderación de reseñas
│   ├── plan-requests/        Solicitudes de plan (aprobar/rechazar)
│   ├── users/                Gestión de usuarios (activar/bannear)
│   ├── categories/           CRUD de categorías
│   ├── analytics/            ← REESCRITO — Dashboard estratégico: LineChart diario, 2 PieChart donuts, BarChart geo, funnel conversión, top providers; periodos 7d/30d/90d
│   ├── notifications/        Log de notificaciones enviadas
│   ├── reports/              Export CSV/JSON
│   └── login/                Autenticación admin
├── components/
│   ├── sidebar.tsx           Navegación lateral (incluye Solicitudes de Plan)
│   ├── create-provider-modal.tsx
│   ├── edit-provider-modal.tsx
│   ├── provider-detail-modal.tsx
│   ├── pending-approvals-table.tsx
│   ├── grace-providers-table.tsx
│   ├── reviews-moderation-table.tsx
│   ├── users-list.tsx / user-detail-modal.tsx
│   ├── notifications-list.tsx / notification-detail-modal.tsx
│   ├── reports-dashboard.tsx
│   ├── analytics-chart.tsx
│   ├── metric-card.tsx
│   ├── status-badge.tsx
│   └── layout-shell.tsx
└── lib/
    ├── api.ts              (incluye getPlanRequests, approvePlanRequest, rejectPlanRequest, getAnalytics — 13 KPIs)
    ├── socket.ts           Singleton socket.io-client para admin
    ├── use-admin-realtime.ts  ← NUEVO — hook React: connected/pendingCount/clearPending/onEvent
    └── utils.ts
```

**Packages clave**: next 15, react 19, tailwindcss ^3.4.17, recharts ^3.8.1, lucide-react, sonner (toasts), @radix-ui/*, date-fns

---

### Base de Datos (PostgreSQL 16 + PostGIS)

**ORM**: Prisma 7 — schema en `backend/prisma/schema.prisma`

| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios del sistema (USUARIO/PROVEEDOR/ADMIN) |
| `Provider` | Perfiles de servicio — un user puede tener OFICIO + NEGOCIO |
| `ProviderImage` | Galería de fotos del proveedor (máx. 4, una como portada) |
| `Subscription` | Plan activo: GRATIS/BASICO/ESTANDAR/PREMIUM |
| `Payment` | Historial de pagos por suscripción |
| `PlanRequest` | Solicitudes de upgrade de plan (PENDIENTE/APROBADO/RECHAZADO) |
| `Review` | Reseñas con rating 1-5, foto, validación GPS/QR |
| `Favorite` | Lista de favoritos del usuario |
| `VerificationDoc` | Documentos subidos para verificación |
| `ProviderAnalytic` | Eventos: whatsapp_click, call_click, profile_view |
| `AdminNotification` | Notificaciones del sistema al proveedor |
| `Locality` | Ciudades/regiones (soporte multi-ciudad) |
| `Category` | Categorías de servicios con jerarquía padre-hijo |
| `OtpCode` | Códigos OTP temporales |
| `RefreshToken` | Sesiones activas del usuario |

**Enums clave**:
- `UserRole`: USUARIO, PROVEEDOR, ADMIN
- `ProviderType`: OFICIO, NEGOCIO, PROFESSIONAL, BUSINESS
- `SubscriptionPlan`: GRATIS, BASICO, ESTANDAR, PREMIUM
- `SubscriptionStatus`: ACTIVA, VENCIDA, CANCELADA, GRACIA
- `AvailabilityStatus`: DISPONIBLE, OCUPADO, CON_DEMORA
- `VerificationStatus`: PENDIENTE, APROBADO, RECHAZADO
- `NotificationType`: APROBADO, RECHAZADO, MAS_INFO, VERIFICACION_REVOCADA, PLAN_SOLICITADO, PLAN_APROBADO, PLAN_RECHAZADO

**Índices de rendimiento** (en `Provider`):
```
@@index([isVisible, verificationStatus])
@@index([isVisible, verificationStatus, averageRating])
@@index([type]), @@index([categoryId]), @@index([localityId])
@@unique([userId, type])  — un user no puede tener 2 perfiles del mismo tipo
```

---

### Infraestructura (Docker Compose)

| Servicio | Imagen | Puerto | Propósito |
|----------|--------|--------|-----------|
| `postgres` | postgis/postgis:16-3.4 | 5432 | BD principal + queries espaciales |
| `redis` | redis:7.2-alpine | 6379 | Caché, rate limiting |
| `minio` | minio/minio:latest | 9000/9001 | Storage S3-compatible para fotos |

---

## 🆕 Cambios Recientes (2026-04-09 → 2026-04-17)

### Fix: Multicuentas (Hito 5.9)
- **Problema**: Al cambiar de cuenta en el mismo dispositivo, el estado del proveedor anterior (aprobación, perfiles) se filtraba a la nueva sesión.
- **Fix**: En `auth_provider.dart`, `login()` y `loginFromSaved()` ahora limpian `_providerProfiles`, `_activeProfileType`, `_verificationStatusByType`, `_rejectionReasonByType` antes de `_syncProviderStatus()`. El `else` branch también limpia en caso de usuario sin perfil de proveedor.

### Feature: Formulario NEGOCIO diferenciado (Hito 5.9.1)
- `onboarding_screen.dart` ahora muestra campos distintos según el tipo seleccionado:
  - **OFICIO**: DNI del titular
  - **NEGOCIO**: RUC (11 dígitos), Nombre Comercial, Razón Social + toggle "¿Tiene delivery?" con sub-toggle "Plena Coordinación"
- `register-provider.dto.ts` valida todos los nuevos campos
- `auth.service.ts` los persiste condicionalmente en Prisma
- Schema: `ruc`, `nombreComercial`, `razonSocial`, `hasDelivery`, `plenaCoordinacion` añadidos a `Provider`

### Feature: Suscripciones interactivas (Hito 5.9.2)
- **Mobile**: Tarjetas de plan en `panel_settings_tab.dart` ahora son clickeables con animación de press. Al tocar, se abre `_PlanConfirmSheet` con beneficios, precio y llamada real al backend.
- **Backend**: `POST /provider-profile/me/plan-request?type=` crea `PlanRequest` y envía notificaciones WebSocket al proveedor y al admin.
- **Admin**: Nueva página `/plan-requests` con filtros (PENDIENTE/APROBADO/RECHAZADO), acciones de aprobar y rechazar con motivo.
- **Notificaciones tiempo real**: `EventsGateway.emitNotification()` notifica al proveedor (PLAN_APROBADO/PLAN_RECHAZADO) y al admin (NEW_PLAN_REQUEST).
- **Aislación por perfil**: El tipo de perfil activo en `DashboardProvider._currentProviderType` se envía como query param `?type=OFICIO|NEGOCIO`.

### Feature: Migración SVG de íconos sociales (Hito 6.0)
- `mobile/assets/icons/google.svg` — reemplazado con el G multicolor oficial (4 colores: #4285F4, #34A853, #FBBC05, #EA4335)
- `mobile/assets/icons/apple.svg` — creado (path oficial de Apple logo)
- `mobile/assets/icons/facebook.svg` — existía, correcto (#0866FF)
- `mobile/lib/features/auth/presentation/widgets/social_login_button.dart` — widget reutilizable `SocialLoginButton` con enum `SocialProvider` (google, facebook, apple), `SvgPicture.asset()`, animación de press, color adaptativo para Apple en modo oscuro
- `login_screen.dart` — clase `_SocialButton` eliminada; reemplazada por `SocialLoginButton`

---

## 🆕 Cambios Recientes (2026-04-17 — Parches de Arquitectura)

### Fix: Validación DTO campos opcionales con string vacío
- `NullIfEmpty` transform convierte `""` → `null` antes de `@IsOptional` / `@Matches`
- `@ValidateIf` en RUC, nombreComercial, razonSocial: solo valida si el campo no es null
- `auth.service.ts`: parámetros `dni`, `ruc`, `nombreComercial`, `razonSocial` aceptan `string | null`

### Fix: Aislamiento de notificaciones por tipo de perfil
- `AdminNotification` en Prisma: añadido campo `targetProfileType String?`
- `NotificationPayload` (WebSocket): añadido `targetProfileType?: string`
- Todas las notificaciones de plan (PLAN_SOLICITADO/APROBADO/RECHAZADO) incluyen `provider.type`
- Flutter `_handleRemoteNotification`: filtra por `targetProfileType === _activeProfileType`

### Fix: Anti-spam en solicitudes de plan
- `requestPlanUpgrade` lanza `ConflictException` si ya existe una solicitud PENDIENTE
- Eliminado el patrón "cancelar-y-crear" que era vulnerable a race conditions

### Fix: Limpieza del enum ProviderType
- Eliminados `PROFESSIONAL` y `BUSINESS` del enum (valores nunca almacenados en BD)
- Eliminado campo redundante `providerType` del modelo `Provider`
- `providers.service.ts` mantiene backward-compat con alias legacy vía comparación de strings
- Ejecutado `db push` + `prisma generate`; cliente TypeScript regenerado sin errores

---

## 🆕 Cambios Recientes (2026-04-19 — Hito 7.0: Auditoría Admin)

### Feature: Real-time WebSocket integrado en dashboard admin
- `admin/lib/use-admin-realtime.ts` — nuevo hook React. Envuelve `getAdminSocket()` singleton. Expone `connected`, `lastEvent`, `pendingCount`, `clearPending`.
- `admin/app/page.tsx` — integrado: indicador "EN VIVO / SIN CONEXIÓN" (Wifi/WifiOff icons), badge naranja con `pendingCount`, banner `liveAlert` con fade de 4 segundos, `autoRefresh` on every event.
- `backend/src/events/events.gateway.ts` — nuevo método `emitAdminEvent(event, data?)` que emite al canal `adminEvent` con timestamp.
- `backend/src/auth/auth.service.ts` — llama `emitAdminEvent('NEW_PROVIDER', ...)` tras crear proveedor.
- `backend/src/admin/admin.service.ts` — llama `emitAdminEvent('PROVIDER_APPROVED'|'PROVIDER_REJECTED'|'PLAN_APPROVED', ...)` en cada acción de moderación.

### Feature: Analytics estratégico con 13 KPIs reales
- `backend/src/admin/admin.service.ts` — `getAnalytics(days)` reescrito: 13 queries Prisma en paralelo (`Promise.all`).
  - **Engagement diario**: agrupación por día de `ProviderAnalytic` (whatsapp_click, call_click, view).
  - **KPIs con delta**: total del período vs período anterior → flechas de tendencia (`whatsappDelta`, `callsDelta`, `viewsDelta`).
  - **Distribución de planes**: `groupBy` en `Subscription` activas.
  - **Funnel de conversión**: total → aprobado → activo → `conversionRate`.
  - **Distribución de disponibilidad**: estados DISPONIBLE/OCUPADO/CON_DEMORA.
  - **Distribución geográfica**: count por departamento.
  - **Top 10 proveedores**: ranking por clics del período.
- `admin/lib/api.ts` — interfaces `AnalyticsKPIs`, `PlanDistItem`, `ProviderFunnel`, `AvailabilityItem`, `GeoItem`, `TopProvider` añadidas; `AnalyticsResponse` extendida.
- `admin/app/analytics/page.tsx` — reescrita desde placeholder `<pre>JSON</pre>` a dashboard completo (~450 líneas): `LineChart` engagement diario, 2 `PieChart` donuts (planes + disponibilidad), `BarChart` horizontal geografía, funnel con barra de progreso, ranking top proveedores, insight texto auto-generado, selector de período 7d/30d/90d.

### Feature: 4 variantes de tarjeta en listado mobile
- `mobile/.../widgets/service_card.dart` — 3 nuevas clases públicas:
  - `ServiceCardList`: fila compacta 72px — avatar 48×48, nombre+categoría, estrellas, dot disponibilidad, ícono favorito, badge de plan.
  - `ServiceCardMosaic`: tile grid — imagen portada cubre 60%, badges plan/verificado/confiable superpuestos, nombre+estrellas+categoría abajo.
  - `ServiceCardContent`: tarjeta horizontal ~115px — imagen 95×115 izquierda, columna derecha con nombre+badge+categoría+rating+2 chips de servicio+botones compactos (WA/llamar/favorito).
- `providers_screen.dart` — toggle de 4 vistas: `lista`, `mosaico`, `contenido`, `detalle` (ServiceCard original).

---

## ⚠️ Gaps Conocidos (Pendientes)

| # | Área | Problema | Impacto |
|---|------|----------|---------|
| 1 | Backend | Email no integrado (forgot-password/reset devuelven token en respuesta) | UX en producción |
| 2 | Backend | SMS OTP generado pero no enviado por SMS (código devuelto en respuesta) | Seguridad en producción |
| 3 | Mobile | `create_review_sheet.dart` marcado "TODO: Implement this library" | Feature incompleta |
| 4 | General | Sin CI/CD pipeline configurado | Deployments manuales |
| 5 | General | Sin tests unitarios/integración relevantes | Riesgo de regresiones |
| 6 | Admin | Panel de pagos no implementado | Cobros manuales |
| 7 | Backend | Email no integrado en OTP/forgot-password (código devuelto en respuesta dev) | Seguridad en producción |

---

## 🎯 Próximos Pasos Sugeridos

### Tier 1 — Completar Core UX
1. Completar `create_review_sheet.dart` (submit + upload foto funcional)
2. Integrar servicio de email (SendGrid/Resend) para reset de contraseña
3. Integrar Twilio/Vonage para OTP por SMS real

### Tier 2 — Producción
4. CI/CD con GitHub Actions (lint + build + deploy)
5. Variables de entorno para producción (Railway/Render/VPS)
6. HTTPS + dominio propio

### Tier 3 — Roadmap
7. Chatbot IA de recomendación (Hito 6.1)
8. Sistema de pagos Yape/PagoEfectivo (Hito 7)
9. App nativa iOS/Android (actualmente solo web/Chrome)

---

## 🔧 Cómo Ejecutar

```bash
# 1. Infraestructura (PostgreSQL + Redis + MinIO)
docker-compose up -d

# 2. Backend (puerto 3000)
cd backend && npm install && npm run start:dev

# 3. Admin (puerto 3001)
cd admin && npm install && npm run dev

# 4. Mobile (Chrome)
cd mobile && flutter pub get && flutter run -d chrome
```

**Nota Prisma**: Para cambios de schema sin historial de migraciones limpio, usar `npx prisma db push` en lugar de `migrate dev`.

---

## 📁 Rutas Clave

| Recurso | Ruta |
|---------|------|
| Schema BD | `backend/prisma/schema.prisma` |
| Auth state (Flutter) | `mobile/lib/features/auth/presentation/providers/auth_provider.dart` |
| Dashboard state | `mobile/lib/features/provider_dashboard/presentation/providers/dashboard_provider.dart` |
| API calls (Admin) | `admin/lib/api.ts` |
| WebSocket gateway | `backend/src/events/events.gateway.ts` |
| Social icons SVG | `mobile/assets/icons/{google,facebook,apple}.svg` |
| Social login widget | `mobile/lib/features/auth/presentation/widgets/social_login_button.dart` |
| Admin real-time hook | `admin/lib/use-admin-realtime.ts` |
| Admin socket singleton | `admin/lib/socket.ts` |
| Service card variants | `mobile/lib/features/providers_list/presentation/widgets/service_card.dart` |
| Analytics estratégico | `admin/app/analytics/page.tsx` |
