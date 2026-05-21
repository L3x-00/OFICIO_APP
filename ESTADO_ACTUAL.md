# Servi / Servi — Documentación Completa del Sistema

**Última actualización**: 2026-05-19
**Versión Mobile**: 2.0.0+107
**Estado**: Producción (backend desplegado en Render) — Hito 9.x

> Este documento es la **especificación completa** del sistema:
> requisitos funcionales (RF) y no funcionales (RNF) de las **4
> aplicaciones** — Backend, Panel Admin, Web (landing + panel web) y
> Mobile.

---

## 1. Visión General

**Servi** (marca de UI: *Servi*) es un **marketplace de servicios
locales** para ciudades intermedias del Perú (Huancayo, Huanta, El
Tambo, etc.). Conecta:

- **Clientes** — buscan y contratan profesionales o negocios. Uso gratuito.
- **Proveedores** — dos tipos de perfil:
  - **OFICIO** (profesional independiente: electricista, gasfitero…)
  - **NEGOCIO** (local/establecimiento: pollería, peluquería…)
  Pagan suscripción para más visibilidad y funciones.
- **Administradores** — gestionan, moderan y aprueban todo el catálogo.

### Modelo de negocio
- Clientes: 100% gratis.
- Proveedores: plan **GRATIS** (trial Estándar 1 mes de bienvenida) →
  **ESTÁNDAR** / **PREMIUM** de pago (MercadoPago o Yape).
- Sistema de **monedas y referidos** para incentivar el crecimiento.

### Las 4 aplicaciones

| App | Stack | Puerto | Usuarios |
|-----|-------|--------|----------|
| **Mobile** | Flutter 3.11 / Dart 3 | — | Clientes + Proveedores |
| **Backend** | NestJS 11 / TypeScript ESM | 3000 | API central |
| **Admin** | Next.js 16 / React 19 | 3001 | Administradores |
| **Web** | Next.js 15 / React 19 | 3002 | Landing pública + panel web del proveedor |

---

## 2. Arquitectura General

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Mobile    │   │    Admin    │   │     Web     │
│  (Flutter)  │   │  (Next 16)  │   │  (Next 15)  │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │   REST + WebSocket (Socket.io)    │
       └───────────────┬──────────────────┘
                       ▼
              ┌──────────────────┐
              │   Backend API    │
              │   (NestJS 11)    │
              └────────┬─────────┘
        ┌──────────────┼──────────────┬─────────────┐
        ▼              ▼              ▼             ▼
  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐
  │PostgreSQL│  │   Redis     │  │ R2 / S3  │  │ Firebase │
  │ +PostGIS │  │  (Upstash)  │  │(Cloudfl.)│  │ FCM+Auth │
  └──────────┘  └────────────┘  └──────────┘  └──────────┘
```

- **Comunicación**: REST (JSON) para CRUD + WebSocket (Socket.io) para
  eventos en tiempo real (notificaciones, chat, panel admin live).
- **Autenticación**: JWT (access + refresh). Login social vía Firebase
  Auth (Google, Facebook) y TikTok OAuth2 + PKCE.
- **Storage**: Cloudflare R2 (S3-compatible) para fotos/comprobantes.
- **Push**: Firebase Cloud Messaging para notificaciones en background.

---

## 3. Requisitos Funcionales (RF)

### 3.1 Autenticación y Cuentas

| ID | Requisito | App |
|----|-----------|-----|
| RF-AUTH-01 | Registro de cliente con email + contraseña; el usuario NO se persiste en BD hasta verificar OTP (datos en Redis 15 min) | Mobile, Web, Backend |
| RF-AUTH-02 | Verificación de cuenta por **código OTP** enviado por email (Brevo) | Mobile, Backend |
| RF-AUTH-03 | Reenvío de OTP con cooldown | Mobile, Backend |
| RF-AUTH-04 | Login con email + contraseña; emisión de JWT access + refresh | Todas |
| RF-AUTH-05 | Login social: Google y Facebook (Firebase Auth), TikTok (OAuth2+PKCE) | Mobile |
| RF-AUTH-06 | Refresh token automático al expirar el access token | Mobile, Web |
| RF-AUTH-07 | Recuperación de contraseña (forgot/reset por email) | Mobile, Backend |
| RF-AUTH-08 | Cambio de contraseña autenticado | Mobile, Web |
| RF-AUTH-09 | Cuentas guardadas — multi-cuenta con cambio rápido | Mobile |
| RF-AUTH-10 | Cierre de sesión inmediato (limpieza de estado local) | Mobile, Web |
| RF-AUTH-11 | Modo invitado — navegación sin cuenta con CTA a registro | Mobile |
| RF-AUTH-12 | Eliminación de cuenta propia en cascada (confirmación por texto) | Mobile, Backend |
| RF-AUTH-13 | Aceptación obligatoria de Términos y Condiciones al registrar | Mobile, Web |

### 3.2 Onboarding de Proveedor

| ID | Requisito | App |
|----|-----------|-----|
| RF-ONB-01 | Registro como proveedor OFICIO o NEGOCIO con formulario diferenciado | Mobile, Web |
| RF-ONB-02 | OFICIO: DNI opcional, toggle "atiende a domicilio" | Mobile |
| RF-ONB-03 | NEGOCIO: RUC, Nombre Comercial, Razón Social | Mobile |
| RF-ONB-04 | NEGOCIO: **dos toggles independientes** — "Ofrece delivery" y "Entrega coordinando con cliente" | Mobile |
| RF-ONB-05 | Selección de categoría/subcategoría (jerarquía padre-hijo) | Mobile, Web |
| RF-ONB-06 | Subida de fotos del servicio (límite según plan) | Mobile, Web |
| RF-ONB-07 | Campos de ubicación (departamento/provincia/distrito) **vacíos** por defecto, rellenables manualmente | Mobile |
| RF-ONB-08 | Botón GPS / URL Google Maps que auto-completa ubicación vía reverse geocoding (Nominatim) | Mobile |
| RF-ONB-09 | 8 campos opcionales de redes sociales (website, instagram, tiktok, facebook, linkedin, twitterX, telegram, whatsappBiz) | Mobile, Web |
| RF-ONB-10 | Horario de atención editable (por día) para NEGOCIO | Mobile |
| RF-ONB-11 | Modal pre-registro: comparativa de planes y elección (Premium pago / Estándar gratis de bienvenida) | Mobile |
| RF-ONB-12 | Campo opcional "código de referido" en el registro | Mobile, Web |
| RF-ONB-13 | Un mismo usuario puede tener simultáneamente perfil OFICIO + NEGOCIO | Backend, Mobile |
| RF-ONB-14 | Re-registro tras rechazo con datos pre-llenados y banner explicativo | Mobile |

### 3.3 Catálogo y Búsqueda (Cliente)

| ID | Requisito | App |
|----|-----------|-----|
| RF-CAT-01 | Listado de proveedores paginado con caché Redis | Backend, Mobile, Web |
| RF-CAT-02 | 4 modos de vista de tarjeta: lista, detalles, mosaicos, contenido | Mobile |
| RF-CAT-03 | Filtros: categoría, disponibilidad, búsqueda por texto, tipo (OFICIO/NEGOCIO), verificados | Mobile, Web |
| RF-CAT-04 | Filtro de ubicación: GPS o selección manual dept/prov/dist | Mobile |
| RF-CAT-05 | "Ampliar zona de búsqueda" limpia **todo** el filtro de ubicación → resultados de todo el Perú | Mobile |
| RF-CAT-06 | Ordenamiento por prioridad de plan: PREMIUM → ESTÁNDAR → GRATIS | Backend |
| RF-CAT-07 | Detalle de proveedor con mapa (OpenStreetMap), galería, servicios, redes, reseñas | Mobile, Web |
| RF-CAT-08 | Tarjeta muestra ubicación: distrito (OFICIO); provincia, distrito + dirección (NEGOCIO) | Mobile |
| RF-CAT-09 | Chips de delivery / coordinación visibles en tarjeta de NEGOCIO | Mobile |
| RF-CAT-10 | Detección de tarjeta propia: oculta WhatsApp/Llamar, muestra "Ir a mi panel" | Mobile |
| RF-CAT-11 | Foto de servicio/producto visible en la tarjeta + dialog flotante de detalle al tocar | Mobile |
| RF-CAT-12 | Tracking de eventos: clic WhatsApp, clic llamada, vista de perfil | Backend |
| RF-CAT-13 | URL pública compartible (vanity slug) por proveedor | Backend, Web |

### 3.4 Reseñas y Recomendaciones

| ID | Requisito | App |
|----|-----------|-----|
| RF-REV-01 | Crear reseña con calificación 1-5, comentario y foto de evidencia obligatoria | Mobile, Backend |
| RF-REV-02 | Validación anti-fraude: GPS (≤500m del negocio) o código QR del proveedor | Mobile, Backend |
| RF-REV-03 | Una reseña por usuario por proveedor; reseña editable | Backend |
| RF-REV-04 | Respuestas a reseñas (hilo) con autorización revisor+proveedor | Mobile, Backend |
| RF-REV-05 | Recomendación rápida (post-reseña), contador en tarjetas | Mobile, Backend |
| RF-REV-06 | Moderación de reseñas (ocultar/mostrar) desde el panel admin | Admin |

### 3.5 Panel del Proveedor

| ID | Requisito | App |
|----|-----------|-----|
| RF-PAN-01 | Panel con tabs: Inicio, Perfil, Oportunidades, Servicios, Estadísticas, Mensajes, Ajustes | Mobile, Web |
| RF-PAN-02 | Inicio: KPIs (favoritos, reseñas, calificación, visitas) | Mobile, Web |
| RF-PAN-03 | Edición de perfil, fotos, horario, redes sociales, disponibilidad | Mobile, Web |
| RF-PAN-04 | CRUD de servicios/productos con foto opcional (según plan) | Mobile, Web |
| RF-PAN-05 | Publicar / editar / eliminar ofertas; editar permite reiniciar la vigencia | Mobile, Backend |
| RF-PAN-06 | Estadísticas y analytics gateadas por plan (GRATIS ve upsell) | Mobile, Web |
| RF-PAN-07 | Inbox de mensajes independiente por rol/perfil (cliente / OFICIO / NEGOCIO) | Mobile, Web |
| RF-PAN-08 | Bandeja de notificaciones persistida + tiempo real | Mobile, Web |
| RF-PAN-09 | Eliminación del propio perfil de proveedor en cascada | Mobile, Backend |
| RF-PAN-10 | Pausar/reanudar perfil | Mobile |
| RF-PAN-11 | Tutorial guiado (coach marks / showcase) para usuarios nuevos | Mobile |

### 3.6 Planes y Pagos

| ID | Requisito | App |
|----|-----------|-----|
| RF-PAG-01 | Todo proveedor nuevo recibe plan Estándar gratis 1 mes (estado GRACIA) | Backend |
| RF-PAG-02 | Selector de planes con features y precio (Estándar S/19.90, Premium S/39.90) | Mobile |
| RF-PAG-03 | Pago con **MercadoPago Checkout Pro** (incluye tarjeta, PagoEfectivo, Yape) | Mobile, Backend |
| RF-PAG-04 | Pago con **Yape**: subida de comprobante + código de verificación, aprobación manual del admin | Mobile, Admin, Backend |
| RF-PAG-05 | Webhook de MercadoPago con verificación de firma HMAC | Backend |
| RF-PAG-06 | Solicitudes de plan (PlanRequest) con aprobación/rechazo del admin | Admin, Backend |
| RF-PAG-07 | Cancelar plan vigente (válido en estado ACTIVA o GRACIA) | Mobile, Backend |
| RF-PAG-08 | Historial de pagos del proveedor | Mobile |
| RF-PAG-09 | Límites por plan — fotos 3/6/10, servicios 1/6/∞, productos 3/6/∞, ofertas 1/4/8 | Backend, Mobile |
| RF-PAG-10 | Período de gracia y vencimiento de suscripción con auditoría (SubscriptionAuditLog) | Backend |

### 3.7 Sistema de Subastas (ConfiServ)

| ID | Requisito | App |
|----|-----------|-----|
| RF-SUB-01 | Cliente publica una solicitud (categoría, descripción, foto, presupuesto, fecha, GPS) | Mobile, Backend |
| RF-SUB-02 | Notificación WebSocket a proveedores de la categoría | Backend |
| RF-SUB-03 | Tablón "Oportunidades" con distancia (Haversine), countdown, progreso | Mobile |
| RF-SUB-04 | Proveedor postula con precio + mensaje (máx 5 ofertas por solicitud) | Mobile, Backend |
| RF-SUB-05 | Cliente compara ofertas y acepta (transacción atómica: 1 ACCEPTED, resto REJECTED) | Mobile, Backend |
| RF-SUB-06 | Solo proveedores con rating ≥3.0 o sello de confianza participan | Backend |
| RF-SUB-07 | Expiración a 24h; penalización anti-arrepentimiento (3 sin elegir → bloqueo 7 días) | Backend |
| RF-SUB-08 | Proveedor marca "Ya llegué" con coordenadas GPS validadas | Mobile, Backend |

### 3.8 Chat / Mensajería

| ID | Requisito | App |
|----|-----------|-----|
| RF-CHAT-01 | Chat 1-a-1 cliente ↔ proveedor, sala creada al primer mensaje (idempotente) | Mobile, Backend |
| RF-CHAT-02 | Mensajes en tiempo real vía WebSocket | Mobile, Web, Backend |
| RF-CHAT-03 | Header del chat con nombre y foto del interlocutor | Mobile |
| RF-CHAT-04 | Notificación push "Tienes un nuevo mensaje de: X" con foto del remitente | Backend, Mobile |
| RF-CHAT-05 | Inbox separado por rol (cliente / OFICIO / NEGOCIO) para un user multi-perfil | Mobile, Backend |
| RF-CHAT-06 | Estado de mensaje (enviado/leído) y conteo de no leídos | Backend, Mobile |
| RF-CHAT-07 | Retención de mensajes 15 días (purga automática) | Backend |
| RF-CHAT-08 | Guard anti doble-apertura de chat al tocar varias veces | Mobile |

### 3.9 Ofertas / Promociones

| ID | Requisito | App |
|----|-----------|-----|
| RF-OFE-01 | Listado público de ofertas con filtro por tipo y categorías | Mobile, Web |
| RF-OFE-02 | Detalle de oferta con CTA "Ver negocio/perfil" → tarjeta del proveedor | Mobile |
| RF-OFE-03 | Si la oferta es propia: opciones "Ir a mi panel" / ocultar-mostrar | Mobile |
| RF-OFE-04 | Ocultar las ofertas propias del listado público (persistido localmente) | Mobile |
| RF-OFE-05 | Reportar ofertas inapropiadas | Mobile, Backend |
| RF-OFE-06 | Foto de la oferta visible en panel y listado | Mobile |

### 3.10 Favoritos y Notificaciones

| ID | Requisito | App |
|----|-----------|-----|
| RF-NOT-01 | Guardar/quitar proveedores favoritos; contador visible en el panel del proveedor | Mobile, Backend |
| RF-NOT-02 | Notificaciones de eventos: aprobación, rechazo, plan, reseña, chat, trust, referido | Backend |
| RF-NOT-03 | Notificaciones en tiempo real (WebSocket) + push (FCM) + persistidas | Backend, Mobile |
| RF-NOT-04 | Notificación de aprobación unificada (un solo mensaje, sin duplicados) | Backend |

### 3.11 Confianza / Verificación

| ID | Requisito | App |
|----|-----------|-----|
| RF-TRU-01 | Formulario de validación de identidad (DNI/RUC) con fotos cámara-only | Mobile, Backend |
| RF-TRU-02 | Cola de verificación documental para el admin | Admin |
| RF-TRU-03 | Aprobar/rechazar con motivo; badge "Confiable" tras aprobación | Admin, Backend |
| RF-TRU-04 | Al aprobar trust → dialog de éxito en tiempo real sobre cualquier pantalla + push | Mobile, Backend |
| RF-TRU-05 | Verificación de proveedor (cola separada): aprobar, rechazar, pedir más info, revocar | Admin, Backend |

### 3.12 Referidos y Monedas

| ID | Requisito | App |
|----|-----------|-----|
| RF-REF-01 | Código de referido único por usuario (8 caracteres) | Backend |
| RF-REF-02 | Aplicar código de otro al registrarse | Mobile, Web, Backend |
| RF-REF-03 | Al aprobar al invitado: 50 monedas al inviter, 5 al invitado | Backend |
| RF-REF-04 | Contador de monedas en header de la pantalla principal, actualizado en vivo | Mobile |
| RF-REF-05 | Canje de monedas: 500 = Plan Estándar 1 mes, 1000 = Premium 2 meses | Backend |
| RF-REF-06 | Recompensas canjeables creadas por proveedores aprobados | Backend, Admin |
| RF-REF-07 | Pantalla de referidos: Mi código / Ganar monedas / Historial | Mobile, Web |

### 3.13 Panel de Administración

| ID | Requisito | App |
|----|-----------|-----|
| RF-ADM-01 | Dashboard con métricas, vista materializada (admin_dashboard_stats) y refresh manual | Admin, Backend |
| RF-ADM-02 | CRUD de proveedores con creación manual (incluye fotos) | Admin |
| RF-ADM-03 | Gestión de usuarios: listar, filtrar, activar/desactivar | Admin |
| RF-ADM-04 | Eliminar usuario en cascada (borra perfiles, reseñas, chats…) con **motivo**; el user recibe dialog en tiempo real + logout forzado | Admin, Backend, Mobile |
| RF-ADM-05 | Eliminar perfil de proveedor con motivo y notificación en tiempo real | Admin, Backend |
| RF-ADM-06 | Cola de verificación y de validación de confianza | Admin |
| RF-ADM-07 | Solicitudes de plan y pagos Yape (aprobar/rechazar) | Admin |
| RF-ADM-08 | Moderación de reseñas y reportes (de proveedores, de ofertas, de plataforma) | Admin |
| RF-ADM-09 | CRUD de categorías y de localidades (soft-delete) | Admin |
| RF-ADM-10 | Analytics estratégico: 13 KPIs, gráficas (line, pie, bar), funnel, top-10 | Admin |
| RF-ADM-11 | Mapa de calor de usuarios por ciudad (geo-stats vía IP) | Admin |
| RF-ADM-12 | Exportar reportes CSV (usuarios, proveedores) y Excel | Admin |
| RF-ADM-13 | Panel en tiempo real: socket.io, toasts live, badge de pendientes | Admin |
| RF-ADM-14 | CRUD de recompensas con ProviderPicker (solo aprobados) | Admin |
| RF-ADM-15 | Panel completamente responsivo en dispositivos móviles | Admin |

### 3.14 Web (Landing + Panel Web)

| ID | Requisito | App |
|----|-----------|-----|
| RF-WEB-01 | Landing pública: hero, beneficios, cómo funciona, FAQ, testimonios, showcase de proveedores | Web |
| RF-WEB-02 | Vista pública de perfil de proveedor por slug (`/p/[slug]`) | Web |
| RF-WEB-03 | Login y panel web del proveedor (ajustes, estadísticas, mensajes, ofertas, perfil, referidos, servicios) | Web |
| RF-WEB-04 | Flujo de pago Yape con modal + páginas de resultado (success/pending/failure) | Web |
| RF-WEB-05 | Manual de usuario y modales legales (privacidad, T&C) | Web |
| RF-WEB-06 | Banner y panel de referidos | Web |

---

## 4. Requisitos No Funcionales (RNF)

### 4.1 Seguridad
- **RNF-SEG-01**: Contraseñas hasheadas con bcrypt.
- **RNF-SEG-02**: Autenticación JWT con access token corto (8h) + refresh token (7d).
- **RNF-SEG-03**: Guards de roles (USUARIO / PROVEEDOR / ADMIN) en endpoints sensibles.
- **RNF-SEG-04**: `userId` siempre derivado del JWT, nunca del body (anti-IDOR) — reseñas, respuestas, chat.
- **RNF-SEG-05**: ValidationPipe con whitelist en todos los DTOs (class-validator).
- **RNF-SEG-06**: Rate limiting con `@nestjs/throttler`.
- **RNF-SEG-07**: Helmet para cabeceras HTTP seguras.
- **RNF-SEG-08**: Verificación de firma HMAC en el webhook de MercadoPago.
- **RNF-SEG-09**: OAuth TikTok con PKCE (code_challenge SHA-256) y guard de `state` anti-CSRF.
- **RNF-SEG-10**: Tokens JWT en `flutter_secure_storage` (mobile) y cookies/headers seguros (web).
- **RNF-SEG-11**: Registro no persiste en BD hasta verificar OTP (reduce cuentas basura).
- **RNF-SEG-12**: Validación anti-fraude en reseñas (GPS ≤500m o QR).
- **RNF-SEG-13**: Auditoría de cambios de suscripción atribuida al actor (user/admin/sistema).

### 4.2 Rendimiento
- **RNF-PERF-01**: Caché Redis del listado de proveedores (TTL 30s) y categorías (TTL 10min).
- **RNF-PERF-02**: Vista materializada `admin_dashboard_stats` (~10x más rápida que aggregates ad-hoc).
- **RNF-PERF-03**: Índices DB en columnas de filtrado frecuente (providerId, status, isActive, etc.).
- **RNF-PERF-04**: Paginación en todos los listados grandes.
- **RNF-PERF-05**: Geocoding inverso cacheado en memoria (celda ~111m).
- **RNF-PERF-06**: Compresión gzip de respuestas HTTP.
- **RNF-PERF-07**: Imágenes con caché (`cached_network_image`) y skeleton loading (shimmer).
- **RNF-PERF-08**: Login con Google optimizado (sin signOut previo innecesario).
- **RNF-PERF-09**: Adapter-pg de Prisma 7 para pool de conexiones eficiente.

### 4.3 Disponibilidad y Escalabilidad
- **RNF-DISP-01**: Backend desplegado en Render; BD en Supabase (PostgreSQL gestionado).
- **RNF-DISP-02**: Backend escucha en 0.0.0.0 (acceso desde LAN/producción).
- **RNF-DISP-03**: Redis gestionado en Upstash (serverless).
- **RNF-DISP-04**: Storage en Cloudflare R2 (S3-compatible, alta disponibilidad).
- **RNF-DISP-05**: Push notifications fuera del request crítico (Promise.allSettled, no bloquean la API).
- **RNF-DISP-06**: Backend monolito modular — separable a microservicios si escala.

### 4.4 Usabilidad / UX
- **RNF-UX-01**: UI en español latinoamericano (es-419), incluyendo date pickers del sistema.
- **RNF-UX-02**: Soporte de tema claro/oscuro (mobile).
- **RNF-UX-03**: Panel admin 100% responsivo (capa CSS con breakpoints).
- **RNF-UX-04**: Feedback inmediato en acciones: spinners, snackbars, toasts.
- **RNF-UX-05**: Tutorial guiado (coach marks) para usuarios nuevos.
- **RNF-UX-06**: Guards anti doble-acción (debounce) en formularios críticos.
- **RNF-UX-07**: Dialogs bloqueantes (PopScope) para eventos críticos (cuenta eliminada).
- **RNF-UX-08**: Eventos en tiempo real reflejados sin recargar (sockets).

### 4.5 Mantenibilidad
- **RNF-MANT-01**: Mobile con arquitectura Feature-First + Clean Architecture (data/domain/presentation).
- **RNF-MANT-02**: Backend monolito modular, un módulo NestJS por dominio.
- **RNF-MANT-03**: TypeScript ESM estricto — imports locales con extensión `.js`.
- **RNF-MANT-04**: Modelos con codegen (`json_serializable` en Flutter, Prisma Client en backend).
- **RNF-MANT-05**: Fuente única de verdad para límites de plan (`plan_limits.dart` / `PLAN_LIMITS`).
- **RNF-MANT-06**: Comentarios explican el *por qué* (decisiones, bugs previos), no el *qué*.

### 4.6 Observabilidad
- **RNF-OBS-01**: Sentry integrado en backend y admin (errores + profiling).
- **RNF-OBS-02**: Logs estructurados con el Logger de NestJS.
- **RNF-OBS-03**: Panel admin con métricas operacionales en vivo.

### 4.7 Compatibilidad
- **RNF-COMP-01**: Mobile compila para Android, iOS y Web (Chrome).
- **RNF-COMP-02**: Admin y Web son responsivos (desktop + móvil).
- **RNF-COMP-03**: Mapas con OpenStreetMap (sin dependencia de Google Maps API).

### 4.8 Limitaciones conocidas (deuda técnica)
- Migraciones Prisma con Supabase requieren flujo manual (`migrate diff` + `migrate deploy`) — no `migrate dev` (sin shadow DB).
- Sin CI/CD automatizado.
- Sin suite de tests unitarios relevante.
- Persistencia de notificaciones de chat en BD a través de reinicios pendiente (requiere migración del enum + tabla per-user).
- Cron de expiración de subastas depende de scheduler externo o `@Cron`.

---

## 5. Modelo de Datos (PostgreSQL 16 + PostGIS)

**ORM**: Prisma 7 — `backend/prisma/schema.prisma`

### Entidades principales

| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios (USUARIO/PROVEEDOR/ADMIN), `coins`, ubicación, fcmToken |
| `Provider` | Perfil de servicio (OFICIO/NEGOCIO), un user puede tener ambos |
| `ProviderImage` | Galería de fotos del proveedor |
| `ProviderCategory` | Relación N-M proveedor ↔ categoría (máx 7) |
| `Category` | Categorías con jerarquía padre-hijo |
| `Locality` | Catálogo de ubicaciones (departamento/provincia/distrito) |
| `Subscription` | Plan activo: GRATIS/BASICO/ESTANDAR/PREMIUM |
| `SubscriptionAuditLog` | Auditoría de cambios de suscripción |
| `Payment` | Historial de pagos por suscripción |
| `PlanRequest` | Solicitudes de upgrade de plan |
| `YapePayment` | Pagos por Yape con comprobante y código |
| `Review` | Reseñas (rating 1-5, foto, validación GPS/QR) |
| `ReviewReply` | Respuestas a reseñas (hilo) |
| `Recommendation` | Recomendaciones de usuario a proveedor |
| `Favorite` | Favoritos del usuario |
| `VerificationDoc` | Documentos para verificación |
| `TrustValidationRequest` | Validación de confianza (DNI/RUC + fotos) |
| `ProviderAnalytic` | Eventos: whatsapp_click, call_click, profile_view |
| `AdminNotification` | Notificaciones persistidas al proveedor |
| `ProviderReport` | Reportes de clientes sobre proveedores |
| `PlatformIssue` | Problemas reportados desde la app |
| `ServiceRequest` | Solicitud de subasta publicada por el cliente |
| `Offer` | Oferta de un proveedor a una solicitud |
| `UserPenalty` | Penalización anti-arrepentimiento de subastas |
| `ChatRoom` / `ChatMessage` | Salas y mensajes de chat |
| `OfferPost` / `OfferPostCategory` / `OfferReport` | Ofertas/promociones publicadas |
| `ReferralCode` / `Referral` | Códigos e invitaciones de referido |
| `ReferralReward` / `CoinRedemption` | Recompensas y canjes de monedas |
| `OtpCode` / `RefreshToken` | OTP temporales y sesiones activas |

### Enums clave
- `UserRole`: USUARIO, PROVEEDOR, ADMIN
- `ProviderType`: OFICIO, NEGOCIO
- `SubscriptionPlan`: GRATIS, BASICO, ESTANDAR, PREMIUM
- `SubscriptionStatus`: ACTIVA, VENCIDA, CANCELADA, GRACIA
- `AvailabilityStatus`: DISPONIBLE, OCUPADO, CON_DEMORA
- `VerificationStatus`: PENDIENTE, APROBADO, RECHAZADO
- `TrustStatus`: NONE, PENDING, APPROVED, REJECTED
- `NotificationType`: APROBADO, RECHAZADO, MAS_INFO, VERIFICACION_REVOCADA, PLAN_SOLICITADO, PLAN_APROBADO, PLAN_RECHAZADO
- `ServiceRequestStatus`: OPEN, CLOSED, EXPIRED, CANCELLED
- `OfferStatus`: PENDING, ACCEPTED, REJECTED, WITHDRAWN
- `YapePaymentStatus`: PENDING, APPROVED, REJECTED
- `ReferralStatus`: PENDING, APPROVED, REJECTED
- `RedemptionStatus`: PENDING, COMPLETED, CANCELLED
- `MessageStatus`: SENT, READ

---

## 6. Backend — Módulos y Endpoints

**Stack**: NestJS 11, TypeScript ESM, Prisma 7 + adapter-pg, Socket.io,
JWT/Passport, class-validator, Sentry, Firebase Admin, Brevo (email).

### Módulos
`auth`, `users`, `providers`, `provider-profile`, `reviews`,
`favorites`, `admin`, `events` (WebSocket), `trust-validation`,
`subastas`, `chat`, `offer-posts`, `payments` (+ `mercadopago`),
`referrals`, `localities`, `email`, `firebase`, `common`.

### Endpoints por módulo (resumen)

| Módulo | Endpoints |
|--------|-----------|
| `auth` | POST /register, /register/provider, /login, /refresh, /forgot-password, /reset-password, /send-otp, /verify-otp, /resend-otp; GET /me |
| `users` | GET/PATCH /users/me, PATCH /users/profile-picture, device-token |
| `providers` | GET /providers, /providers/categories, /providers/:id, POST /providers/:id/track; GET /p/:slug (público) |
| `provider-profile` | GET/PATCH /provider-profile/me, availability, analytics, images, notifications, plan-request; DELETE /provider-profile/me |
| `reviews` | POST /reviews, GET /reviews/provider/:id, PATCH /reviews/:id, /:id/moderate, replies, QR; POST /upload/* |
| `favorites` | POST/GET /favorites |
| `chat` | POST /chat/rooms, /chat/messages, GET /chat/rooms/mine, /rooms/:id/messages, PATCH read |
| `offer-posts` | GET /offers, POST/PATCH/DELETE /providers/me/offers, /offers/:id/report, /admin/offers, /admin/offer-reports |
| `payments` | Yape (submit/list/approve/reject), MercadoPago (create-preference, webhook), cancelPlan |
| `subastas` | POST /requests, GET /requests/mine, /opportunities, POST /offers, accept, arrived, DELETE /offers/:id |
| `trust-validation` | POST submit, GET admin list/detail, PATCH approve/reject |
| `referrals` | GET my-code/my-stats/rewards/redemptions, POST apply/redeem, admin stats + CRUD rewards |
| `localities` | GET público + CRUD admin |
| `admin` | CRUD providers/users/categories, verificación, plan-requests, notifications, reports, métricas, geo-stats, dashboard/stats |

### Eventos WebSocket
`notification`, `newChatMessage`, `userDeactivated`, `adminEvent`,
`subastaNew`, `providerStatusChanged`.

---

## 7. Mobile — Estructura (Flutter 3.11 / Dart 3)

**Arquitectura**: Feature-First Clean Architecture, Provider
(ChangeNotifier), go_router con StatefulShellRoute (5 tabs).

### Features
`auth`, `providers_list`, `favorites`, `notifications`,
`provider_dashboard`, `subastas`, `trust_validation`, `chat`,
`offer_posts`, `payments`, `referrals`, `localities`, `showcase`.

### Packages clave

| Paquete | Uso |
|---------|-----|
| provider | State management |
| dio / http | HTTP client |
| go_router | Navegación declarativa |
| socket_io_client | Tiempo real |
| flutter_secure_storage | Tokens JWT |
| shared_preferences | Preferencias / flags locales |
| firebase_core/auth/messaging | Auth social + push |
| google_sign_in / flutter_facebook_auth | Login social |
| flutter_web_auth_2 / crypto | OAuth TikTok (PKCE) |
| flutter_map / latlong2 | Mapas OSM |
| geolocator / permission_handler | GPS y permisos |
| image_picker / cached_network_image / photo_view | Imágenes |
| flutter_rating_bar | Reseñas |
| showcaseview | Tutorial coach marks |
| share_plus | Compartir vanity URL |
| flutter_localizations | UI es-419 |
| shimmer | Skeleton loading |

---

## 8. Admin — Estructura (Next.js 16 / React 19)

**Páginas**: `/` (dashboard), `/analytics`, `/users-geo`, `/reports`,
`/marketplace` (offers, chats), `/management` (proveedores+usuarios),
`/categories`, `/reviews`, `/operations` (queue, payments),
`/notifications`, `/providers`, `/users`, `/verification`,
`/trust-validation`, `/plan-requests`, `/yape-payments`,
`/referrals`, `/rewards`, `/p/[slug]`, `/login`.

**Packages**: next 16, react 19, tailwindcss 3, recharts, lucide-react,
sonner, @radix-ui/*, exceljs, date-fns, socket.io-client, Sentry.

**Características**: panel en tiempo real (hook `use-admin-realtime`),
13 KPIs, gráficas, exportación Excel/CSV, diseño dark, **responsivo
completo en móvil**.

---

## 9. Web — Estructura (Next.js 15 / React 19)

**Rutas**:
- `/` — landing pública (hero, beneficios, FAQ, testimonios, showcase).
- `/p/[slug]` — perfil público de proveedor.
- `/login` — autenticación.
- `/cliente` — área del cliente.
- `/panel` — panel web del proveedor: `ajustes`, `estadisticas`,
  `mensajes`, `ofertas`, `perfil`, `referidos`, `servicios`.
- `/payments` — flujo Yape: `success`, `pending`, `failure`.
- `/privacidad` — legal.

**Packages**: next 15, react 19, tailwindcss 3, framer-motion,
recharts, socket.io-client, sonner, zod, date-fns.

**Características**: landing animada (framer-motion), panel web del
proveedor, flujo de pago Yape, manual de usuario, modales legales.

---

## 10. Infraestructura

### Desarrollo local (Docker Compose)

| Servicio | Imagen | Puerto |
|----------|--------|--------|
| postgres | postgis/postgis:16-3.4 | 5432 |
| redis | redis:7.2-alpine | 6379 |
| minio | minio/minio:latest | 9000/9001 |

### Producción
- **Backend**: Render.
- **Base de datos**: Supabase (PostgreSQL gestionado).
- **Cache**: Upstash Redis (serverless).
- **Storage**: Cloudflare R2 (S3-compatible).
- **Push / Auth social**: Firebase (FCM + Auth).
- **Email**: Brevo (transaccional — OTP, recuperación de contraseña).
- **Pagos**: MercadoPago Checkout Pro + Yape (manual).

### Variables de entorno (backend `.env`)
```
DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN
JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS
MINIO_ENDPOINT, MINIO_PORT, MINIO_USE_SSL,
MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME
BREVO_API_KEY, EMAIL_FROM
GOOGLE_APPLICATION_CREDENTIALS
MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_PUBLIC_KEY, MERCADOPAGO_WEBHOOK_SECRET
SENTRY_DSN, PORT, NODE_ENV, API_BASE_URL, ALLOWED_ORIGINS
```

---

## 11. Cómo Ejecutar

```bash
# 1. Infraestructura local
docker-compose up -d

# 2. Backend (puerto 3000)
cd backend && npm install && npm run start:dev

# 3. Admin (puerto 3001)
cd admin && npm install && npm run dev

# 4. Web (puerto 3002)
cd web && npm install && npm run dev

# 5. Mobile (Chrome)
cd mobile && flutter pub get && flutter run -d chrome
```

### Migraciones Prisma con Supabase
`migrate dev` no funciona (sin shadow DB). Flujo correcto:
```bash
# Apuntar a la URL DIRECTA de Supabase (puerto 5432, sin pgbouncer)
npx prisma migrate diff --from-url $DATABASE_URL \
  --to-schema-datamodel ./prisma/schema.prisma --script > migration.sql
npx prisma migrate deploy
npx prisma generate
```

---

## 12. Roadmap

### Tier 1 — Inmediatos
1. Configurar `@Cron` para expiración de subastas.
2. Persistencia en BD de notificaciones de chat (enum + tabla per-user).
3. Migrar login Google a OAuth2 browser flow si se desea consentimiento explícito.

### Tier 2 — Producción
4. CI/CD con GitHub Actions (lint + build + deploy).
5. Suite de tests unitarios y e2e.
6. Dominio propio + HTTPS gestionado.

### Tier 3 — Roadmap producto
7. Chatbot IA de recomendación.
8. App nativa publicada en Play Store / App Store.
9. Más métodos de pago y facturación electrónica.

---

## 13. Historial de Hitos

| Hito | Qué incluye |
|------|-------------|
| 0-1 | Docker, Prisma, JWT, AuthProvider, SecureStorage |
| 2-3 | ServiceCard, listado, filtros, caché Redis, detalle con mapa |
| 4-5 | Reseñas GPS+QR, panel admin, dashboard, moderación |
| 5.5-5.9 | Feature-First, panel proveedor 5 tabs, fix multicuenta, NEGOCIO diferenciado, suscripciones |
| 6.0-6.8 | Íconos SVG, panel real-time, tarjeta propia, recomendaciones, permisos, respuestas a reseñas, prioridad de plan, reportes, sistema de confianza |
| 7.0-7.4 | Auditoría admin, registro sin BD hasta OTP, modales legales, límites por plan, comparativa de planes |
| 8.0-8.1 | Subasta ConfiServ, 23 observaciones post-despliegue |
| 9.0 | Sistema de referidos y monedas |
| 9.x | Chat con inboxes por rol, pagos MercadoPago + Yape, panel admin responsivo, integración FCM, 2 rondas de correcciones post-prueba (29 observaciones) |
```
