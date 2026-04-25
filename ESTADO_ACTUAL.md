# OficioApp — Estado Actual del Proyecto

**Última actualización**: 2026-04-23
**Estado**: Hito 8.0 — Subasta ConfiServ + Límites de Plan + OTP sin BD + Modales Legales

---

## 📊 Resumen Ejecutivo

OficioApp es un marketplace de servicios locales para ciudades intermedias del Perú (Huancayo, Huanta) con **3 aplicaciones completamente funcionales**:

- ✅ App móvil Flutter (clientes y proveedores)
- ✅ Backend NestJS con JWT, WebSockets, PostGIS, Redis, MinIO
- ✅ Panel admin Next.js con CRUD completo, métricas, moderación y solicitudes de plan

**Stack de Lenguajes**: TypeScript 81.4%, Dart 14.8%, C++ 1.9%, CMake 1.4%, Swift 0.2%, HTML 0.1%

---

## ✅ Hitos Completados (0 → 8.0)

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
| **6.7** | ✅ | Flujo re-registro tras rechazo: banner rojo + botón "Volver a registrarse" con datos pre-llenados |
| **6.8** | ✅ | Sistema de Confianza: formulario cámara-only DNI/negocio, backend trust-validation, badge "Confiable" |
| **7.0** | ✅ | Auditoría admin completa: real-time WebSocket, analytics estratégico 13 KPIs, 4 variantes de tarjeta |
| **7.1** | ✅ | Registro sin BD hasta OTP: Redis pendiente, admin notificado en 2 fases, resend OTP |
| **7.2** | ✅ | Modales legales animados: T&C en registro, Privacidad/T&C/Ayuda independientes por rol en panel |
| **7.3** | ✅ | Sistema de límites por plan (PlanLimits): fotos 3/6/10, servicios 1/6/∞, productos 3/6/∞, stats gateado |
| **7.4** | ✅ | Comparativa de planes en onboarding: sheet pre-registro con features por plan, locked tachadas |
| **8.0** | ✅ | **Subasta ConfiServ**: flujo completo cliente↔proveedor, geolocalización, límites, anti-arrepentimiento |

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
│   ├── errors/       app_exception.dart, failures.dart
│   └── utils/        plan_limits.dart  ← NUEVO
├── features/
│   ├── auth/
│   │   ├── data/     auth_repository.dart, auth_local_storage.dart, saved_accounts_storage.dart
│   │   ├── domain/   user_model.dart
│   │   └── presentation/
│   │       ├── providers/   auth_provider.dart  ← pendingRegistrationId, resendOtp()
│   │       ├── screens/     splash, welcome, onboarding (+ _OnboardingPlansSheet), login (+ _TermsModal),
│   │       │                otp_verification, profile, edit_profile, change_password,
│   │       │                forgot_password, reset_password, saved_accounts
│   │       └── widgets/     social_login_button.dart
│   ├── providers_list/
│   │   ├── data/     providers_repository.dart, reviews_repository.dart
│   │   ├── domain/   provider_model.dart, review_model.dart
│   │   └── presentation/
│   │       ├── providers/   providers_provider.dart
│   │       └── screens/     providers_screen (toggle 4 vistas + _SubastaBanner), provider_detail_sheet
│   │       └── widgets/     service_card.dart (4 variantes: ServiceCard/List/Mosaic/Content)
│   ├── favorites/            favorites_screen, favorites_provider.dart
│   ├── notifications/        notifications_screen, notifications_provider.dart, notification_model.dart
│   ├── provider_dashboard/
│   │   ├── data/     dashboard_repository.dart
│   │   ├── domain/   dashboard_profile_model.dart, service_item_model.dart
│   │   └── presentation/
│   │       ├── providers/   dashboard_provider.dart
│   │       └── screens/     provider_panel (6 tabs ahora), panel_home_tab, panel_profile_tab,
│   │                        panel_services_tab (+ PlanLimits), panel_stats_tab (+ upsell GRATIS),
│   │                        panel_settings_tab (+ modales legales por rol)
│   ├── subastas/                                         ← NUEVO MÓDULO COMPLETO
│   │   ├── data/     subastas_repository.dart
│   │   ├── domain/   service_request_model.dart (ServiceRequestModel, OfferModel, OpportunityModel)
│   │   └── presentation/
│   │       ├── providers/   subastas_provider.dart
│   │       ├── screens/     publish_request_sheet.dart, my_requests_screen.dart, oportunidades_tab.dart
│   │       └── widgets/     offer_comparison_sheet.dart, submit_offer_sheet.dart
│   └── trust_validation/
│       ├── data/     trust_validation_repository.dart
│       └── presentation/   trust_validation_form_screen.dart
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
| geolocator | ^13.0.2 | GPS para subastas y reseñas |
| flutter_rating_bar | ^4.0.1 | Estrellas de reseñas |
| shimmer | ^3.0.0 | Skeleton loading |
| json_serializable | ^6.13.1 | Codegen de modelos |

---

### Backend (NestJS 11 / TypeScript ESM)

**Arquitectura**: Monolito modular. Todos los imports locales usan extensión `.js` (ESM nativo).

```
backend/src/
├── auth/            JWT, registro SIN BD (Redis pending), login, OTP, forgot/reset-password
│                    emitAdminEvent('USER_PENDING') y ('NEW_USER_VERIFIED') en flujo OTP
├── users/           Perfil de usuario, cambio de contraseña, foto de perfil
├── providers/       Listado público, detalle, analytics, métricas admin
├── reviews/         Reseñas, validación GPS+QR, upload de fotos
├── provider-profile/ Panel personal del proveedor, imágenes, notificaciones, plan-request
├── favorites/       Guardar/quitar proveedores favoritos
├── admin/           CRUD completo, verificación, moderación, plan requests
├── events/          WebSocket Gateway (Socket.io); emitSubastaNew() ← NUEVO
├── trust-validation/ Formulario de validación de confianza con documentos
└── subastas/        ← NUEVO MÓDULO COMPLETO
    ├── subastas.module.ts
    ├── subastas.service.ts   (crear, listar, oportunidades, ofertar, aceptar, expirar, penalizar)
    ├── subastas.controller.ts
    └── dto/                  (create-service-request, submit-offer, accept-offer, arrived)
```

**Endpoints principales**:

| Módulo | Endpoints |
|--------|-----------|
| `auth` | POST /register, /login, /register/provider, /refresh, /me, /forgot-password, /reset-password, /send-otp, /verify-otp, /resend-otp |
| `users` | GET/PATCH /users/me, PATCH /users/profile-picture |
| `providers` | GET /providers, /providers/categories, /providers/:id, POST /providers/:id/track |
| `reviews` | POST /reviews, GET /reviews/provider/:id, PATCH /reviews/:id/moderate |
| `provider-profile` | GET/PATCH /provider-profile/me, PATCH availability, GET analytics, POST images, POST plan-request |
| `favorites` | POST/GET /favorites/:userId/:providerId |
| `admin` | CRUD providers, users, categories, reviews, plan-requests, notifications, reports |
| `events` | WebSocket namespace: notifications, joinRoom, subastaNew |
| `subastas` | POST /requests, GET /requests/mine, POST /requests/accept, GET /opportunities/:id, POST /offers, DELETE /offers/:id, POST /offers/arrived |

**Variables de entorno** (`.env`):
```
DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN
JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
PORT, NODE_ENV, API_BASE_URL
```

---

### Admin Panel (Next.js 15 / TypeScript + Tailwind v3)

**Arquitectura**: SSR con App Router, Server/Client components.

```
admin/
├── app/
│   ├── page.tsx              Dashboard KPI + EN VIVO + pendingCount + liveAlert
│   ├── providers/            CRUD + cola de aprobación
│   ├── verification/         Cola de verificación documental
│   ├── reviews/              Moderación de reseñas
│   ├── plan-requests/        Solicitudes de plan (aprobar/rechazar)
│   ├── users/                Gestión de usuarios
│   ├── categories/           CRUD de categorías
│   ├── analytics/            Dashboard estratégico: LineChart, 2 PieCharts, BarChart, funnel, top-10
│   ├── notifications/        Log de notificaciones
│   ├── reports/              Export CSV/JSON
│   └── login/                Autenticación admin
├── components/
│   └── ... (sidebar, modales, tablas de moderación, metric-card, analytics-chart)
└── lib/
    ├── api.ts                13 KPIs reales, interfaces extendidas
    ├── socket.ts             Singleton socket.io-client
    ├── use-admin-realtime.ts Hook React: connected/pendingCount/clearPending/onEvent
    │                         AdminEventType incluye USER_PENDING y NEW_USER_VERIFIED
    └── utils.ts
```

**Packages clave**: next 15, react 19, tailwindcss ^3.4.17, recharts ^3.8.1, lucide-react, sonner, @radix-ui/*, date-fns

---

### Base de Datos (PostgreSQL 16 + PostGIS)

**ORM**: Prisma 7 — schema en `backend/prisma/schema.prisma`

| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios del sistema (USUARIO/PROVEEDOR/ADMIN) |
| `Provider` | Perfiles de servicio — un user puede tener OFICIO + NEGOCIO |
| `ProviderImage` | Galería de fotos del proveedor |
| `Subscription` | Plan activo: GRATIS/BASICO/ESTANDAR/PREMIUM |
| `Payment` | Historial de pagos por suscripción |
| `PlanRequest` | Solicitudes de upgrade de plan |
| `Review` | Reseñas con rating 1-5, foto, validación GPS/QR |
| `ReviewReply` | Respuestas a reseñas (hilo) |
| `Favorite` | Lista de favoritos del usuario |
| `VerificationDoc` | Documentos subidos para verificación |
| `ProviderAnalytic` | Eventos: whatsapp_click, call_click, profile_view |
| `AdminNotification` | Notificaciones del sistema al proveedor (incluye targetProfileType) |
| `Locality` | Ciudades/regiones (soporte multi-ciudad) |
| `Category` | Categorías con jerarquía padre-hijo |
| `OtpCode` | Códigos OTP temporales |
| `RefreshToken` | Sesiones activas |
| `Recommendation` | Recomendaciones de usuario a proveedor |
| `ProviderReport` | Reportes de clientes sobre proveedores |
| `PlatformIssue` | Problemas reportados desde el panel |
| `TrustValidationRequest` | Validación de confianza con documentos (DNI/RUC) |
| `ServiceRequest` | ← NUEVO: Solicitud de subasta publicada por cliente |
| `Offer` | ← NUEVO: Oferta de proveedor a una solicitud |
| `UserPenalty` | ← NUEVO: Penalización anti-arrepentimiento (3 subastas sin elegir → bloqueo 7 días) |

**Enums clave**:
- `UserRole`: USUARIO, PROVEEDOR, ADMIN
- `ProviderType`: OFICIO, NEGOCIO
- `SubscriptionPlan`: GRATIS, BASICO, ESTANDAR, PREMIUM
- `SubscriptionStatus`: ACTIVA, VENCIDA, CANCELADA, GRACIA
- `AvailabilityStatus`: DISPONIBLE, OCUPADO, CON_DEMORA
- `VerificationStatus`: PENDIENTE, APROBADO, RECHAZADO
- `TrustStatus`: NONE, PENDING, APPROVED, REJECTED
- `NotificationType`: APROBADO, RECHAZADO, MAS_INFO, VERIFICACION_REVOCADA, PLAN_SOLICITADO, PLAN_APROBADO, PLAN_RECHAZADO
- `ServiceRequestStatus`: OPEN, CLOSED, EXPIRED, CANCELLED ← NUEVO
- `OfferStatus`: PENDING, ACCEPTED, REJECTED, WITHDRAWN ← NUEVO

> ⚠️ **Pendiente**: Ejecutar `npx prisma migrate dev --name subasta_confiserv` para crear las 3 tablas nuevas y regenerar el cliente TypeScript.

---

### Infraestructura (Docker Compose)

| Servicio | Imagen | Puerto | Propósito |
|----------|--------|--------|-----------|
| `postgres` | postgis/postgis:16-3.4 | 5432 | BD principal + queries espaciales |
| `redis` | redis:7.2-alpine | 6379 | Caché, rate limiting, pendingRegistrations |
| `minio` | minio/minio:latest | 9000/9001 | Storage S3-compatible para fotos |

---

## 🆕 Cambios Recientes (2026-04-23 — Hitos 7.1 → 8.0)

### Hito 7.1 — Registro sin BD hasta OTP verificado

- **Backend `auth.service.ts`**: `registerUser()` ya no inserta en BD. Guarda 3 claves Redis (TTL 15 min): `pending_reg:{pendingId}` (datos), `pending_otp:{pendingId}` (código), `pending_email:{email}` (guardia unicidad). Al verificar OTP (`verifyOtp(pendingId, code)`): crea el usuario en BD, limpia Redis, emite `NEW_USER_VERIFIED` al admin.
- **Backend `verify-otp.dto.ts`**: cambiado de `userId: number` → `pendingId: string (UUID)`.
- **Backend `auth.controller.ts`**: añadido `POST /auth/resend-otp` → `authService.resendPendingOtp(pendingId)`.
- **Backend `events.gateway.ts`**: `emitAdminEvent` extendido con `'USER_PENDING' | 'NEW_USER_VERIFIED'`.
- **Flutter `auth_repository.dart`**: `register()` devuelve `ApiResult<Map>` con `pendingId`; `verifyOtp()` usa `pendingId`; nuevo `resendOtp(pendingId)`.
- **Flutter `auth_provider.dart`**: `_pendingRegistrationId` y `_pendingEmail` — no se crea sesión hasta verificar OTP. Nuevo `resendOtp()` y `clearPendingRegistration()`.
- **Flutter `otp_verification_screen.dart`**: muestra `pendingEmail`, botón "Reenviar" llama `auth.resendOtp()`, botón atrás llama `clearPendingRegistration()`.
- **Admin `use-admin-realtime.ts`** y **`page.tsx`**: mensajes diferenciados para `USER_PENDING` (⏳) y `NEW_USER_VERIFIED` (✅).

### Hito 7.2 — Modales legales animados

- **`login_screen.dart`**: checkbox de T&C separado del tap en el texto. El texto "Términos y Condiciones" abre `_TermsModal` (DraggableScrollableSheet 85%→95%), con handle, header+X, texto scrollable y botón "Entendido". Placeholder `[PEGAR TEXTO AQUÍ]` listo para contenido real.
- **`panel_settings_tab.dart`**: enum `_LegalSection` (privacy, terms, help) + `_LegalSheet` con `static void show(context, {type, section})`. El color de acento y badge de rol se adaptan: NEGOCIO = ámbar, OFICIO = azul primario. 6 bloques de contenido estáticos independientes por combinación rol × sección.

### Hito 7.3 — Sistema de límites por plan (PlanLimits)

- **`mobile/lib/core/utils/plan_limits.dart`** — fuente única de verdad para todos los límites:

| Recurso | GRATIS | ESTÁNDAR | PREMIUM |
|---------|--------|----------|---------|
| Fotos | 3 | 6 | 10 |
| Servicios (OFICIO) | 1 | 6 | ∞ |
| Productos (NEGOCIO) | 3 | 6 | ∞ |
| Foto en productos | ✗ | ✓ | ✓ |
| Stats / Gestión visitas | ✗ | ✓ | ✓ |

- **`panel_services_tab.dart`**: `_PlanLimitBanner` (ámbar cuando queda 1 slot, rojo al límite), FAB y botón Añadir se ocultan al límite, contador `X/límite`.
- **`panel_profile_tab.dart`**: `_PhotoLimitNote` al llegar al límite, subtítulo dinámico `X/maxFotos`.
- **`panel_stats_tab.dart`**: si plan es GRATIS, muestra `_StatsUpsellScreen` completa con 4 beneficios, badge precio ámbar y botón "Ver planes" → snackbar apuntando a Ajustes.

### Hito 7.4 — Comparativa de planes en onboarding

- **`onboarding_screen.dart`**: `_goToProviderForm()` ahora muestra `_OnboardingPlansSheet` (DraggableScrollableSheet 92%) antes de navegar al formulario. 3 `_OnboardingPlanCard` con features por rol, locked features tachadas con icono candado, nota informativa sobre upgrades.

### Hito 8.0 — Subasta ConfiServ (sistema completo de licitación)

#### Flujo completo
1. **Cliente publica** necesidad (categoría, descripción, foto, presupuesto, fecha, GPS).
2. **NestJS notifica** via WebSocket (`subastaNew`) a proveedores conectados de esa categoría.
3. **Proveedores** ven el tablón "Oportunidades" con foto, distancia, countdown, barra de progreso.
4. **Proveedor postula** con precio + mensaje en modal simple.
5. **Cliente compara** ofertas en sheet comparativo (precio, rating, badge verificado, mensaje).
6. **Al aceptar**: transacción atómica → oferta elegida ACCEPTED, resto REJECTED, solicitud CLOSED, chat abierto, proveedor notificado.
7. **Anti-arrepentimiento**: 3 subastas expiradas con ofertas sin elegir → bloqueo 7 días.
8. **GPS llegada**: proveedor marca "Ya llegué" con coordenadas validadas.

#### Reglas implementadas
- Máximo 5 ofertas por solicitud — al completarse, se oculta para nuevos proveedores.
- Expiración a las 24 horas (servicio `expireStaleRequests()` para cron externo).
- Solo proveedores con rating ≥ 3.0 o sello de confianza pueden participar.
- Radio geográfico calculado con Haversine (lat/lng del proveedor vs solicitud).

#### Backend nuevo
| Archivo | Qué hace |
|---------|----------|
| `prisma/schema.prisma` | +3 modelos: `ServiceRequest`, `Offer`, `UserPenalty` · +2 enums: `ServiceRequestStatus`, `OfferStatus` |
| `src/subastas/subastas.service.ts` | Toda la lógica: crear, listar, oportunidades, ofertar, aceptar atómico, retirar, expirar, penalizar, Haversine |
| `src/subastas/subastas.controller.ts` | 7 endpoints REST bajo `/subastas/` |
| `src/subastas/subastas.module.ts` | Registrado en `app.module.ts` |
| `src/events/events.gateway.ts` | +`emitSubastaNew()` broadcast a todos los proveedores conectados |

#### Flutter — cliente
| Archivo | Qué hace |
|---------|----------|
| `subastas/domain/models/service_request_model.dart` | `ServiceRequestModel`, `OfferModel`, `OpportunityModel` |
| `subastas/data/subastas_repository.dart` | Todas las llamadas REST (createRequest, getMyRequests, acceptOffer, getOpportunities, submitOffer, withdrawOffer, markArrived) |
| `subastas/presentation/providers/subastas_provider.dart` | Estado compartido: myRequests, opportunities, submitting, error |
| `subastas/presentation/screens/publish_request_sheet.dart` | Modal publicar: 8 categorías, foto cámara, descripción, presupuesto min/max, fecha, GPS, info banner, botón publicar |
| `subastas/presentation/screens/my_requests_screen.dart` | Lista con status badge, countdown, foto, presupuesto, contador de ofertas, botón "Ver ofertas" |
| `subastas/presentation/widgets/offer_comparison_sheet.dart` | Comparativa: "Mejor precio" badge, avatar, rating estrellas, badge verificado, precio destacado, confirmación modal antes de aceptar |

#### Flutter — proveedor
| Archivo | Qué hace |
|---------|----------|
| `subastas/presentation/screens/oportunidades_tab.dart` | Tab "Ofertas" ⚡: lista con foto, distancia km, countdown urgente (rojo <3h), barra progreso de ofertas, chips presupuesto/zona, botón Postular (ámbar), banner de rating insuficiente |
| `subastas/presentation/widgets/submit_offer_sheet.dart` | Modal postular: precio grande con prefijo S/, mensaje libre, submit con spinner |

#### Integración
- **`provider_panel.dart`**: tab "Ofertas" ⚡ añadido en posición 2 (entre Perfil y Servicios), `SubastasProvider` inyectado via `ChangeNotifierProvider`.
- **`providers_screen.dart`**: `_SubastaBanner` visible solo para clientes (role != PROVEEDOR) — abre `PublishRequestSheet` → navega a `MyRequestsScreen` si publica con éxito.

---

## ⚠️ Pendientes Críticos

| # | Área | Acción requerida | Impacto |
|---|------|-----------------|---------|
| **P1** | Backend | `npx prisma migrate dev --name subasta_confiserv` | Las 3 tablas de subasta no existen en BD |
| 2 | Backend | Email no integrado (OTP/forgot-password devuelven token en respuesta) | Seguridad en producción |
| 3 | Backend | SMS OTP no enviado por SMS real | Seguridad en producción |
| 4 | Mobile | `create_review_sheet.dart` marcado TODO | Feature incompleta |
| 5 | General | Sin CI/CD pipeline | Deployments manuales |
| 6 | General | Sin tests unitarios relevantes | Riesgo de regresiones |
| 7 | Admin | Panel de pagos no implementado | Cobros manuales |
| 8 | Subastas | Cron de expiración no configurado (llamar `expireStaleRequests()` cada hora) | Solicitudes nunca expirarán |
| 9 | Subastas | Photo upload en `PublishRequestSheet` sube archivo local pero backend espera URL MinIO | Fotos de solicitud no se guardan |

---

## 🎯 Próximos Pasos Sugeridos

### Tier 1 — Inmediatos
1. **`npx prisma migrate dev --name subasta_confiserv`** — activar las tablas de subasta
2. Configurar scheduler NestJS (`@nestjs/schedule`) para llamar `expireStaleRequests()` cada hora
3. Conectar upload foto en `PublishRequestSheet` → MinIO (igual que fotos de perfil)

### Tier 2 — Completar Core UX
4. Completar `create_review_sheet.dart` (submit + upload foto funcional)
5. Integrar servicio de email (SendGrid/Resend) para OTP y reset de contraseña
6. Integrar Twilio/Vonage para OTP por SMS real

### Tier 3 — Producción
7. CI/CD con GitHub Actions (lint + build + deploy)
8. Variables de entorno para producción (Railway/Render/VPS)
9. HTTPS + dominio propio

### Tier 4 — Roadmap
10. Chatbot IA de recomendación
11. Sistema de pagos Yape/PagoEfectivo
12. App nativa iOS/Android (actualmente solo web/Chrome)

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

# 5. IMPORTANTE — migrar tablas de Subasta ConfiServ (solo primera vez)
cd backend && npx prisma migrate dev --name subasta_confiserv
```

**Nota Prisma**: Para cambios de schema sin historial limpio, usar `npx prisma db push` en lugar de `migrate dev`.

---

## 📁 Rutas Clave

| Recurso | Ruta |
|---------|------|
| Schema BD | `backend/prisma/schema.prisma` |
| Auth state (Flutter) | `mobile/lib/features/auth/presentation/providers/auth_provider.dart` |
| Dashboard state | `mobile/lib/features/provider_dashboard/presentation/providers/dashboard_provider.dart` |
| Límites de plan | `mobile/lib/core/utils/plan_limits.dart` |
| Subastas state | `mobile/lib/features/subastas/presentation/providers/subastas_provider.dart` |
| Subastas repositorio | `mobile/lib/features/subastas/data/subastas_repository.dart` |
| Subastas servicio BE | `backend/src/subastas/subastas.service.ts` |
| WebSocket gateway | `backend/src/events/events.gateway.ts` |
| API calls (Admin) | `admin/lib/api.ts` |
| Admin real-time hook | `admin/lib/use-admin-realtime.ts` |
| Social icons SVG | `mobile/assets/icons/{google,facebook,apple}.svg` |
| Service card variants | `mobile/lib/features/providers_list/presentation/widgets/service_card.dart` |
| Analytics estratégico | `admin/app/analytics/page.tsx` |
