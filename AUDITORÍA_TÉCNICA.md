# Auditoría Técnica de OficioApp

**Fecha**: 2026-04-27
**Versión del sistema**: Hito 8.1+ (post FCM + Geocodificación Nominatim)
**Alcance**: backend NestJS, app Flutter, panel Next.js
**Auditor**: Revisión estática de código + dependencias + configuración (sin acceso a runtime de producción)
**Propósito**: Documentar hallazgos de Seguridad, Rendimiento, Mantenibilidad y Escalabilidad. **No se aplicaron correcciones.**

---

## 🔴 Críticos

### [Seguridad] Credenciales reales de Cloudflare R2 commiteadas en `backend/.env.example`
- **Archivo**: [backend/.env.example:30-31](backend/.env.example#L30-L31)
- **Descripción**: `MINIO_ACCESS_KEY=2b8c1ab623fa9ee4edab69702ea9ccdb` y `MINIO_SECRET_KEY=607632ba3800a647d5f9050e257770531d9cf04accff5330ab4b270ce0925149` están escritos en plano. El archivo está versionado en git (`git ls-files backend/.env.example` lo confirma) y los valores son idénticos a los del `.env` real de producción. Adicionalmente, `firebase-service-account.json` está correctamente ignorado pero coexiste en el directorio.
- **Riesgo**: Cualquier persona con acceso al repo puede leer/escribir/borrar el bucket de R2 (galería de proveedores, documentos de verificación, fotos de reseñas, vouchers de Yape). Atacantes con clonado del repo pueden subir contenido malicioso o exfiltrar PII.
- **Sugerencia**: 1) Rotar **inmediatamente** el access key de R2 desde el dashboard de Cloudflare. 2) Reescribir el historial de git con `git filter-repo` para purgar las credenciales. 3) Reemplazar valores por placeholders (`MINIO_ACCESS_KEY=tu_access_key`). 4) Añadir `gitleaks` o `trufflehog` como hook pre-commit.

### [Seguridad] OTP codes y reset tokens loggeados a consola sin gate de producción
- **Archivo**: [backend/src/auth/auth.service.ts:84-87](backend/src/auth/auth.service.ts#L84-L87) y [backend/src/auth/auth.service.ts:511-514](backend/src/auth/auth.service.ts#L511-L514)
- **Descripción**: Antes del check `if (this.config.get('NODE_ENV') !== 'production')` (línea 89), un bloque incondicional imprime el código OTP y `pendingId`: `console.log('🔥 OTP para ${data.email}: ${otpCode}')`. El comentario en línea 83 declara explícitamente "siempre visible en logs del servidor". Lo mismo en `resendPendingOtp` (515).
- **Riesgo**: Render, Sentry, Datadog y cualquier sistema de log shipping recibirán los OTPs en plano. Un atacante con acceso de lectura a logs puede saltarse el factor de verificación por email — vector directo a takeover de cuentas durante registro o reseteo de contraseña.
- **Sugerencia**: Envolver los `console.log` en `if (this.config.get('NODE_ENV') !== 'production')`. Mejor aún: usar el `Logger` de NestJS con nivel `debug` y configurar el nivel mínimo a `warn` en producción.

### [Seguridad] CORS abierto en producción — `origin: true`
- **Archivo**: [backend/src/main.ts:34-37](backend/src/main.ts#L34-L37)
- **Descripción**: Las líneas 27-32 calculan `allowedOrigins` correctamente desde `process.env.ALLOWED_ORIGINS`, pero la llamada `app.enableCors({ origin: true, credentials: true })` ignora el cálculo y refleja `Access-Control-Allow-Origin` con cualquier origen entrante. El comentario en la línea 35 confirma "permite cualquier origen en desarrollo y producción".
- **Riesgo**: Combinado con `credentials: true`, cualquier sitio web puede hacer requests autenticadas en nombre del usuario si su navegador tiene cookies/JWT. Vector clásico de CSRF cross-origin contra `/auth/*` y endpoints autenticados.
- **Sugerencia**: Reemplazar por `app.enableCors({ origin: allowedOrigins, credentials: true })`. En desarrollo `allowedOrigins` ya es `true`; en producción usará la lista del `.env`.

### [Seguridad] WebSocket sin autenticación + eventos admin broadcast a todos los clientes
- **Archivo**: [backend/src/events/events.gateway.ts:16-71](backend/src/events/events.gateway.ts#L16-L71)
- **Descripción**: El gateway tiene `cors: { origin: '*' }` y NO valida JWT en `handleConnection`. Cualquier cliente sin autenticar puede conectarse, ejecutar `socket.emit('joinRoom', { userId: 999 })` y recibir notificaciones dirigidas a otro usuario. Peor aún, `emitAdminEvent` (línea 71) usa `this.server.emit(...)` que es broadcast — clientes no-ADMIN pueden suscribirse al canal `adminEvent` y leer eventos como `NEW_PROVIDER`, `NEW_PLAN_REQUEST`, `NEW_YAPE_PAYMENT` con datos de negocio.
- **Riesgo**: Fuga de información administrativa (montos, emails, datos de pagos pendientes). Falsificación de notificaciones a usuarios (suplantación de admin).
- **Sugerencia**: 1) Implementar `OnGatewayConnection` que valide el JWT pasado en `socket.handshake.auth.token` o query string y rechace conexiones inválidas. 2) Para `emitAdminEvent`, usar `this.server.to('admin').emit(...)` y unir solo a sockets con role=ADMIN al room `admin` tras validación. 3) Restringir `cors.origin` a la lista de orígenes permitidos.

### [Seguridad] JWT_REFRESH_SECRET débil — texto plano legible
- **Archivo**: [backend/.env:7](backend/.env#L7)
- **Descripción**: `JWT_REFRESH_SECRET="otro_secreto_para_refresh_token_2025"` — 38 caracteres ASCII legibles, baja entropía. El `.env.example` recomienda 64 chars hex aleatorios pero el `.env` no lo cumple. `JWT_SECRET` sí está bien (128 chars hex).
- **Riesgo**: Un atacante puede falsificar refresh tokens válidos por fuerza bruta o adivinación de patrón. Acceso permanente a cuentas.
- **Sugerencia**: Generar nuevo secreto con `openssl rand -hex 64` y rotar en Render. Tras rotar, todos los refresh tokens existentes quedarán invalidados (efecto colateral aceptable: usuarios re-logean).

### [Seguridad] Vulnerabilidades críticas en `firebase-admin` y dependencias transitivas
- **Archivo**: `backend/package.json` (firebase-admin actual: <13.8.0)
- **Descripción**: `npm audit` reporta **15 vulnerabilidades** (2 low, 5 moderate, 3 high, 5 critical). Las más graves:
  - `@google-cloud/firestore <6.1.0` — **critical** (logging de claves del SDK)
  - `@grpc/proto-loader <=0.6.13` — **critical** (vía protobufjs prototype pollution)
  - `dicer` (parser multipart) — **high** (DoS por crash en HeaderParser)
  - `protobufjs`, `jsonwebtoken` antiguos — vulnerables vía `firebase-admin`
- **Riesgo**: DoS al backend mediante requests maliciosos a endpoints multipart (`/upload/*`, `/users/profile-picture`). Pollution de prototype con potencial RCE.
- **Sugerencia**: `npm install firebase-admin@13.8.0` (semver major). Probar `social-login`, `verifyIdToken` y push notifications después del upgrade. Es el fix recomendado por `npm audit`.

---

## 🟠 Alta

### [Seguridad] Sin `helmet` — headers HTTP de seguridad ausentes
- **Archivo**: [backend/src/main.ts](backend/src/main.ts) (no instalado en `package.json`)
- **Descripción**: No se carga `helmet()` ni middleware equivalente. Sin `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy`.
- **Riesgo**: Clickjacking, MIME sniffing, downgrade a HTTP, fugas vía Referrer.
- **Sugerencia**: `npm i helmet` y añadir `app.use(helmet())` después de `NestFactory.create`. Configurar CSP coherente con uploads de R2.

### [Seguridad] Rate limit insuficiente en endpoints `/auth/*`
- **Archivo**: [backend/src/auth/auth.controller.ts](backend/src/auth/auth.controller.ts) (sin decoradores `@Throttle`)
- **Descripción**: El throttler global aplica 60 requests/minuto a TODOS los endpoints. `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/social-login`, `/auth/send-otp`, `/auth/resend-otp`, `/auth/verify-otp` no tienen límites estrictos. En `providers.controller.ts:89,99` sí hay `@Throttle({ default: { ttl: 60000, limit: 10 } })`, demostrando que el patrón se conoce pero no se aplica donde más importa.
- **Riesgo**: Credential stuffing en login, enumeración de usuarios en forgot-password (si responde diferente para emails existentes/inexistentes), brute-force de OTP de 6 dígitos (1M combinaciones, factibles en minutos a 60 req/min).
- **Sugerencia**: Aplicar límites por endpoint:
  - `/auth/login`: 5/min (por IP) + lock progresivo por email tras 10 fallos
  - `/auth/register`, `/auth/social-login`: 5/min
  - `/auth/forgot-password`: 3/15min
  - `/auth/verify-otp`: 5/15min por `pendingId`
  - `/auth/send-otp`, `/auth/resend-otp`: 1/30s

### [Seguridad] Endpoint estático `/uploads/*` sin autenticación
- **Archivo**: [backend/src/main.ts:56-58](backend/src/main.ts#L56-L58)
- **Descripción**: `app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' })` expone públicamente la carpeta local. La carpeta contiene subdirectorios `clients/`, `providers/`, `payments/`, `trust-validation/`. Si en algún flujo se almacena localmente (no en R2) un documento de validación de confianza (DNI, RUC) o un voucher de Yape, queda accesible vía URL adivinable.
- **Riesgo**: Fuga de PII (DNI, RUC, fotos de boleta) si la URL del archivo se filtra o si los nombres son predecibles (uuid+nombre original).
- **Sugerencia**: 1) Eliminar el `useStaticAssets` ya que el flujo principal sube a R2. 2) Si se mantiene local en desarrollo, gatear con guard JWT y validación de propiedad. 3) Auditar `backend/uploads` para confirmar que no contiene documentos sensibles antes de migrar.

### [Seguridad] Vulnerabilidades altas en `admin/` — Next.js DoS y XSS en postcss
- **Archivo**: `admin/package.json`
- **Descripción**: `npm audit` reporta:
  - `next` ≥16.0.0-beta <16.2.3: **DoS con Server Components** (CVSS 7.5) — fix `next@16.2.4` (no breaking, semver minor).
  - `postcss` <8.5.10: **XSS en CSS Stringify** (moderate) — fix incluido en `next@16.2.4`.
  - `xlsx` <0.20.2: **Prototype Pollution + ReDoS** (high) — `fixAvailable: false`. Esto significa que el package en npm no tiene parche; hay que migrar a otra librería.
- **Riesgo**: DoS a SSR del panel admin; XSS si se renderiza CSS controlado por usuario; pollution si se procesan archivos xlsx del usuario.
- **Sugerencia**: 1) `npm i next@16.2.4 postcss@latest`. 2) Sustituir `xlsx` por `exceljs` (mantenido) o `papaparse` si solo es CSV. 3) Verificar que `xlsx` realmente se usa — si es para "Reportes CSV/JSON" puede no ser necesario.

### [Rendimiento] APK sin minificación ni recursos compactados
- **Archivo**: [mobile/android/app/build.gradle.kts:50-56](mobile/android/app/build.gradle.kts#L50-L56)
- **Descripción**: `release { isMinifyEnabled = false; isShrinkResources = false }`. Sin R8/ProGuard, el bytecode incluye nombres simbólicos y dead code. Sin `shrinkResources` los assets no usados (5.6 MB en `mobile/assets`, varios PNG de Yape pesados) viajan en el APK final.
- **Riesgo**: APK ~30-50% más grande de lo necesario (estimado ~80MB vs ~50MB), descarga lenta en redes peruanas 3G/2G, retención afectada. También facilita reverse engineering.
- **Sugerencia**: Activar ambos flags y añadir `proguard-rules.pro` con keep para clases reflectivas (Firebase, Hive si aplica). Verificar que las features de FCM y Firebase social login siguen funcionando en build release.

### [Mantenibilidad] Lazy loading ausente en panel Admin
- **Archivo**: [admin/app/](admin/app/) (búsqueda de `dynamic(()` retorna 0 matches)
- **Descripción**: Ninguna página usa `next/dynamic` para code splitting. Páginas grandes: `categories/page.tsx` (722 líneas), `analytics/page.tsx` (576 líneas con recharts), `page.tsx` dashboard (470 líneas). Todo el bundle (incluyendo recharts) se carga en cada navegación.
- **Riesgo**: Time to Interactive elevado, mala UX en conexiones lentas, costos de bandwidth en Vercel free tier.
- **Sugerencia**: Convertir componentes pesados a `dynamic(() => import('@/components/AnalyticsCharts'), { ssr: false })`. Especial atención a recharts en `analytics/`, formularios de `categories/`, modales de `trust-validation/[id]/`.

### [Rendimiento] Backend sin `compression` middleware
- **Archivo**: [backend/src/main.ts](backend/src/main.ts) (no instalado)
- **Descripción**: Sin gzip/brotli, los JSON grandes (listado de proveedores con includes anidados, dashboard metrics) viajan sin comprimir.
- **Riesgo**: Bandwidth elevado en Render free tier, latencia mayor en móviles 3G.
- **Sugerencia**: `npm i compression @types/compression` y `app.use(compression())` después de helmet. Render incluye Brotli a nivel de edge en planes pagos pero gzip en server siempre vale.

### [Rendimiento] Throttler in-memory — incompatible con múltiples instancias
- **Archivo**: [backend/src/app.module.ts:32-35](backend/src/app.module.ts#L32-L35)
- **Descripción**: `ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])` usa storage en memoria por defecto. Si Render escala a 2 instancias, cada una mantiene su propio contador → un atacante puede hacer 60×N requests/min.
- **Riesgo**: Bypass de rate limit cuando se escala horizontalmente.
- **Sugerencia**: Añadir `@nest-lab/throttler-storage-redis` y conectarlo al Redis de Upstash que ya está en uso.

---

## 🟡 Media

### [Mantenibilidad] `auth_provider.dart` con 927 líneas — responsabilidades mezcladas
- **Archivo**: [mobile/lib/features/auth/presentation/providers/auth_provider.dart](mobile/lib/features/auth/presentation/providers/auth_provider.dart)
- **Descripción**: Un único `ChangeNotifier` maneja: login/logout, registro, OTP pendiente (`pendingRegistrationId`), refresh status del proveedor, deactivation flag, trust rejection payload, plan promotion payload, social login (Google/Facebook), eliminar cuenta, redes sociales del registro. 927 líneas, ~30 métodos públicos.
- **Sugerencia**: Dividir en:
  - `AuthProvider` (login, logout, refresh, social login)
  - `RegistrationProvider` (registerUser, registerProvider, OTP pending, resend)
  - `AccountStatusProvider` (deactivation, trust rejection, plan promotion — los pending payloads)
  - Mantener un `AuthFacade` que componga los anteriores para uso en `_AppRoot`.

### [Mantenibilidad] `admin.service.ts` con 1362 líneas — Service God Object
- **Archivo**: [backend/src/admin/admin.service.ts](backend/src/admin/admin.service.ts)
- **Descripción**: Métricas dashboard, CRUD de proveedores, aprobación/rechazo, plan requests, reportes de usuarios, analytics 13 KPIs, `$queryRaw` de registros mensuales — todo en una clase. `auth.service.ts` (649 líneas) con responsabilidades similares.
- **Sugerencia**: Subdividir por dominio:
  - `AdminDashboardService` (métricas + analytics)
  - `AdminProvidersService` (verification, visibility, plan changes)
  - `AdminPlanRequestsService` (approve/reject planes)
  - `AdminReportsService` (proveedores reportados, plataforma issues)

### [Mantenibilidad] Validación de imágenes duplicada en backend
- **Archivos**:
  - [backend/src/users/users.controller.ts:14-28](backend/src/users/users.controller.ts#L14-L28)
  - [backend/src/reviews/upload.controller.ts:13-35](backend/src/reviews/upload.controller.ts#L13-L35)
- **Descripción**: La constante `ALLOWED_EXTENSIONS`, la función `imageFilter` y el objeto `memOpts` se repiten textualmente en ambos archivos. Diferencia: reviews acepta `.gif`, users no.
- **Sugerencia**: Extraer a `backend/src/common/multer-image.config.ts` y exportar `imageMulterOptions(allowGif?: boolean)`. Reutilizar en ambos controladores.

### [Rendimiento] Modelo `User` sin índices secundarios
- **Archivo**: [backend/prisma/schema.prisma](backend/prisma/schema.prisma) (modelo User líneas ~85-117)
- **Descripción**: User tiene solo `@unique` en `email` y `firebaseUid`. Queries del admin filtran por `role`, `isActive`, búsqueda por texto en `firstName/lastName/email` (admin.service.ts:getUsers OR clause con `mode: 'insensitive'`). Sin índice, se hace seq scan completo.
- **Sugerencia**: Añadir:
  ```prisma
  @@index([role, isActive])      // listado admin filtrado
  @@index([department, province]) // analytics geo
  ```
  Para búsqueda full-text considerar `@db.Citext` en email o `pg_trgm` con índice GIN sobre `firstName||' '||lastName`.

### [Rendimiento] Loop secuencial de `deleteMany` en `deleteAccount`
- **Archivo**: [backend/src/auth/auth.service.ts:621-650](backend/src/auth/auth.service.ts#L621-L650) (área aproximada)
- **Descripción**: `for (const prov of user.providers)` con 8+ `await tx.X.deleteMany({ where: { providerId } })` por iteración. Para un usuario con 2 perfiles se hacen 16+ roundtrips secuenciales a la BD dentro de la transacción.
- **Sugerencia**: Reemplazar por `deleteMany({ where: { providerId: { in: providerIds } } })` para cada tabla, ejecutándolas en paralelo con `Promise.all` antes del último delete del Provider. Misma transacción, una pasada.

### [Mantenibilidad] FCM token no se limpia en logout
- **Archivo**: [mobile/lib/core/services/fcm_service.dart](mobile/lib/core/services/fcm_service.dart) (no tiene método `dispose` / `unregister`)
- **Descripción**: Cuando el usuario cierra sesión, el token FCM almacenado en `User.fcmToken` del backend sigue mapeado al usuario anterior. Si en el mismo dispositivo entra otro usuario, los pushes destinados al anterior se entregarán hasta que `onTokenRefresh` dispare (puede tardar semanas).
- **Riesgo**: Fuga cruzada de notificaciones (ej: "Tu plan PREMIUM fue aprobado" llega al nuevo usuario que es solo cliente).
- **Sugerencia**: En `AuthProvider.logout()` llamar `await DELETE /users/me/device-token` (nuevo endpoint) o `PATCH` con `{ token: null }`. En el cliente, `FirebaseMessaging.instance.deleteToken()` para invalidar localmente.

### [Seguridad] WebSocket `joinRoom` permite suplantación de userId
- **Archivo**: [backend/src/events/events.gateway.ts:39-47](backend/src/events/events.gateway.ts#L39-L47)
- **Descripción**: `handleJoinRoom` confía ciegamente en `data.userId` enviado por el cliente. Sin autenticación previa, cualquier socket puede unirse al room `user_42` y recibir notificaciones del usuario 42.
- **Sugerencia**: Validar JWT en `handleConnection` y derivar `userId` del payload del token. Ignorar el campo `userId` del payload del mensaje, usar `socket.data.userId` validado.

### [Mantenibilidad] Logs `console.log` en `jwt.strategy.ts` en cada validación
- **Archivo**: [backend/src/auth/jwt.strategy.ts:45-47](backend/src/auth/jwt.strategy.ts#L45-L47)
- **Descripción**: `console.log('--- JWT VALIDATE SUCCESS ---'); console.log('Payload Role:', ...); console.log('DB User Role:', ...)` se ejecuta en CADA request autenticada. Spam de logs + ruido en troubleshooting.
- **Sugerencia**: Eliminar o gatear con `if (process.env.DEBUG_JWT === 'true')`.

### [Mantenibilidad] Errores TypeScript pre-existentes
- **Archivo**: salida de `tsc --noEmit`
- **Descripción**: 3 errores en código de producción:
  - `auth.service.ts:634` — `Property 'serviceItem' does not exist`. La tabla aparece en `ProviderProfileService:294` pero no está generada en Prisma client (probablemente schema actualizado pero `prisma generate` antiguo en disco al momento de revisión).
  - `provider-profile.service.ts:302` — `'PROVIDER_DELETED'` no está en el enum tipado de `emitAdminEvent`. El método se llama en deleteMyProfile pero el tipo del gateway no lo incluye.
- **Sugerencia**: Añadir `'PROVIDER_DELETED'` al union type en `events.gateway.ts:70`. Re-ejecutar `prisma generate` y verificar `serviceItem` en schema.

### [Rendimiento] Cache no aplicado a endpoints públicos de listado
- **Archivo**: [backend/src/providers/providers.controller.ts](backend/src/providers/providers.controller.ts) (sin `@CacheKey` / `@UseInterceptors(CacheInterceptor)`)
- **Descripción**: `CacheModule` está configurado con Redis y TTL 5min como global, pero ningún endpoint usa `@UseInterceptors(CacheInterceptor)` o `@CacheKey/@CacheTTL`. El listado de proveedores con joins anidados (`category`, `images`, `user`, `locality`, `subscription`) se reconsulta a la BD en cada request.
- **Sugerencia**: Aplicar `CacheInterceptor` a `GET /providers` (con clave que incluya filtros por query) y `GET /providers/categories`. Invalidar manualmente desde admin tras aprobar/rechazar.

### [Seguridad] `tsconfig.json` con `noImplicitAny: false`
- **Archivo**: [backend/tsconfig.json:21](backend/tsconfig.json#L21)
- **Descripción**: `strictNullChecks: true` activo (bien) pero `noImplicitAny: false` y `strictBindCallApply: false`. Múltiples handlers usan `(req: any)` que oculta errores de tipo.
- **Sugerencia**: Activar progresivamente `noImplicitAny: true`. Reemplazar `any` por interfaces (ej: `AuthenticatedRequest extends Request { user: { userId: number; role: UserRole; email: string } }`).

### [Mantenibilidad] Sin tests automatizados
- **Archivo**: estructura del repo
- **Descripción**: Backend: solo `app.e2e-spec.ts` (placeholder). Hay archivos `.spec.ts` rotos según mensajes previos del usuario. Mobile: solo `widget_test.dart` default de Flutter. Cobertura efectiva: ~0%.
- **Sugerencia**: Priorizar tests de:
  - Backend: `auth.service` (registro, OTP, login, refresh), `subastas.service` (acceptOffer transactional), `provider-profile.service.deleteMyProfile`, `push-notifications.service` (mock messaging).
  - Mobile: `auth_repository`, `geocoding_service` (mockear http), `fcm_service` (mockear FirebaseMessaging).

---

## ⚪ Baja

### [Mantenibilidad] Dependencias Flutter desactualizadas — un paquete discontinued
- **Archivo**: salida de `flutter pub outdated`
- **Descripción**: Versiones mayores atrasadas: `firebase_auth 5.7.0 → 6.4.0`, `firebase_core 3.15 → 4.7`, `firebase_messaging 15.2.10 → 16.2`, `go_router 14 → 17`, `socket_io_client 2 → 3`, `sentry_flutter 8 → 9`, `geolocator 13 → 14`. Más grave: paquete `js 0.6.7` está marcado **discontinued** (transitive vía Firebase web).
- **Sugerencia**: Plan de upgrade en olas: primero core (`firebase_core` y `firebase_auth/messaging` juntos), luego routing, luego sockets. `js` saldrá con upgrade de firebase_*_web.

### [Mantenibilidad] `FcmService.initialize` recibe `BuildContext` no usado
- **Archivo**: [mobile/lib/core/services/fcm_service.dart:18](mobile/lib/core/services/fcm_service.dart#L18)
- **Descripción**: La firma toma `BuildContext context` pero el método nunca lo lee — usa el `_navigatorKey` global (línea 43). Parámetro huérfano confunde lectores.
- **Sugerencia**: Eliminar el parámetro o cambiarlo por documentación clarificadora.

### [Mantenibilidad] `GeocodingService` loggea body completo de respuesta
- **Archivo**: [mobile/lib/core/services/geocoding_service.dart:44](mobile/lib/core/services/geocoding_service.dart#L44)
- **Descripción**: `debugPrint('[Geocoding] Body: ${response.body}')` imprime el JSON completo de Nominatim (puede tener decenas de líneas con `display_name`, `boundingbox`, `licence`). Útil en desarrollo pero ruidoso.
- **Sugerencia**: Reducir a solo `address` parseado o gatear con `kDebugMode` (`flutter/foundation.dart`).

### [Rendimiento] Assets de Yape sin optimizar
- **Archivo**: [mobile/assets/images/yape/](mobile/assets/images/yape/)
- **Descripción**: 5.6MB total en assets. Archivos detectados: `ChatGPT Image 25 abr 2026, 12_08_21.png`, `volante osico.png`, `QR.jpeg`, `logo.jpeg`. Nombres sugieren imágenes generadas o sin compresión.
- **Sugerencia**: Convertir PNG a WebP (lossless 25-35% menor), usar `flutter_native_image_pro` o `tinypng`. Renombrar archivos sin espacios para portabilidad.

### [Mantenibilidad] Comentarios indican código pendiente
- **Archivo**: [backend/src/admin/admin.service.ts:21](backend/src/admin/admin.service.ts#L21)
- **Descripción**: `// eslint-disable-next-line @typescript-eslint/no-explicit-any` para `cacheManager: any`.
- **Sugerencia**: Tipar como `Cache` de `cache-manager` (tipo importable).

### [Seguridad] `CacheModule.register()` duplicado en `AdminModule`
- **Archivo**: [backend/src/admin/admin.module.ts:10](backend/src/admin/admin.module.ts#L10)
- **Descripción**: `CacheModule.register()` re-importa el módulo con storage por defecto (memoria), ignorando el Redis configurado globalmente en `app.module.ts`. Probable causa: el desarrollador no sabía que `isGlobal: true` lo hace inyectable directamente.
- **Sugerencia**: Eliminar la importación local de `CacheModule.register()` y depender del global.

---

## 🆕 Revisión específica de los nuevos módulos

### Notificaciones push (FCM)

**Backend — `push-notifications.service.ts`** ✅ Bien implementado:
- Verifica que Firebase Admin esté inicializado antes de enviar (`getApps().length === 0`).
- Maneja correctamente tokens inválidos y los limpia de la BD (`registration-token-not-registered`, `invalid-registration-token`).
- Usa `Logger` de NestJS (no `console.log`).
- Configuración correcta de Android `priority: 'high'` y APNS sound.

**Hallazgos en FCM**:
- 🟡 **No hay batch send** — si en el futuro se notifica a varios usuarios (ej: subasta a proveedores cercanos), llamar `sendToUser` en loop hace una query DB por cada uno. Sugerir `sendToUsers(userIds: number[])` que haga `findMany` y luego `sendEach`.
- 🟡 **El token NO se limpia al logout** (ya documentado arriba como Media). El token se envía tras login pero queda asociado al userId del usuario anterior cuando se cierra sesión.
- ⚪ **Sin diferenciación de plataforma** — algunos pushes deberían incluir `apns.headers['apns-push-type'] = 'background'` para data-only messages. No crítico hoy.

**Flutter — `fcm_service.dart`** ✅ Cubre los 3 escenarios (foreground SnackBar, background `onMessageOpenedApp`, terminated `getInitialMessage`). Token enviado tras login. `onTokenRefresh` suscrito.

### Geocodificación (Nominatim)

**`geocoding_service.dart`** ✅ Cumple los requisitos:
- `User-Agent: OficioApp/1.0` enviado (cumple política de Nominatim).
- `timeout` de 10 segundos configurado.
- Manejo de `null` en errores y campos faltantes.
- `accept-language=es` para nombres en español.

**`location_picker_sheet.dart`** ✅ Fallback correcto: si geo retorna `null`, muestra mensaje y permite selección manual.

**Hallazgos en Geocoding**:
- 🟡 **No hay rate limiting cliente** — Nominatim limita a 1 req/sec por IP. Si el usuario toca rápido el botón GPS, se pueden hacer requests paralelos. Añadir un `_inFlight` flag.
- ⚪ **No hay caché** — si el usuario re-detecta GPS desde la misma ubicación, se hace request repetido. Cache simple en memoria con clave `lat~,lng~` redondeado a 3 decimales (~110m).
- ⚪ **Política de uso de Nominatim** — la política pública pide no usar para servicios masivos. Si OficioApp escala >1000 usuarios activos/día, considerar Photon, Geoapify (free tier 3k/día) o LocationIQ.

---

## 📊 Resumen

| Severidad | Cantidad |
|-----------|----------|
| 🔴 Crítica | 6 |
| 🟠 Alta | 8 |
| 🟡 Media | 12 |
| ⚪ Baja | 6 |
| **Total** | **32** |

### Distribución por área

| Área | Críticos | Altos | Medios | Bajos |
|------|----------|-------|--------|-------|
| Seguridad | 5 | 4 | 2 | 1 |
| Rendimiento | 0 | 3 | 4 | 1 |
| Mantenibilidad | 0 | 1 | 6 | 4 |
| Escalabilidad | 1 (firebase-admin) | 0 | 0 | 0 |

### Servicios gratuitos — primer cuello de botella

Basado en `ESTADO_ACTUAL.md` y consumos típicos:

| Servicio | Plan free | Primer límite |
|----------|-----------|---------------|
| **Brevo** (email) | 300 emails/día | Será el **primer fallo** si crece registro/OTP. 300 OTPs/día = ~150 registros (asumiendo 2 reenvíos/usuario). |
| Render Web (free) | 750h/mes + sleep | Sleep tras 15min inactividad: cold start ~30s afecta UX. |
| Upstash Redis | 10k cmd/día | OTP + cache + throttler. Suficiente hasta ~5k usuarios activos. |
| Cloudflare R2 | 10 GB free + 1M req | Holgado salvo subida masiva de fotos. |
| Vercel | 100GB bandwidth/mes | Suficiente para panel admin (uso bajo). |
| Supabase free | 500 MB BD + 2 proyectos | Si no se usa, sin riesgo. |

**Cuello de botella esperado**: **Brevo** (email/OTP) seguido por **Render** (sleep en cold start). Plan: añadir cron-job.org para keep-alive y migrar emails a Resend (3k/mes free) o Brevo plan inicial cuando supere los 200 registros/día.

### Candidatos a microservicios futuros

| Módulo | Candidato | Mecanismo de comunicación |
|--------|-----------|---------------------------|
| `subastas` | Sí — alta variabilidad de carga | Redis Pub/Sub para `subastaNew`, BullMQ para expiraciones programadas |
| `events` (WebSocket) | Sí — escalado horizontal independiente | Redis adapter de Socket.io para múltiples instancias |
| `push-notifications` | Sí — IO-bound, no comparte estado | BullMQ queue: backend mete jobs, worker dedicado consume y llama a FCM |
| `payments` (Yape) | A futuro — dominio aislado | Worker que escucha `payment.created` |

---

## ✅ Conclusiones y recomendaciones

OficioApp está en un estado **funcional y avanzado** (Hito 8.1 con 23 observaciones resueltas, FCM y geocoding integrados), pero la auditoría revela una brecha significativa entre la **completitud funcional** y la **postura de seguridad/operacional para producción**. El equipo demuestra buenas prácticas en algunas áreas (refresh token rotation, ValidationPipe global con whitelist, índices Prisma en tablas de alto tráfico, manejo correcto de FCM tokens inválidos, fallback robusto en geocoding) pero hay defectos de configuración que pueden comprometer todo el sistema.

**Acciones inmediatas (esta semana)**:
1. **Rotar credenciales R2** y purgar `.env.example` del historial (Crítico #1).
2. **Quitar `console.log` de OTPs** (Crítico #2) — gatear con `NODE_ENV !== 'production'`.
3. **Cerrar CORS** en producción (Crítico #3).
4. **Autenticar el WebSocket** y restringir room `admin` (Crítico #4 + Media #6).
5. **Rotar `JWT_REFRESH_SECRET`** con `openssl rand -hex 64` (Crítico #5).
6. **`npm audit fix`** en backend (firebase-admin@13.8.0) y admin (next@16.2.4) (Crítico #6 + Alta #4).

**Acciones a corto plazo (este mes)**:
7. Instalar `helmet` + `compression` (Alta #1, #6).
8. Throttle estricto en `/auth/*` (Alta #2).
9. Activar `minifyEnabled`/`shrinkResources` con ProGuard rules (Alta #5).
10. Migrar Throttler a Redis store (Alta #7).
11. Eliminar/proteger `useStaticAssets('/uploads')` (Alta #3).
12. Reemplazar `xlsx` por alternativa mantenida (Alta #4).

**Acciones a medio plazo (próximo trimestre)**:
13. Refactorizar `auth_provider.dart` y `admin.service.ts` (Media #1, #2).
14. Consolidar configuración de upload de imágenes (Media #3).
15. Añadir índices a `User` y `@@index` faltantes (Media #4).
16. Suite de tests sobre módulos críticos: auth, subastas, push (Media #11).
17. Lazy loading en panel admin (Alta #6).
18. Limpiar token FCM en logout (Media #6).

El proyecto está bien posicionado para corregir estos puntos sin reescritura mayor — la arquitectura modular del backend y la separación de features en Flutter facilitan los cambios incrementales. La prioridad #1 es claramente el bloque de hallazgos críticos de seguridad, que un atacante con motivación moderada podría explotar en cuestión de horas.
