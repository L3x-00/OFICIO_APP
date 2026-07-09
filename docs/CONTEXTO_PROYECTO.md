# CONTEXTO DEL PROYECTO — Servi (oficio_app)

**Fuente de verdad única y portable.** Pégalo en cualquier chat nuevo de Claude
Code (o de claude.ai) para dar contexto completo del sistema sin explorar
archivo por archivo. En este repo se **auto-carga** vía `@docs/CONTEXTO_PROYECTO.md`
en `CLAUDE.md`. Mantener actualizado al cerrar cada tanda de cambios.

**Última actualización:** 2026-07-09 · Estado: producción — reducción de superficie: subastas y ofertas OCULTAS (reactivables), foco en proveedores OFICIO.

---

## 1. Qué es

**Servi** = marketplace de servicios locales para ciudades intermedias del Perú
(electricistas, gasfiteros, peluquerías, restaurantes, etc.). Mercado base: Junín
(Huancayo). **Modelo:** clientes gratis; proveedores pagan suscripción
(GRATIS / ESTÁNDAR / PREMIUM). Un usuario puede ser cliente y además tener perfil
proveedor OFICIO y/o NEGOCIO — los tres perfiles son independientes.
**Enfoque actual (2026-07):** la app está en lanzamiento — se REDUJO la
superficie de funciones para simplificar la experiencia; prioridad en
proveedores de OFICIO (los NEGOCIO son secundarios). Subastas y ofertas
quedaron ocultas (ver §3), reactivables a futuro.

## 2. Apps, stack y despliegue

| App | Stack | Puerto dev | Despliegue |
|-----|-------|-----------|-----------|
| **mobile/** | Flutter 3.41.6 (Dart), provider (ChangeNotifier), go_router, dio | — | .aab a Google Play (recompilar para publicar) |
| **backend/** | NestJS 11 (TypeScript **ESM**), Prisma 7.8 + PrismaPg | 3000 | Render (`oficio-backend.onrender.com`), `main` auto-deploy, health `GET /health` |
| **admin/** | Next.js 16 (TS + Tailwind **v3**) | 3001 | — |
| **web/** | Next.js 16 (landing + panel proveedor + chat + perfil público) | 3002 | — |

**Infra:** Supabase PostgreSQL 16 + PostGIS · Upstash Redis (cache/throttle/cuota IA) · Cloudflare R2 / MinIO (storage) · Firebase FCM (push) · WebSocket socket.io (`events/`, vía Pusher). Local: `docker-compose up -d` (Postgres+PostGIS, Redis 7.2, MinIO).

## 3. Módulos

**backend/src/** — `auth` (JWT, OTP, social) · `users` · `providers` (listado/detalle/analytics/nearby) · `provider-profile` (panel propio + coverage) · `reviews` (GPS/QR) · `favorites` · `chat` · `menu` (carta) · `catalog` · `appointments` (agenda) · `quotations` (cotización) · `coverage` (alcance por distrito) · `offer-posts` ⛔OCULTO · `subastas` ⛔OCULTO · `referrals` (canje monedas→plan) · `payments` (Yape + MercadoPago; PlanRequest DEPRECADO) · `trust-validation` · `user-reports` · `admin` (+services: dashboard/trust/reports/payments) · `ai-assistant` ("Ofi", aislado) · `events` (WS) · `firebase` (push) · `email` · `localities` · `common` (MinioService, provider-features.service, storefront.helpers, **feature-flag.guard**) · `generated` (cliente Prisma, regenera en CI — no editar). Schema: `backend/prisma/schema.prisma`.

**mobile/lib/features/** — `auth` · `providers_list` (listado+detalle+reseñas+filtros+radio) · `provider_dashboard` (panel proveedor, tabs) · `favorites` · `chat` · `menu` · `catalog` · `agenda` · `quotation` · `subastas` ⛔OCULTO · `offer_posts` ⛔OCULTO · `referrals` · `notifications` · `payments` · `trust_validation` · `localities` · `ai_assistant` · `showcase`. **mobile/lib/core/** — `constants` (app_colors, **feature_flags**), `theme` (app_theme_colors, theme_provider), `network` (dio_client), `router`, `services`, `errors`, `utils`, `widgets`. Cada feature: `data/` (repo) · `domain/` (models) · `presentation/` (screens/widgets/providers).

⛔ **Features OCULTAS (2026-07, código intacto):** subastas "ConfiServ" y ofertas (offer_posts) están desactivadas para simplificar el lanzamiento — foco en proveedores OFICIO. Reactivar = backend `FEATURE_SUBASTAS`/`FEATURE_OFERTAS=true` en Render (guard `common/feature-flag.guard.ts`, controllers públicos → 404) + móvil `core/constants/feature_flags.dart` (`kSubastasEnabled`/`kOfertasEnabled=true` y recompilar) + restaurar navs comentados en web/admin. Tablas BD intactas; los controllers `/admin/offers` y `/admin/offer-reports` siguen vivos (moderación de historial) y el cron `expireOffers` sigue limpiando.

## 4. Convenciones NO negociables

- **Backend ESM**: imports locales SIEMPRE con extensión `.js` (`./x.service.js`). Sin `.js` = build roto.
- **Flutter feature-first** + **tema dinámico**: colores vía `context.colors` (AppThemeColors) para fondos/texto; acentos de marca vía `AppColors.*`; texto de acento sobre su tinte via `AppColors.tintOn(accent, c.isDark)`; glifo sobre fill sólido via `AppColors.onSolid(accent)`. NUNCA `AppColors.bgDark/textPrimary` estáticos ni `Colors.white/black` para superficies temáticas. Tema por defecto = **sistema**.
- **Providers globales**: los `ChangeNotifier` compartidos (Auth, Dashboard, Providers, Chat) son GLOBALES, no locales a un tab (evita `ProviderNotFoundException`). Su caché se limpia en logout (`_clearAll`/`attachAuth`) o filtra datos del usuario anterior.
- **Admin Tailwind v3** (no v4): `postcss.config.mjs` usa `tailwindcss: {}`.
- **Respuestas de auth**: login/verify-otp/social-login devuelven `userId`+`role` (móvil hace `data['userId'] as int` → si falta, crashea y no guarda sesión).

## 5. Base de datos y migraciones (LEER antes de tocar schema)

- **Historial whole-schema ROTO** → `db push` de facto. Cambios aditivos se aplican por **SQL idempotente** (`CREATE ... IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) en `backend/prisma/sql/`.
- **REGLA DURA:** el usuario aplica TODO el SQL a Supabase **manualmente**. Claude NUNCA ejecuta SQL contra prod — entrega el archivo `.sql` y espera confirmación. Nunca `migrate deploy` ni `--force-reset`.
- Conexión: **pooler** de Supabase (`DATABASE_URL`, puerto 5432, `sslmode=require`). `npx prisma generate` local necesita `DATABASE_URL`/`DIRECT_URL` seteados (no conecta).
- Triggers en BD manejan `location_geog` (geography/GIST), `search_tsv` (tsvector/GIN) y `subscription_audit_log`. No usar `dbgenerated` con refs a columnas.
- **DateTime Prisma = timestamp SIN tz** (wall-clock UTC). Día Perú en SQL: `AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima'`. `now()` sí es timestamptz.
- **Tier gratis (diseñar para esto):** Render 512MB/0.1vCPU se duerme → Multer con límites + handlers globales `uncaughtException`/`unhandledRejection` que NO matan el proceso. Redis 10k cmds/día → solo cachear catálogos (`@CacheTTL 1h`) y respuestas IA. Supabase 500MB → logs a stdout, nada de tablas de logs masivas.

## 6. Flujo de trabajo (Branch Protection ACTIVA en main)

Cambios importantes: **rama nueva → commit → push a la rama → PR → CI verde (Backend/Mobile/Admin) → squash-merge**. NUNCA push directo a main (lo bloquea). Triviales pueden ir directo. `gh` en `C:\Program Files\GitHub CLI\gh.exe`; token vía `git credential` (scope repo/workflow, **sin read:org** → usar `gh api -X POST/PUT/PATCH repos/L3x-00/OFICIO_APP/...` REST, no `gh pr create/edit`/merge que tocan campos de org). CI corre `npx prisma generate` (no commitear `generated/`). Repo: `L3x-00/OFICIO_APP`. Commits: `Co-Authored-By: Claude ...`.

## 7. Features en producción

- **Funcionalidades por categoría** (feature-gate por `Category.features`, herencia hija→padre): Carta, Catálogo (carrito → pedido WhatsApp), Agenda (slots 30min, recordatorio cron 24h), Cotización. CTA en detalle + entrada en panel.
- **Gating por plan**: carta/catálogo ítems GRATIS 5 / ESTÁNDAR 6 / PREMIUM ∞; agenda días activos/semana 1/3/7 (excede→402).
- **Alcance por distritos** (PR #28): `provider_coverage` = distritos EXTRA (el registrado siempre visible). Límite TOTAL por plan **GRATIS 1 / ESTÁNDAR 3 / PREMIUM 10**, misma provincia. **Gate en LECTURA** (`coverage.visibleInLocalities()`): extras solo si plan pago; al vencer quedan inertes pero se conservan. `syncCoverageToPlan()` (función suelta, try/catch, nunca revierte pago) siembra/recorta tras las 7 activaciones de plan. Endpoints `GET/PUT /provider-profile/me/coverage?type=`. Móvil: sección "Alcance" en tab Perfil.
- **Notificaciones** con discriminador (`AdminNotification.targetProfileType`/`metadata` JSONB para deep-link) — independencia por rol (cliente/OFICIO/NEGOCIO).
- **Búsqueda por radio** (PostGIS `getNearby`) respeta filtros activos; **listado por ubicación** jerárquica dept→prov→dist.
- **Toggles privacidad** (`showPhone`/`showWhatsapp`/`showExactLocation`). **Perfil público de usuario**. **Asistente IA "Ofi"** (guardrails PII/toxicidad/inyección, caché semántico, cuota atómica). **Imágenes CDN**: 2 buckets R2 (público CDN + privado firmado), thumbnails Sharp.
- **Rediseño visual** "cálida artesanal": claro=crema `#FAF7F2`, oscuro=casi negro cálido `#0D0B08`; contraste AA vía onSolid/tintOn.
- **Landing web conectada a API real** (PR #31): hero con foto Huancayo legible en ambos temas (clase `force-dark-zone` contra la inversión `html.light` de globals.css); `solutions-section` con categorías padre reales + marquee infinito + geolocalización ("Ver servicios" → `/buscar?categoria&lat/lng` o fallback `provincia=Huancayo`); `/buscar` acepta deep-links; `providers-section` embebe el registro proveedor como **wizard de 6 pasos** (componente compartido `web/components/onboarding/provider-onboarding-form.tsx`, variantes full/wizard) con código de referido, borrador localStorage e invitados que se registran con Google al FINAL.
- **Coordenadas en registro** (PR #31): `RegisterProviderDto` acepta `latitude/longitude` opcionales y se persisten al crear el Provider (web las saca del enlace de Maps) — antes ningún cliente las enviaba y los proveedores nuevos no salían en búsqueda por radio. Trigger + backfill: `backend/prisma/sql/provider_location_geog_trigger.sql` (aplicado en Supabase).

## 8. Skills del proyecto (auto-cargados en cada chat)

Viven en `.claude/skills/` (versionados) — Claude Code los registra solo al abrir
el repo; encapsulan los flujos repetitivos para no re-derivarlos (ahorro de tokens):

- **/verificar** — checks por diff: tsc+jest backend, analyze+test móvil, admin/web. Correr tras cada cambio importante.
- **/subir-pr** — rama → stage selectivo → commit → push → PR (gh REST) → poll CI → gate SQL → squash-merge → sync main.
- **/sql-prod** — protocolo BD: schema + prisma generate + SQL idempotente que el USUARIO aplica manualmente en Supabase (bloquea merge).
- **/ui-tema** — reglas de color/tema móvil (context.colors, tintOn/onSolid, const, tests con ThemeExtension). Leer ANTES de tocar UI Flutter.
- **/cerrar-tanda** — actualizar este doc (§7/§10) + memoria + reporte final tras mergear.

⚠️ `web/` no tiene check en CI (solo Backend/Mobile/Admin) — su única
verificación es `/verificar` local antes de mergear.

## 9. Comandos y verificación

```bash
# Backend (ESM)
cd backend && npm run start:dev          # dev :3000
npx tsc --noEmit                         # typecheck
npm test                                 # unit (494 pasando)
# Mobile
cd mobile && flutter analyze
cd mobile && flutter test                # 209 pasando
# Admin / Web
cd admin && npm run dev                  # :3001   (type-check aparte: next build ignora TS)
cd web && npm run build                  # :3002
# Infra local
docker-compose up -d
```

Pre-commit (husky + lint-staged): eslint/prettier por subproyecto + `dart format`/`analyze`. RTK: prefijar `rtk` a comandos ahorra 60-90% tokens (incluso en chains con `&&`).

## 10. Estado / pendientes

- **Desplegado:** todo el backlog OBSERVACIONES (10 ítems, PRs #20–#25), correos (#26), tema adaptativo + back-panel (#27), Alcance por distritos (#28, SQL aplicado), landing web + wizard registro + coords en registro (#31, SQL trigger aplicado), descarga QR Yape migrada a `gal` + `file_paths.xml` faltante (#33). Trigger `subscription_audit_log` aplicado y versionado en `backend/prisma/sql/audit_log.sql` (#34) — lo usa `payments.service` vía GUC `app.current_user_id`. **Reducción de superficie:** subastas + ofertas OCULTAS en todo el ecosistema (ver §3), PlanRequest deprecado (tab admin retirado, métodos móviles borrados; endpoint vivo para apps viejas, tabla se conserva), retención de notifs leídas 7d / no leídas 30d, fix fila histórica de payments en primer pago Yape, fix markNotificationRead admin sin scope.
- **Pendiente:** Móvil aún NO envía lat/lng al registrar (el DTO ya las acepta — adopción pendiente). Recompilar .aab para que el ocultamiento llegue a Play. CORS prod (`ALLOWED_ORIGINS`) no incluye `localhost:3002`: probar integración web local vía proxy. Grafo `graphify-out/` desactualizado. Nota: el `AuditLog @@map("audit_log")` + `AuditLogService` de la auditoría V2 (ver memoria) NUNCA se commiteó — es tema aparte del trigger de #34.
- **Docs:** este archivo + `docs/ESTADO_ACTUAL.md` (puntero) + `docs/ARQUITECTURA_DESPLIEGUE.md` (arquitectura/infra detallada). Las copias en la RAÍZ están gitignored (punteros locales). Memorias de sesión en `~/.claude/projects/.../memory/`.
