# OficioApp — Arquitectura Técnica y Estrategia de Despliegue

**Fecha**: 2026-04-24  
**Versión del sistema**: Hito 6.0+  
**Propósito**: Documento técnico de referencia para selección de infraestructura de despliegue en dos fases: lanzamiento gratuito y escala de crecimiento.

---

## 1. Inventario de la Arquitectura Actual

### 1.1 Aplicaciones

| App | Tecnología | Versión | Puerto dev | Descripción |
|-----|-----------|---------|-----------|-------------|
| Mobile | Flutter / Dart | 3.41.6 | — | App cliente + proveedor |
| Backend | NestJS (ESM) | 11.x | 3000 | API REST + WebSocket |
| Admin | Next.js | 15.x | 3001 | Panel de administración |

### 1.2 Servicios de Infraestructura

| Servicio | Imagen Docker | Puerto | Propósito |
|---------|--------------|--------|----------|
| PostgreSQL + PostGIS | postgres:16 | 5432 | Base de datos principal con soporte geoespacial |
| Redis | redis:7.2 | 6379 | Cache de sesiones, rate limiting, OTP TTL |
| MinIO | minio/minio | 9000/9001 | Almacenamiento de imágenes (S3-compatible) |

### 1.3 Variables de Entorno Requeridas por el Backend

```env
DATABASE_URL          # PostgreSQL connection string
JWT_SECRET            # Secreto para firmar JWT
JWT_EXPIRES_IN        # "8h" — duración token de acceso
JWT_REFRESH_EXPIRES_IN # "7d" — duración refresh token
REDIS_HOST            # Host Redis
REDIS_PORT            # Puerto Redis (6379)
MINIO_ENDPOINT        # Host MinIO / S3
MINIO_PORT            # Puerto MinIO
MINIO_ACCESS_KEY      # Access key S3
MINIO_SECRET_KEY      # Secret key S3
MINIO_BUCKET_NAME     # Nombre del bucket
PORT                  # Puerto del servidor (3000)
NODE_ENV              # "production" en prod
API_BASE_URL          # URL pública del backend (para URLs de imágenes en BD)
```

---

## 2. Stack Técnico Detallado

### 2.1 Backend — NestJS 11 (ESM)

**Runtime**: Node.js 20+ (ESM obligatorio — todos los imports locales usan extensión `.js`)  
**Framework**: NestJS 11 con módulos: auth, users, providers, reviews, favorites, admin, provider-panel, subastas, events, payments  
**ORM**: Prisma 7.6 con `@prisma/adapter-pg` (driver Postgres nativo)  
**Autenticación**: JWT (passport-jwt) + bcrypt para contraseñas + OTP con TTL en Redis  
**WebSockets**: Socket.IO 4.8 vía `@nestjs/platform-socket.io` y `@nestjs/websockets`  
**Rate Limiting**: `@nestjs/throttler` 6.x  
**Cache**: `cache-manager` 7.x + `cache-manager-redis-yet` 5.x  
**Upload**: Multer 2.x (multipart/form-data para imágenes)  
**Validación**: class-validator + class-transformer  

**24 modelos Prisma**:
User, Provider, Category, Locality, Review, ReviewReply, Favorite, Payment, Subscription, PlanRequest, OtpCode, RefreshToken, VerificationDoc, TrustValidationRequest, ProviderImage, ProviderAnalytic, ProviderReport, Recommendation, AdminNotification, PlatformIssue, ServiceRequest (subastas), ServiceOffer, etc.

**Características críticas para infra**:
- PostGIS requerido para consultas geoespaciales (`ST_DWithin`, coordenadas GPS de reseñas)
- Redis requerido para OTP (TTL 5min), caché de respuestas frecuentes
- Almacenamiento S3-compatible requerido (fotos perfil, documentos verificación, comprobantes Yape)
- WebSocket persistente para notificaciones en tiempo real

### 2.2 Mobile — Flutter 3.41.6

**Arquitectura**: Feature-First con Provider (ChangeNotifier)  
**HTTP**: Dio 5.9  
**Navegación**: go_router 14.8  
**WebSocket**: socket_io_client 2.0.3 (conecta al backend NestJS)  
**Mapas**: flutter_map 7.0 + latlong2 (OpenStreetMap, sin Google Maps API)  
**Storage local**: flutter_secure_storage 10.0 (JWT tokens)  
**Imágenes**: image_picker 1.2, cached_network_image 3.4, photo_view 0.15  
**GPS**: geolocator 13.0, permission_handler 11.3  

**Distribución**: APK Android (Google Play) + IPA iOS (App Store)  
**Build**: No requiere servidor propio — se puede compilar localmente o con Codemagic/GitHub Actions  

### 2.3 Admin — Next.js 15

**Framework**: Next.js 15 (App Router)  
**Estilo**: Tailwind CSS v3  
**Autenticación**: Token JWT almacenado en localStorage (`admin_token`)  
**Export**: xlsx 0.18 (generación Excel client-side)  
**Comunicación**: fetch() con Authorization Bearer header  
**Funciones**: Dashboard métricas, CRUD proveedores, moderación reseñas, gestión usuarios, reportes, notificaciones admin  

---

## 3. Requisitos de Infraestructura

### 3.1 Requisitos Mínimos de Servidor (Backend)

| Recurso | Mínimo (Free) | Recomendado (Prod) |
|---------|--------------|-------------------|
| CPU | 0.1 vCPU | 1–2 vCPU |
| RAM | 512 MB | 1–2 GB |
| Almacenamiento disco | 1 GB | 10 GB+ |
| Ancho de banda | 100 GB/mes | Ilimitado o alto |
| OS | Linux (Ubuntu/Debian) | Ubuntu 22.04 LTS |

### 3.2 Requisitos de Base de Datos

- **PostgreSQL 14+ con extensión PostGIS habilitada** (CRÍTICO — sin PostGIS las queries geo fallan)
- Mínimo 1 GB RAM para BD
- Conexiones concurrentes: mínimo 20 (pool Prisma default)

### 3.3 Tráfico Estimado (Fase Inicial)

- **Usuarios activos**: < 500 diarios en fase de validación
- **Requests/hora**: ~1,000–5,000
- **Imágenes**: 50–200 uploads/día (~5MB promedio por foto)
- **WebSocket conexiones concurrentes**: < 100

---

## 4. FASE 1 — Lanzamiento con Free Tier

### Objetivo
Desplegar 100% del sistema sin costo operativo para validar el producto con usuarios reales.

### 4.1 Mapa de Servicios Free Tier

```
┌─────────────────────────────────────────────────────────────────┐
│                     FASE 1 — FREE TIER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Flutter APK ──── Google Play (free) / Distribución directa    │
│                                                                 │
│  Next.js Admin ── Vercel (free tier)                           │
│       │                                                         │
│       ▼                                                         │
│  NestJS Backend ── Render.com (free/starter)                   │
│       │                                                         │
│       ├── PostgreSQL+PostGIS ── Render Postgres (free 90 días) │
│       │              ó Supabase (free, PostGIS incluido)        │
│       │                                                         │
│       ├── Redis ────────────── Upstash (free tier)             │
│       │                                                         │
│       └── Storage S3 ───────── Cloudinary (free) /             │
│                                Backblaze B2 (free 10GB)         │
│                                                                 │
│  Email/OTP ──────────────────── Resend (free 3k emails/mes)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Backend — Render.com

**URL**: render.com  
**Plan**: Free (limitado) → Starter $7/mes  
**Por qué**: NestJS (Node.js) compatible nativo. Deploy desde GitHub. Soporta variables de entorno, WebSockets con configuración adicional.

**Limitaciones Free**:
- El servidor se "duerme" tras 15 min de inactividad (cold start ~30s)
- 512 MB RAM
- Sin dominio personalizado gratuito (usa `.onrender.com`)

**Configuración**:
```
Build Command: npm install && npm run build
Start Command: npm run start:prod
Node Version: 20
Root Directory: backend/
```

**Variables de entorno a configurar en Render**:
```
DATABASE_URL        = (de Supabase/Render Postgres)
JWT_SECRET          = (generar: openssl rand -hex 64)
JWT_EXPIRES_IN      = 8h
JWT_REFRESH_EXPIRES_IN = 7d
REDIS_HOST          = (de Upstash)
REDIS_PORT          = 6379
REDIS_PASSWORD      = (de Upstash)
REDIS_TLS           = true
MINIO_ENDPOINT      = (de Cloudflare R2 o Backblaze)
MINIO_ACCESS_KEY    = ...
MINIO_SECRET_KEY    = ...
MINIO_BUCKET_NAME   = oficio-uploads
PORT                = 3000
NODE_ENV            = production
API_BASE_URL        = https://tu-app.onrender.com
```

**Nota WebSocket**: Render soporta WebSocket en planes pagados. En free tier, usar polling como fallback o actualizar a Starter ($7/mes).

### 4.3 Base de Datos — Supabase (Recomendado)

**URL**: supabase.com  
**Plan Free**: 500 MB almacenamiento, 2 GB transferencia/mes, PostGIS incluido  
**Por qué es la mejor opción**: PostGIS habilitado por defecto (requisito crítico), interfaz visual para gestión, backups automáticos, 50k filas en free.

**Configuración**:
1. Crear proyecto en Supabase
2. Ir a Settings → Database → Connection String (Transaction pooler para Prisma)
3. Copiar URL con formato:
```
postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```
4. Ejecutar: `npx prisma migrate deploy` (aplica migraciones en Supabase)
5. Habilitar PostGIS en Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

**Alternativa**: Render Postgres Free (90 días gratis, luego $7/mes) — sin PostGIS por defecto, requiere extensión manual.

**Alternativa 2**: Neon.tech — PostgreSQL serverless, free tier generoso, PostGIS disponible.

### 4.4 Redis — Upstash

**URL**: upstash.com  
**Plan Free**: 10,000 comandos/día, 256 MB, TLS incluido  
**Por qué**: Único Redis serverless con free tier real. Compatible 100% con `cache-manager-redis-yet`.

**Configuración en backend** (`.env`):
```env
REDIS_HOST=tu-endpoint.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=tu-password-upstash
REDIS_TLS=true
```

**Cambio de código necesario** en `cache-manager-redis-yet` config:
```typescript
// En el módulo que configura Redis
redisOptions: {
  socket: { host: process.env.REDIS_HOST, port: +process.env.REDIS_PORT, tls: true },
  password: process.env.REDIS_PASSWORD,
}
```

### 4.5 Almacenamiento de Archivos — Cloudflare R2 (Recomendado)

**URL**: cloudflare.com/r2  
**Plan Free**: 10 GB almacenamiento, 1 millón operaciones de escritura/mes, egress gratuito  
**Por qué**: S3-compatible (drop-in replacement de MinIO), egress gratis (MinIO y S3 cobran por salida), interfaz clara.

**Configuración** — R2 es S3-compatible, el código existente con MinIO SDK funciona sin cambios:
```env
MINIO_ENDPOINT=tu-account-id.r2.cloudflarestorage.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=tu-r2-access-key-id
MINIO_SECRET_KEY=tu-r2-secret-access-key
MINIO_BUCKET_NAME=oficio-uploads
```

**Alternativa — Backblaze B2**:
- 10 GB free, S3-compatible, $0.006/GB después
- Misma config que R2 pero con endpoint `s3.us-west-002.backblazeb2.com`

**Alternativa — Cloudinary** (si se quiere transformaciones de imagen):
- Free: 25 GB almacenamiento, 25 GB ancho de banda/mes
- Requiere cambio de código (SDK propio, no S3-compatible)
- Ventaja: redimensionado automático de imágenes, optimización WebP

### 4.6 Admin Panel — Vercel

**URL**: vercel.com  
**Plan Free**: Ilimitado para proyectos personales, CDN global, HTTPS automático  
**Por qué**: Next.js es el framework oficial de Vercel, deploy automático desde GitHub.

**Configuración**:
```
Framework: Next.js
Root Directory: admin/
Build Command: npm run build
Output Directory: .next
```

**Variables de entorno en Vercel**:
```
NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com
```

**Cambio necesario** en `admin/lib/api.ts`:
```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

### 4.7 Email / OTP — Resend

**URL**: resend.com  
**Plan Free**: 3,000 emails/mes, 100/día  
**Por qué**: API moderna, SDK para NestJS/Node.js, excelente deliverability, setup en 5 minutos.

**Instalación**:
```bash
cd backend && npm install resend
```

**Uso en backend** (reemplaza o complementa OTP por SMS):
```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'OTP <noreply@tudominio.com>',
  to: user.email,
  subject: 'Tu código de verificación',
  html: `<p>Tu código es: <strong>${otpCode}</strong>. Válido por 5 minutos.</p>`,
});
```

**Alternativa para SMS OTP — Twilio Verify**:
- Free: 250 verificaciones SMS gratis en trial
- Luego: $0.05 por verificación
- Más robusto para mercado peruano (números locales)

### 4.8 Mobile — Distribución Flutter

**Android APK**:
- Distribución directa (APK firmado) — sin costo, para beta
- Google Play: $25 registro único — recomendado para lanzamiento

**iOS**:
- Apple Developer Program: $99/año — requerido para App Store
- TestFlight: free para beta (hasta 10,000 testers)

**Build CI/CD**:
- **Codemagic**: free 500 min/mes para Flutter — recomendado
- **GitHub Actions**: free para repos públicos, o 2,000 min/mes privados

### 4.9 Dominio y HTTPS

- **Dominio .com.pe**: ~$15–30/año en NIC Perú o registradores
- **HTTPS**: Render, Vercel, Cloudflare — todos incluyen Let's Encrypt gratis
- **DNS**: Cloudflare free — protección DDoS básica, caché edge

### 4.10 Resumen Costos Fase 1

| Servicio | Herramienta | Costo/mes |
|---------|------------|----------|
| Backend API | Render Starter | $7 (o free con sleep) |
| PostgreSQL | Supabase | $0 (free tier) |
| Redis | Upstash | $0 (free tier) |
| Storage | Cloudflare R2 | $0 (free tier) |
| Admin Panel | Vercel | $0 (free tier) |
| Email OTP | Resend | $0 (free tier) |
| Dominio | Cualquier registrador | ~$2/mes |
| **TOTAL** | | **~$9/mes** (o $2 con Render free) |

---

## 5. FASE 2 — Escalabilidad y Crecimiento

### Objetivo
Soportar miles de usuarios activos, alto volumen de requests, alta disponibilidad y performance garantizada.

### 5.1 Mapa de Servicios Fase 2

```
┌─────────────────────────────────────────────────────────────────┐
│                  FASE 2 — PRODUCCIÓN ESCALABLE                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cloudflare (CDN + DDoS + DNS)                                 │
│       │                                                         │
│       ├── Next.js Admin ── Vercel Pro / VPS                    │
│       │                                                         │
│       └── NestJS Backend ── Railway Pro / DigitalOcean Droplet │
│                   │         / Hetzner VPS (más barato)         │
│                   │                                             │
│                   ├── PostgreSQL ── Supabase Pro               │
│                   │               / Neon Paid                  │
│                   │               / DigitalOcean Managed DB     │
│                   │                                             │
│                   ├── Redis ────── Upstash Pro                 │
│                   │               / Redis Cloud                 │
│                   │               / VPS self-hosted             │
│                   │                                             │
│                   └── Storage ─── Cloudflare R2 (escala bien) │
│                                  / AWS S3 + CloudFront         │
│                                                                 │
│  Push Notifications ── Firebase FCM (free, escala a millones) │
│  Monitoring ─────────── Sentry (free tier) + UptimeRobot       │
│  Analytics ──────────── Posthog / Mixpanel (free tier)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Backend — Opciones de Servidor Dedicado

#### Opción A: Railway.app (Recomendado para transición suave)
- **Plan Pro**: $20/mes base + consumo
- **Ventaja**: Deploy desde GitHub igual que Render, WebSockets nativos, métricas incluidas, PostgreSQL + Redis como servicios adicionales
- **Cuándo migrar**: Al superar 500 usuarios activos o necesitar WebSockets estables

#### Opción B: DigitalOcean Droplet
- **Droplet básico**: $6/mes (1 vCPU, 1 GB RAM)
- **Droplet recomendado**: $24/mes (2 vCPU, 4 GB RAM)
- **Ventaja**: Control total, SSH, instalar PostgreSQL+PostGIS manualmente
- **Stack en VPS**:
```bash
# En Droplet Ubuntu 22.04
apt install nodejs npm postgresql postgresql-contrib postgis redis-server nginx
npm install -g pm2
pm2 start dist/main.js --name oficio-backend
pm2 save && pm2 startup
```
- **Cuándo usar**: Al superar 2,000 usuarios activos o requerir configuración personalizada

#### Opción C: Hetzner Cloud (Mejor precio/rendimiento en Europa)
- **CX22**: €3.79/mes (2 vCPU AMD, 4 GB RAM, 40 GB SSD)
- **Ventaja**: El VPS más barato con buena performance
- **Desventaja**: Servidores en Europa/EEUU, latencia ~180ms desde Perú
- **Cuándo usar**: Proyecto con presupuesto ajustado, < 100ms latencia no crítico

#### Opción D: Servidor en Perú (Máxima performance local)
- Proveedor: **Optical Networks**, **DataCenter Perú**, o **AWS São Paulo** (latencia < 50ms)
- **AWS São Paulo (sa-east-1)**: EC2 t3.small = ~$17/mes, RDS PostgreSQL = ~$25/mes
- **Cuándo usar**: Al tener usuarios enterprise o SLAs estrictos de latencia

### 5.3 Base de Datos — Escalabilidad

#### Supabase Pro ($25/mes)
- 8 GB almacenamiento, PITR (backup continuo), no sleep, soporte
- Misma API, zero cambios de código
- PostGIS incluido

#### Neon.tech Paid ($19/mes)
- PostgreSQL serverless, auto-scaling, branching para dev/prod
- PostGIS disponible

#### DigitalOcean Managed PostgreSQL ($15/mes)
- 1 GB RAM, 10 GB, backups diarios, PostGIS instalable
- Alta disponibilidad con replicas ($30+/mes)

**Optimizaciones de BD para escala**:
```sql
-- Índices geoespaciales (crítico para búsquedas por zona)
CREATE INDEX idx_providers_location ON "Provider" USING GIST(location);

-- Índices de queries frecuentes
CREATE INDEX idx_reviews_provider ON "Review"(providerId);
CREATE INDEX idx_favorites_user ON "Favorite"(userId);
CREATE INDEX idx_subscription_provider ON "Subscription"(providerId, status);

-- Connection pooling con PgBouncer (recomendado a >100 conexiones simultáneas)
```

### 5.4 Redis — Escalabilidad

#### Upstash Pro ($10+/mes)
- 10 millones comandos/mes, TLS, persistencia
- Zero cambios de código desde free tier

#### Redis Cloud ($7/mes)
- 100 MB dedicado, alta disponibilidad, soporte 24/7

#### Self-hosted en VPS
- Redis en mismo Droplet (si RAM lo permite) = $0 adicional
- Redis separado con replicación = mayor costo pero mayor fiabilidad

### 5.5 Almacenamiento — Cloudflare R2 (Escala sin cambios)

- **Precio a escala**: $0.015/GB almacenado, $4.50 por millón operaciones escritura
- **Egress**: GRATIS siempre (crítico — S3 cobra $0.09/GB salida)
- **Para 10,000 usuarios con 10 fotos cada uno** (~5 GB): ~$0.075/mes
- Código existente S3/MinIO compatible — cero cambios

**Si se prefiere AWS**:
- S3 + CloudFront: más complejo, costoso, pero mayor ecosistema
- S3 standard: $0.023/GB + $0.09/GB egress (Cloudflare R2 es más barato)

### 5.6 Push Notifications — Firebase FCM

**Pendiente crítico**: El sistema actual no tiene push notifications implementadas.

**Costo**: Gratis hasta 1 millón mensajes/mes (prácticamente gratuito para siempre)

**Integración requerida**:

*Backend (NestJS)*:
```bash
npm install firebase-admin
```
```typescript
// notifications.service.ts
import * as admin from 'firebase-admin';
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

await admin.messaging().sendEachForMulticast({
  tokens: userDeviceTokens,
  notification: { title: 'Nueva solicitud', body: 'Tienes una nueva oferta' },
});
```

*Flutter*:
```yaml
# pubspec.yaml
firebase_core: ^2.32.0
firebase_messaging: ^14.9.4
```
```dart
final token = await FirebaseMessaging.instance.getToken();
// Enviar token al backend al hacer login
```

**Flujos que necesitan push**:
- Nueva reseña al proveedor
- Comprobante Yape validado/rechazado
- Nueva oferta en subasta
- Solicitud de verificación de confianza

### 5.7 Monitoreo y Observabilidad

| Herramienta | Uso | Free Tier |
|------------|-----|-----------|
| **Sentry** | Error tracking backend + Flutter | 5k errores/mes |
| **UptimeRobot** | Health checks cada 5min + alertas | 50 monitores |
| **Betterstack** | Logs centralizados | 1 GB/mes |
| **Posthog** | Analytics de producto (eventos) | 1 millón eventos/mes |

**Sentry en NestJS**:
```bash
npm install @sentry/nestjs @sentry/profiling-node
```
```typescript
// main.ts
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
```

**Sentry en Flutter**:
```yaml
sentry_flutter: ^8.11.0
```

### 5.8 CDN y Performance

**Cloudflare Free**:
- Cache de assets estáticos (imágenes, JS, CSS)
- DDoS protection
- SSL terminación
- Page Rules para cachear rutas del admin

**Configuración recomendada**:
- Proxied: `api.tudominio.com` → Backend (Cloudflare añade capa de protección)
- Proxied: `admin.tudominio.com` → Vercel
- Cache-Control en NestJS para endpoints públicos:
```typescript
@Header('Cache-Control', 'public, max-age=300') // 5min cache
async getProviders() { ... }
```

### 5.9 Estrategia de Scaling Horizontal (>10,000 usuarios)

Cuando una sola instancia del backend no sea suficiente:

1. **Load Balancer**: Nginx o Cloudflare Load Balancing distribuye entre múltiples instancias NestJS
2. **Session store**: JWT stateless ya está implementado — escala horizontalmente sin cambios
3. **WebSocket sticky sessions**: Configurar Redis Pub/Sub para que Socket.IO funcione con múltiples instancias:
```typescript
// En EventsGateway
import { createAdapter } from '@socket.io/redis-adapter';
io.adapter(createAdapter(pubClient, subClient));
```
4. **Prisma connection pool**: Aumentar `connection_limit` en DATABASE_URL:
```
DATABASE_URL="postgresql://...?connection_limit=20&pool_timeout=30"
```

### 5.10 Resumen Costos Fase 2 (Estimado ~2,000 usuarios activos)

| Servicio | Herramienta | Costo/mes |
|---------|------------|----------|
| Backend API | Railway Pro | $20–40 |
| PostgreSQL | Supabase Pro | $25 |
| Redis | Upstash Pro | $10 |
| Storage | Cloudflare R2 | $1–5 |
| Admin Panel | Vercel Pro | $20 |
| Push Notifications | Firebase FCM | $0 |
| Monitoreo | Sentry + UptimeRobot | $0–26 |
| Dominio + CDN | Cloudflare Pro | $20 |
| **TOTAL** | | **~$96–146/mes** |

---

## 6. Hoja de Ruta de Migración

### Paso 1: Preparar el backend para producción
```bash
# 1. Generar cliente Prisma para producción
npx prisma generate

# 2. Build NestJS
npm run build

# 3. Verificar que start:prod funciona localmente
npm run start:prod
```

### Paso 2: Configurar variables de entorno de producción
- Nunca commitear `.env` al repositorio
- Usar el gestor de secrets del proveedor elegido (Render env vars, Railway secrets, etc.)
- Rotar todos los secretos (JWT_SECRET, passwords) al pasar a producción

### Paso 3: Migrar la base de datos
```bash
# Aplicar migraciones en la BD de producción
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Habilitar PostGIS (si no está habilitado)
# En Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Paso 4: Actualizar Flutter `API_BASE_URL`
```dart
// mobile/lib/core/network/dio_client.dart
// Cambiar a URL de producción antes del build
static const String baseUrl = 'https://api.tudominio.com';
```

O mejor, usar flavors de Flutter para separar dev/prod:
```dart
const String apiBaseUrl = String.fromEnvironment('API_BASE_URL', 
  defaultValue: 'http://localhost:3000');
```
```bash
flutter build apk --dart-define=API_BASE_URL=https://api.tudominio.com
```

### Paso 5: Migrar storage de MinIO a Cloudflare R2
1. Crear bucket en R2
2. Actualizar variables de entorno (endpoint, keys)
3. Código existente es compatible — sin cambios en el código
4. Opcional: migrar imágenes existentes con `rclone`

### Paso 6: Configurar CORS en producción
```typescript
// main.ts — restricción de CORS en producción
app.enableCors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://admin.tudominio.com', 'https://tudominio.com']
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
});
```

---

## 7. Checklist Pre-Lanzamiento

### Backend
- [ ] `NODE_ENV=production` configurado
- [ ] JWT_SECRET generado con `openssl rand -hex 64` (mínimo 64 chars)
- [ ] PostGIS extensión habilitada en BD producción
- [ ] Prisma migrations aplicadas
- [ ] WebSocket funcionando en proveedor elegido
- [ ] Rate limiting activo (@nestjs/throttler)
- [ ] CORS restringido a dominios propios
- [ ] Logs de errores enviando a Sentry
- [ ] Health check endpoint `GET /health` implementado

### Admin
- [ ] `NEXT_PUBLIC_API_URL` apunta a backend producción
- [ ] Dominio configurado en Vercel
- [ ] HTTPS activo

### Mobile
- [ ] `API_BASE_URL` apunta a backend producción
- [ ] APK firmado con keystore (NO debug key)
- [ ] Nombre de app, íconos y splash screen finales
- [ ] Permisos de Android/iOS revisados (GPS, cámara, almacenamiento)

### Infraestructura
- [ ] Backups automáticos de BD configurados
- [ ] UptimeRobot monitoreando `https://api.tudominio.com/health`
- [ ] Alertas de caída configuradas (email/WhatsApp)
- [ ] Política de retención de imágenes (borrar imágenes huérfanas)

---

## 8. Decisión Recomendada — Stack de Lanzamiento

Para validar OficioApp con costo mínimo, stack recomendado:

| Componente | Herramienta | Motivo |
|-----------|------------|--------|
| Backend | **Render Starter ($7/mes)** | WebSockets estables, deploy simple |
| BD | **Supabase Free** | PostGIS incluido, 0 costo, interfaz visual |
| Redis | **Upstash Free** | Compatible directo, TLS incluido |
| Storage | **Cloudflare R2** | S3-compatible, egress gratis, 10GB free |
| Admin | **Vercel Free** | Deploy automático Next.js, CDN global |
| Email | **Resend Free** | 3k emails/mes, setup 5min |
| DNS/CDN | **Cloudflare Free** | DDoS + SSL + caché |
| **COSTO TOTAL** | | **~$9/mes** |

Al superar 1,000 usuarios activos, migrar a:
- Render → Railway Pro ($20/mes) para mayor RAM y métricas
- Supabase Free → Supabase Pro ($25/mes) para PITR y sin límites
- Total Fase 2 mínimo: **~$55/mes**
