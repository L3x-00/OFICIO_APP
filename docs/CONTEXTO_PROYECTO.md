# CONTEXTO DEL PROYECTO — Servi (oficio_app)

**Fuente de verdad única y portable.** Pégalo en cualquier chat nuevo de Claude
Code (o de claude.ai) para dar contexto completo del sistema sin explorar
archivo por archivo. En este repo se **auto-carga** vía `@docs/CONTEXTO_PROYECTO.md`
en `CLAUDE.md`. Mantener actualizado al cerrar cada tanda de cambios.

**Última actualización:** 2026-07-08 · Estado: producción, backlog OBSERVACIONES completo + Alcance por distritos desplegado.

---

## 1. Qué es

**Servi** = marketplace de servicios locales para ciudades intermedias del Perú
(electricistas, gasfiteros, peluquerías, restaurantes, etc.). Mercado base: Junín
(Huancayo). **Modelo:** clientes gratis; proveedores pagan suscripción
(GRATIS / ESTÁNDAR / PREMIUM). Un usuario puede ser cliente y además tener perfil
proveedor OFICIO y/o NEGOCIO — los tres perfiles son independientes.

## 2. Apps, stack y despliegue

| App | Stack | Puerto dev | Despliegue |
|-----|-------|-----------|-----------|
| **mobile/** | Flutter 3.41.6 (Dart), provider (ChangeNotifier), go_router, dio | — | .aab a Google Play (recompilar para publicar) |
| **backend/** | NestJS 11 (TypeScript **ESM**), Prisma 7.8 + PrismaPg | 3000 | Render (`oficio-backend.onrender.com`), `main` auto-deploy, health `GET /health` |
| **admin/** | Next.js 16 (TS + Tailwind **v3**) | 3001 | — |
| **web/** | Next.js 16 (landing + panel proveedor + chat + perfil público) | 3002 | — |

**Infra:** Supabase PostgreSQL 16 + PostGIS · Upstash Redis (cache/throttle/cuota IA) · Cloudflare R2 / MinIO (storage) · Firebase FCM (push) · WebSocket socket.io (`events/`, vía Pusher). Local: `docker-compose up -d` (Postgres+PostGIS, Redis 7.2, MinIO).

## 3. Módulos

**backend/src/** — `auth` (JWT, OTP, social) · `users` · `providers` (listado/detalle/analytics/nearby) · `provider-profile` (panel propio + coverage) · `reviews` (GPS/QR) · `favorites` · `chat` · `menu` (carta) · `catalog` · `appointments` (agenda) · `quotations` (cotización) · `coverage` (alcance por distrito) · `offer-posts` · `subastas` · `referrals` (canje monedas→plan) · `payments` (Yape + MercadoPago) · `trust-validation` · `user-reports` · `admin` (+services: dashboard/trust/reports/payments) · `ai-assistant` ("Ofi", aislado) · `events` (WS) · `firebase` (push) · `email` · `localities` · `common` (MinioService, provider-features.service, storefront.helpers) · `generated` (cliente Prisma, regenera en CI — no editar). Schema: `backend/prisma/schema.prisma`.

**mobile/lib/features/** — `auth` · `providers_list` (listado+detalle+reseñas+filtros+radio) · `provider_dashboard` (panel proveedor, tabs) · `favorites` · `chat` · `menu` · `catalog` · `agenda` · `quotation` · `subastas` · `offer_posts` · `referrals` · `notifications` · `payments` · `trust_validation` · `localities` · `ai_assistant` · `showcase`. **mobile/lib/core/** — `constants` (app_colors), `theme` (app_theme_colors, theme_provider), `network` (dio_client), `router`, `services`, `errors`, `utils`, `widgets`. Cada feature: `data/` (repo) · `domain/` (models) · `presentation/` (screens/widgets/providers).

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

- **Desplegado:** todo el backlog OBSERVACIONES (10 ítems, PRs #20–#25), correos (#26), tema adaptativo + back-panel (#27), Alcance por distritos (#28, SQL aplicado).
- **Pendiente:** aplicar `backend/prisma/sql/audit_log.sql` a Supabase (idempotente; hasta entonces las escrituras de auditoría fallan en silencio, no rompen nada). Grafo `graphify-out/` desactualizado (no refleja coverage). Deuda: dos flujos de pago paralelos (`YapePayment` vs `PlanRequest`).
- **Docs:** este archivo + `docs/ESTADO_ACTUAL.md` (puntero) + `docs/ARQUITECTURA_DESPLIEGUE.md` (arquitectura/infra detallada). Las copias en la RAÍZ están gitignored (punteros locales). Memorias de sesión en `~/.claude/projects/.../memory/`.
