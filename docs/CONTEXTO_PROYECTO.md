# CONTEXTO DEL PROYECTO — Servi (oficio_app)

**Fuente de verdad única y portable.** Pégalo en cualquier chat/agente nuevo para
dar contexto completo sin explorar archivo por archivo. Claude lo auto-carga vía
`@docs/CONTEXTO_PROYECTO.md` en `CLAUDE.md`; Codex debe leerlo explícitamente por
instrucción de `AGENTS.md`. Mantener actualizado al cerrar cada tanda.

**Última actualización:** 2026-07-22 · Estado: producción en `main@db0d000` (PR #49) verificada en Render y Vercel. Subastas, ofertas, referidos/monedas, agenda y cotización continúan OCULTAS de forma reversible; Carta y Catálogo siguen visibles solo para proveedores NEGOCIO.

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
| **backend/** | NestJS 11 (TypeScript **ESM**), Prisma CLI 7.8 + `@prisma/client` 7.6 + PrismaPg | 3000 | Render (`oficio-backend.onrender.com`), `main` auto-deploy, health `GET /health` |
| **admin/** | Next.js 16 (TS + Tailwind **v3**) | 3001 | Vercel (`oficioadmin`) |
| **web/** | Next.js 16 (landing + panel proveedor + chat + perfil público) | 3002 | Vercel (`oficio_web`) |

**Infra:** Supabase PostgreSQL 16 + PostGIS · Upstash Redis (cache/throttle/cuota IA) · Cloudflare R2 / MinIO (storage) · Firebase FCM (push) · WebSocket Socket.IO (`events/`). Local: `docker-compose up -d` (Postgres+PostGIS, Redis 7.2, MinIO).

## 3. Módulos

**backend/src/** — `auth` (JWT, OTP, social) · `users` · `providers` (listado/detalle/analytics/nearby) · `provider-profile` (panel propio + coverage) · `reviews` (GPS/QR) · `favorites` · `chat` · `menu` (carta) · `catalog` · `appointments` (agenda) · `quotations` (cotización) · `coverage` (alcance por distrito) · `offer-posts` ⛔OCULTO · `subastas` ⛔OCULTO · `referrals` (canje monedas→plan) · `payments` (Yape + MercadoPago; PlanRequest DEPRECADO) · `trust-validation` · `user-reports` · `admin` (+services: dashboard/trust/reports/payments) · `ai-assistant` ("Ofi", aislado) · `events` (WS) · `firebase` (push) · `email` · `localities` · `common` (MinioService, provider-features.service, storefront.helpers, **feature-flag.guard**) · `generated` (cliente Prisma, regenera en CI — no editar). Schema: `backend/prisma/schema.prisma`.

**mobile/lib/features/** — `auth` · `providers_list` (listado+detalle+reseñas+filtros+radio) · `provider_dashboard` (panel proveedor, tabs) · `favorites` · `chat` · `menu` · `catalog` · `agenda` · `quotation` · `subastas` ⛔OCULTO · `offer_posts` ⛔OCULTO · `referrals` · `notifications` · `payments` · `trust_validation` · `localities` · `ai_assistant` · `showcase`. **mobile/lib/core/** — `constants` (app_colors, **feature_flags**), `theme` (app_theme_colors, theme_provider), `network` (dio_client), `router`, `services`, `errors`, `utils`, `widgets`. Cada feature: `data/` (repo) · `domain/` (models) · `presentation/` (screens/widgets/providers).

**Features ocultas (2026-07, código intacto):**
- **Subastas "ConfiServ" y ofertas:** reactivar con `FEATURE_SUBASTAS=true` / `FEATURE_OFERTAS=true` en Render, flags móviles y navs web/admin comentados. Tablas intactas; `/admin/offers`, `/admin/offer-reports` y `expireOffers` histórico siguen vivos.
- **Referidos/monedas, agenda y cotización (PR #37):** endpoints públicos devuelven 404 con `FEATURE_REFERIDOS`, `FEATURE_AGENDA` y `FEATURE_COTIZACION`; flujos internos salen temprano con la misma variable. Móvil usa `kReferidosEnabled=false`; Agenda/Cotización se ocultan dinámicamente desde el array backend `features`; web usa `NEXT_PUBLIC_FEATURE_REFERIDOS`. Ofi no declara herramientas de monedas y la fila `ai_knowledge_entries.topic = 'referidos_y_monedas'` quedó inactiva mediante SQL manual.
- **Carta y Catálogo:** continúan activos para `NEGOCIO`; `OFICIO` no recibe `carta_digital`/`catalogo` en `features` y sus endpoints de lectura/gestión lo bloquean. No existe flag actual para OFICIO: reactivarlo requiere PR backend con switches reversibles.

Runbook exacto, independiente por funcionalidad: [`REACTIVACION_FUNCIONALIDADES_OCULTAS.md`](REACTIVACION_FUNCIONALIDADES_OCULTAS.md). No revertir PR #36/#37 completos ni reactivar `PlanRequest`.

## 4. Convenciones NO negociables

- **Backend ESM**: imports locales SIEMPRE con extensión `.js` (`./x.service.js`). Sin `.js` = build roto.
- **Flutter feature-first** + **tema dinámico**: colores vía `context.colors` (AppThemeColors) para fondos/texto; acentos de marca vía `AppColors.*`; texto de acento sobre su tinte via `AppColors.tintOn(accent, c.isDark)`; glifo sobre fill sólido via `AppColors.onSolid(accent)`. NUNCA `AppColors.bgDark/textPrimary` estáticos ni `Colors.white/black` para superficies temáticas. Tema por defecto = **sistema**.
- **Providers globales**: los `ChangeNotifier` compartidos (Auth, Dashboard, Providers, Chat) son GLOBALES, no locales a un tab (evita `ProviderNotFoundException`). Su caché se limpia en logout (`_clearAll`/`attachAuth`) o filtra datos del usuario anterior.
- **Admin Tailwind v3** (no v4): `postcss.config.mjs` usa `tailwindcss: {}`.
- **Respuestas de auth**: login/verify-otp/social-login devuelven `userId`+`role` (móvil hace `data['userId'] as int` → si falta, crashea y no guarda sesión).

## 5. Base de datos y migraciones (LEER antes de tocar schema)

- **Baseline repo reparado:** `backend/prisma/migrations/0_init` único fue validado desde cero. Estado de `resolve --applied` en Supabase no confirmado; por eso producción NO usa `migrate deploy`. CI sincroniza solo su BD efímera con `db push`.
- **REGLA DURA:** cambios aditivos van por SQL idempotente en `backend/prisma/sql/`; el usuario aplica TODO SQL a Supabase **manualmente**. Ningún agente usa `execute_sql`, `apply_migration`, `migrate deploy`, `db push` ni `--force-reset` contra prod.
- Conexión: **pooler** de Supabase (`DATABASE_URL`, puerto 5432, `sslmode=require`). `npx prisma generate` local necesita `DATABASE_URL`/`DIRECT_URL` seteados (no conecta).
- Triggers en BD manejan `location_geog` (geography/GIST), `search_tsv` (tsvector/GIN) y `subscription_audit_log`. No usar `dbgenerated` con refs a columnas.
- **DateTime Prisma = timestamp SIN tz** (wall-clock UTC). Día Perú en SQL: `AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima'`. `now()` sí es timestamptz.
- **Tier gratis (diseñar para esto):** Render 512MB/0.1vCPU se duerme → Multer con límites + handlers globales `uncaughtException`/`unhandledRejection` que NO matan el proceso. Redis 10k cmds/día → solo cachear catálogos (`@CacheTTL 1h`) y respuestas IA. Supabase 500MB → logs a stdout, nada de tablas de logs masivas.

## 6. Flujo de trabajo (Branch Protection ACTIVA en main)

Cambios importantes: **rama nueva → commit → push a la rama → PR → CI verde (Backend/Mobile/Admin+Web) → squash-merge**. NUNCA push directo a main (lo bloquea). Triviales pueden ir directo. `gh` en `C:\Program Files\GitHub CLI\gh.exe`; token vía `git credential` (scope repo/workflow, **sin read:org** → usar `gh api -X POST/PUT/PATCH repos/L3x-00/OFICIO_APP/...` REST, no `gh pr create/edit`/merge que tocan campos de org). CI corre `npx prisma generate` (no commitear `generated/`). Repo: `L3x-00/OFICIO_APP`. Trailer de commit = agente real (`Claude <noreply@anthropic.com>` u `OpenAI Codex <noreply@openai.com>`).

## 7. Features en producción

- **Funcionalidades por categoría** (feature-gate por `Category.features`, herencia hija→padre): Carta y Catálogo (carrito → pedido WhatsApp) están activos solo para `NEGOCIO`; `OFICIO` queda bloqueado en filtro, lectura y gestión. Agenda (slots 30 min, recordatorio cron 24 h) y Cotización permanecen en código, pero ocultas por `FEATURE_AGENDA` / `FEATURE_COTIZACION`; sus CTA y entradas de panel no se muestran.
- **Referidos y monedas:** flujo, historial y tablas se conservan; con `FEATURE_REFERIDOS` apagado no acredita monedas ni expone endpoints, UI, notificaciones o herramientas Ofi. Las pruebas cubren ambos estados del flag.
- **Gating por plan**: carta/catálogo ítems GRATIS 5 / ESTÁNDAR 6 / PREMIUM ∞; agenda días activos/semana 1/3/7 (excede→402).
- **Alcance por distritos** (PR #28): `provider_coverage` = distritos EXTRA (el registrado siempre visible). Límite TOTAL por plan **GRATIS 1 / ESTÁNDAR 3 / PREMIUM 10**, misma provincia. **Gate en LECTURA** (`coverage.visibleInLocalities()`): extras solo si plan pago; al vencer quedan inertes pero se conservan. `syncCoverageToPlan()` (función suelta, try/catch, nunca revierte pago) siembra/recorta tras las 7 activaciones de plan. Endpoints `GET/PUT /provider-profile/me/coverage?type=`. Móvil: sección "Alcance" en tab Perfil.
- **Notificaciones** con discriminador (`AdminNotification.targetProfileType`/`metadata` JSONB para deep-link) — independencia por rol (cliente/OFICIO/NEGOCIO). Retención efectiva: leídas 5 días, no leídas 30 días; backend y móvil aplican el mismo criterio. Móvil informa de forma discreta cuando depura historial vencido.
- **Auth manual móvil:** un login fallido o un registro con correo duplicado permanece en su pantalla y muestra error amigable; el modo invitado solo se limpia después de autenticación exitosa. No confundir fallo de credenciales con usuario nuevo ni redirigirlo al onboarding.
- **Estados de proveedor importantes:** aprobación y rechazo viajan por notificación persistida + FCM. Móvil en foreground, resume o cold start consume una cola local y muestra overlay global; aprobación usa celebración ligera y rechazo conserva el motivo. Cada evento se marca consumido para no repetirse.
- **Admin operativo:** notificaciones con filtros de fecha en servidor, refresco Socket.IO (`notification`/`adminEvent`), reconexión, fallback visible de 60 s y cierre de socket en logout. Referidos/Recompensas están ocultos solo en navegación/dashboard; rutas e historial siguen vivos. Si un proveedor no tiene imágenes, Admin puede subir exactamente una imagen inicial; no existe CRUD, reemplazo ni borrado administrativo.
- **Búsqueda por radio** (PostGIS `getNearby`) respeta filtros activos; **listado por ubicación** jerárquica dept→prov→dist.
- **Toggles privacidad** (`showPhone`/`showWhatsapp`/`showExactLocation`). **Perfil público de usuario**. **Asistente IA "Ofi"** (guardrails PII/toxicidad/inyección, caché semántico, cuota atómica). **Imágenes CDN**: 2 buckets R2 (público CDN + privado firmado), thumbnails Sharp.
- **Rediseño visual** "cálida artesanal": claro=crema `#FAF7F2`, oscuro=casi negro cálido `#0D0B08`; contraste AA vía onSolid/tintOn.
- **Landing web conectada a API real** (PR #31): hero con foto Huancayo legible en ambos temas (el hero conserva `force-dark-zone`); `solutions-section` con categorías padre reales + marquee infinito + geolocalización ("Ver servicios" → `/buscar?categoria&lat/lng` o fallback `provincia=Huancayo`); `/buscar` acepta deep-links; `providers-section` embebe el registro proveedor como **wizard de 6 pasos** (componente compartido `web/components/onboarding/provider-onboarding-form.tsx`, variantes full/wizard) con código de referido, borrador localStorage e invitados que se registran con Google al FINAL. El release PR #49 incorpora tema semántico adaptativo en ese bloque, elimina su `force-dark-zone` y actualiza la marca a Servi.
- **UX móvil integrada en PR #49:** bottom sheets de registro/filtros usan root navigator; Perfil unifica altas y estados OFICIO/NEGOCIO en "Mis perfiles"; clientes puros pueden ocultar el FAB de Ofi con `SharedPreferences`. Los flags de Subastas/Ofertas/Referidos permanecen apagados.
- **Coordenadas en registro** (PR #31): `RegisterProviderDto` acepta `latitude/longitude` opcionales y se persisten al crear el Provider (web las saca del enlace de Maps) — antes ningún cliente las enviaba y los proveedores nuevos no salían en búsqueda por radio. Trigger + backfill: `backend/prisma/sql/provider_location_geog_trigger.sql` (aplicado en Supabase).

## 8. Skills y preflight de agentes

Claude usa `.claude/skills/`; Codex usa `.agents/skills/`. Encapsulan flujos
repetitivos para no re-derivarlos. Al cambiar una regla compartida, sincronizar
ambas variantes. Las reglas Servi de `/sql-prod` prevalecen sobre skills
genéricos Supabase/Postgres.

- **/servi-preflight** (Codex) — estado compacto: rama/diff, apps, gate SQL,
  contexto, Graphify, memoria, skills, artefactos, RTK y Node esperado.
- **/verificar** — checks por diff: tsc+jest backend, analyze+test móvil, admin/web. Correr tras cada cambio importante.
- **/subir-pr** — rama → stage selectivo → commit → push → PR (gh REST) → poll CI → gate SQL → squash-merge → sync main.
- **/sql-prod** — protocolo BD: schema + prisma generate + SQL idempotente que el USUARIO aplica manualmente en Supabase (bloquea merge).
- **/ui-tema** — reglas de color/tema móvil (context.colors, tintOn/onSolid, const, tests con ThemeExtension). Leer ANTES de tocar UI Flutter.
- **/cerrar-tanda** — actualizar este doc (§7/§10) + memoria + reporte final tras mergear.

`web/` se construye dentro del status protegido **Admin (Next.js)**; `/verificar`
mantiene además el build local dirigido.

### Mapa documental

- `docs/CONTEXTO_PROYECTO.md`: fuente canónica de estado, stack, reglas y pendientes.
- `docs/ARQUITECTURA_DESPLIEGUE.md`: infraestructura, despliegue, resiliencia y BD.
- `docs/SEGURIDAD_OPERATIVA.md`: estado auditado y runbook de TLS, correo, MFA, Android, Supabase y origen Render; distingue verificación de aplicación.
- `docs/REACTIVACION_FUNCIONALIDADES_OCULTAS.md`: reactivación y rollback independiente de las cinco features ocultas y Carta/Catálogo para OFICIO.
- `docs/ESTADO_ACTUAL.md`: puntero corto a este documento; no duplica estado.
- `docs/AUDITORÍA_TÉCNICA.md`: snapshot histórico del 2026-06-02; no usar como estado vivo.
- `graphify-out/GRAPH_REPORT.md` y `graphify-out/graph.json`: mapa estructural; confiar solo si `npm run preflight` marca `FRESH`. La frescura compara cambios commiteados de fuente de apps; commits solo de docs/tooling no invalidan el grafo.

### Inicio de un chat nuevo

```text
Trabaja en C:\Users\Usuario\oficio_app. Antes de editar, ejecuta npm run preflight
y lee docs/CONTEXTO_PROYECTO.md. Preserva el árbol sucio y no toques mobile/
inconcluso sin briefing. Si Graphify está FRESH, consúltalo; si está STALE,
usa contexto canónico + rg y no lo regeneres sobre trabajo incompleto.
```

## 9. Comandos y verificación

```bash
# Backend (ESM)
cd backend && npm run start:dev          # dev :3000
npx tsc --noEmit                         # typecheck
npm test                                 # unit (571 pasando)
npm run test:integration                 # requiere stack Docker local
npm run test:e2e                         # requiere stack Docker local
npx cross-env RUN_GEMINI_CONTRACT_TESTS=true npm run test:contract  # Gemini real; requiere clave local
# Mobile
cd mobile && flutter analyze
cd mobile && flutter test                # 220 pasando
# Admin / Web
cd admin && npm run dev                  # :3001   (type-check aparte: next build ignora TS)
cd web && npm run build                  # :3002
# Infra local
docker-compose up -d
```

Pre-commit (husky + lint-staged): backend/admin con eslint/prettier y móvil con
`dart format`/`analyze`; web queda gateado por `next build` en CI.

Node objetivo = 20 (`.nvmrc` + GitHub Actions). Si `npm run preflight` reporta
Node 24 u otra versión local, cambiar a Node 20 (`nvm use 20`, `fnm use 20` o
equivalente) antes de instalar dependencias o construir apps Node.

Preflight: `npm run preflight`. RTK es opcional: si no existe en PATH, usar el
comando directo sin reintentar (ausente en PowerShell al 2026-07-11).

Web Next 16: `web/` debe usar `proxy.ts` (no `middleware.ts`), `metadataBase`
en `app/layout.tsx` y `turbopack.root` en `next.config.ts` para evitar warnings
de build en monorepo.

**Verificación local completa 2026-07-22, Node 20.20.2 / Flutter 3.41.6:**
backend 63 suites/571 unitarios, 19/101 integración sobre Postgres local, 2/16
E2E y 1/7 contratos Gemini reales; TypeScript, build y ESLint pasan. ESLint
conserva 262 warnings históricos y cero errores. Cobertura backend: 58.23%
statements, 50.68% branches, 43.65% functions y 58.80% lines. Jest todavía
emite el warning histórico de `forceExit`/handles abiertos después de pasar.
Mobile: 220/220 y cobertura 12.4% (3468/27873), superior al ratchet 9%; analyze
con 14 infos de estilo y cero warnings/errores. Admin: 9 archivos/25 tests,
type-check y build OK; cobertura 15.04% statements/lines, 69.66% branches y
41.29% functions. Su lint global conserva deuda previa de 84 errores/24
warnings; CI lo trata como informativo. Web no define tests; build y TypeScript
OK. No se construyó `.aab` por decisión del propietario. Producción y Supabase
no fueron modificados durante estos checks.

**Producción confirmada 2026-07-22:** PR #49 squash `db0d000`; CI Backend,
Mobile y Admin/Web verde. Render `GET /health` responde `ok` y el endpoint nuevo
de foto Admin sin JWT responde 401, comprobando runtime nuevo sin mutar datos.
Vercel web/admin completó deploy; web redirige al `www` y termina 200; Admin
expone headers defensivos y CSP `Report-Only`. Auditorías npm del 2026-07-16:
cero vulnerabilidades high/critical; moderadas conocidas backend 20, admin 10,
web 2 y una low admin, sin `--force` por riesgo de downgrades/cambios mayores.

## 10. Estado / pendientes

- **Desplegado antes de PR #49:** todo el backlog OBSERVACIONES (10 ítems, PRs #20–#25), correos (#26), tema adaptativo + back-panel (#27), Alcance por distritos (#28, SQL aplicado), landing web + wizard registro + coords en registro (#31, SQL trigger aplicado), descarga QR Yape migrada a `gal` + `file_paths.xml` faltante (#33). Trigger `subscription_audit_log` aplicado y versionado en `backend/prisma/sql/audit_log.sql` (#34) — lo usa `payments.service` vía GUC `app.current_user_id`. **Reducción de superficie:** subastas, ofertas, referidos/monedas, agenda y cotización OCULTAS; Carta/Catálogo restringidos a NEGOCIO. PlanRequest deprecado (endpoint vivo para apps viejas; tabla conservada), retención previa de notifs leídas 7d / no leídas 30d, fix fila histórica de payments en primer pago Yape y fix `markNotificationRead` admin sin scope.
- **Mergeado y verificado:** PR #37, squash `002791d` (2026-07-12), ocultó referidos/monedas, agenda y cotización en backend, móvil, web y Ofi sin borrar código. El usuario aplicó manualmente `backend/prisma/sql/ocultar_features_kb.sql` en Supabase: solo desactiva la entrada de conocimiento de Ofi; no cambia schema ni elimina triggers/funciones. El 2026-07-13 se verificaron Render sano, flags públicos apagados, CI verde y deploys Vercel web/admin exitosos.
- **Release consolidado 2026-07 desplegado:** PR #49, squash `db0d000`, apiló PRs #39–#48. Incluye hardening 7A–7F, runtime Next 16, UX autorizada web/móvil, errores de auth manual, retención 5/30 días, overlays globales de aprobación/rechazo, ciclo de notificaciones Admin, ocultamiento Admin de Referidos/Recompensas y alta única de foto faltante. Render/Vercel y CI verificados el 2026-07-22. No hubo schema, SQL ni ejecución contra Supabase.
- **Hardening 7A–7F versionado en PR #39 e integrado en #49:** subidas autenticadas con límites, decodificación/re-encode Sharp y descarte de metadatos; validación de origen/carpeta para URLs gestionadas; DTO estricto para perfil propio, guards/roles y privacidad de perfiles públicos; paginación acotada; login social exige proveedor confiable y `email_verified`, sin vincular UIDs distintos por email; usuarios suspendidos pierden refresh tokens y WebSocket revalida usuario/rol contra BD; CSV neutraliza fórmulas; fallback de correo no registra OTP/URLs/destinatarios; admin agrega headers defensivos y CSP `Report-Only`. No incluye certificate pinning, WAF agresivo ni controles externos.
- **Graphify 2026-07-22:** regenerado desde worktree limpio y anclado a `db0d000` tras comprobar diff fuente cero contra el snapshot previo: 945 archivos, 9,242 nodos, 14,871 relaciones y 462 comunidades. `graph.html` ya no se genera porque supera el límite visual de 5,000 nodos; usar `GRAPH_REPORT.md`, `graph.json` y `graphify query`. El grafo excluye cambios locales sin commit; commits solo documentales/tooling no invalidan su frescura.
- **Trabajo local ajeno preservado:** el árbol principal mantiene ajustes no versionados del usuario en web/mobile y artefactos generados. No forman parte de #49 salvo los commits UX explícitos #41/#42. Nunca usar `git add -A`, regenerar Graphify allí ni revertirlos.
- **Seguridad operativa pendiente:** ejecutar manualmente y por separado `docs/SEGURIDAD_OPERATIVA.md`: rotar la cuenta de prueba expuesta y revocar sesiones; fijar TLS mínimo 1.2 en Cloudflare; configurar SPF/DKIM y luego DMARC en observación; exigir MFA; confirmar integraciones externas antes de apagar Supabase Data API; habilitar SSL obligatorio de Postgres solo en ventana porque reinicia la BD; no bloquear todavía el origen directo de Render. Estado documentado no significa aplicado.
- **Pendiente manual:** recompilar/publicar `.aab` queda a cargo del usuario. Smoke autenticado Admin de filtro de notificaciones y alta de foto sobre proveedor sin imágenes requiere cuenta Admin; no se ejecutó con credenciales de cliente. Móvil aún NO envía lat/lng al registrar (DTO ya acepta; adopción pendiente). CORS prod (`ALLOWED_ORIGINS`) no incluye `localhost:3002`: integración web local debe usar proxy. `test:cov` modifica artefactos versionados de `coverage/`; no stagearlos. Limpieza técnica de settings/coverage/generated queda en PR separado. El `AuditLog @@map("audit_log")` + `AuditLogService` de auditoría V2 nunca se commiteó; no confundir con trigger #34.
- **Docs:** fuente viva `docs/CONTEXTO_PROYECTO.md`; arquitectura en `docs/ARQUITECTURA_DESPLIEGUE.md`; seguridad operativa en `docs/SEGURIDAD_OPERATIVA.md`; reactivación en `docs/REACTIVACION_FUNCIONALIDADES_OCULTAS.md`; reporte de esta tanda en `docs/REPORTE_RELEASE_2026-07-22.md`; `docs/ESTADO_ACTUAL.md` es puntero y `docs/AUDITORÍA_TÉCNICA.md` es histórico.
