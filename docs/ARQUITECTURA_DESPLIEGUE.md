# ARQUITECTURA DE DESPLIEGUE — Servi

**Última actualización:** 2026-07-01

> ÚNICA fuente de verdad de arquitectura (la copia de la raíz está gitignored
> y es solo un puntero local). El estudio largo que vivía aquí quedó obsoleto;
> el histórico está en git.

## Topología

```
Mobile (Flutter) ─┐
Web (Next.js 3002)├─► Backend NestJS (Render) ─► Supabase Postgres+PostGIS
Admin (Next.js)  ─┘            │                  ├─► Upstash Redis (cache/throttle/quota IA)
                               │                  └─► R2 / MinIO (storage)
                               └─► WebSocket (socket.io) ── Push FCM (Firebase)
```

## Límites del tier gratuito (DISEÑAR PARA ESTO)

| Recurso | Límite | Implicación de diseño |
|---------|--------|------------------------|
| **Render Free** | 512 MB RAM, 0.1 vCPU, **se duerme** | Un OOM o una excepción no capturada = reinicio frío que corta todas las requests. → Multer con `limits` estrictos (5–8 MB); handlers globales `uncaughtException`/`unhandledRejection` que NO matan el proceso. 0.1 vCPU alarga handlers → amplía ventanas de carrera (de ahí los updates condicionales atómicos en pagos). |
| **Upstash Redis** | **10 000 cmds/día** | Cachear datos volátiles agota la cuota. → Solo se cachean catálogos (categorías/localities `@CacheTTL(1h)`) y respuestas IA (FAQ/búsqueda). Cuota IA con `INCR`+`PEXPIRE` (2 cmds/consulta). Los 3 clientes Redis comparten estrategia de reconexión. |
| **Supabase** | **500 MB** | **PROHIBIDO** tablas de logs masivas. → Logs operativos a **stdout** (Render los captura); solo `audit_log` (eventos críticos, volumen bajo) y `subscription_audit_log` (trigger) en BD. |
| Red móvil | 3G/4G inestable | Operaciones best-effort (subida de fotos, auditoría, memoria IA) no bloquean el flujo principal. |

## Conexión a base de datos
- **DATABASE_URL** → pooler de sesión de Supabase (puerto **5432**, `?sslmode=require`).
- **Migraciones:** `db push` de facto (historial whole-schema roto). Cambios aditivos se aplican por **SQL idempotente** (`CREATE ... IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) ejecutado manualmente contra el pooler. NUNCA `migrate deploy` ni `--force-reset`.
- Triggers en BD manejan `location_geog` (geography), `search_tsv` (tsvector) y `subscription_audit_log` (vía GUC `app.current_user_id`, scope `is_local=true` — jamás pasar a session scope con pooler).
- **SQL pendientes de aplicar a prod:** `prisma/sql/audit_log.sql`.
- **SQL ya aplicados (2026-06/07):** `pr1_features_agenda.sql`, `pr2_carta_catalogo.sql`, `pr_cotizacion.sql`, `pr_notif_metadata.sql` (metadata JSONB en admin_notifications).

## Índices clave (ya en schema)
- `providers_location_geog_gist`, `service_requests_location_geog_gist` (GIST geoespacial).
- `providers_businessname_trgm`, `providers_description_trgm` (GIN trigram, búsqueda fuzzy).
- `providers_search_tsv_gin` (GIN full-text).
- Compuestos: `(isVisible, verificationStatus[, averageRating|localityId])`, `(role, isActive)`, `(action, createdAt)` en audit_log.

## Resiliencia / seguridad operativa
- **Redis:** `.on('error')` + reconnect en Throttler (ioredis), Cache (KeyvRedis/node-redis) y AiQuota; ninguno mata el proceso.
- **Proceso:** `main.ts` captura `uncaughtException`/`unhandledRejection` (log + Sentry, sin `process.exit`).
- **WebSocket:** handshake valida JWT; `EventsGateway.afterInit` registra listeners de error del engine.
- **Uploads:** límites Multer + filtro de tipo + auth (JWT) en todas las rutas de subida.
- **Pagos:** transacciones atómicas con claim condicional; idempotencia MercadoPago por `reference`; webhook MP con firma HMAC.
- **Sentry:** backend y Flutter capturan excepciones; DSN por variable de entorno.

## Variables de entorno críticas (no hardcodear)
`DATABASE_URL`, `REDIS_HOST/PORT/PASSWORD/TLS`, `JWT_SECRET`, `MERCADOPAGO_*` (incl. `WEBHOOK_SECRET`), `SENTRY_DSN`, `ALLOWED_ORIGINS`, claves R2/MinIO, credenciales Firebase, claves IA (Gemini/OpenRouter).
