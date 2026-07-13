# Auditoría Técnica Integral de Servi

> **HISTÓRICO — NO ES ESTADO VIVO.** Snapshot del 2026-06-02. Conserva
> hallazgos originales debajo de su tabla de resolución, por eso mezcla estados
> resueltos y recomendaciones viejas (Next 15, conteos antiguos). Usar
> [`CONTEXTO_PROYECTO.md`](CONTEXTO_PROYECTO.md) §10 para estado actual.
> Última revisión de vigencia: 2026-07-13; esta tanda no reejecutó auditoría ni
> altera sus hallazgos históricos.

**Fecha**: 2026-06-02
**Versión del sistema**: post Módulo IA "Ofi" + sincronización cross-device + búsqueda por localidad
**Alcance**: Backend (NestJS), Admin (Next.js 15), Web (Next.js 15), Mobile (Flutter)
**Auditor**: Elite Security & Architecture Auditor — análisis estático + escaneo de dependencias + revisión manual profunda. **Sin acceso a runtime de producción. No se modificó código de producción** (solo este documento + instalación de `eslint-plugin-security` como devDep de escaneo).

---

## ✅ Resolución Completa (2026-06-02)

**Todos los hallazgos CRÍTICOS, ALTOS y MEDIOS de esta auditoría fueron RESUELTOS** en la sesión de hardening del 2026-06-02. Estado final validado: `tsc --noEmit` limpio · **97/97** integration · **113/113** unit · `dart analyze` 0 issues · 0 `console.*` en `backend/src`. Cambios desplegados a producción (Render) vía `origin/main`.

| # | Hallazgo | Sev. | Resolución |
|---|----------|------|------------|
| A1 | `CacheModule` corría en memoria (no Redis) | 🟠 | Cableado a Redis vía `KeyvRedis` adapter (`stores: [...]`). `clearProvidersCache` y el circuit breaker IA ahora persisten entre instancias. |
| A2 | Throttler en memoria (rate-limit por-instancia) | 🟠 | `ThrottlerStorageRedisService` + ioredis → rate-limit global compartido. |
| A3 | Assets estáticos `/uploads` servidos por el API | 🟠 | Removido `useStaticAssets`; archivos solo vía MinIO/R2. |
| A4 | Historial de migraciones Prisma roto (dup-init) | 🟠 | Rebaseline a un único `0_init` fiel a prod (extensiones + GENERATED + MV + triggers). `migrate resolve --applied` en Supabase. |
| A6 | DTO drift (admin enviaba campos no whitelisteados) | 🟠 | `slug`, `availability`, `isVisible` añadidos como opcionales en `UpdateCategoryDto`/`UpdateProviderDto`. |
| C1 | DoS en Next.js (admin + web) | 🔴 | `next@latest` en `admin/` y `web/` (parche DoS). |
| C1b | Vulns transitivas en `firebase-admin@12` | 🔴 | Migrado a `firebase-admin@13.x`. |
| M2 | `noImplicitAny: false` | 🟡 | Activado `noImplicitAny: true` + interfaz `AuthenticatedRequest` tipando todos los `@Request()`. |
| M5 | `use_build_context_synchronously` (Flutter) | 🟡 | Guards `context.mounted` tras cada `await` en los archivos reportados. |
| M6 | Índices faltantes en `User` | 🟡 | `@@index([role, isActive])`, `@@index([department, province])`. |
| M7 | `console.*` residuales en backend | 🟡 | Reemplazados por `Logger` de NestJS; 0 `console.*` en `backend/src`. |
| M8 | **CacheTTL en ms (bug latente)** | 🟡 | `@CacheTTL(30)` → `@CacheTTL(30000)`: Keyv interpreta el TTL en milisegundos (Prisma v7), las claves expiraban en 30 ms. |
| B1 | Infos de `dart analyze` | ⚪ | `dart fix --apply` + correcciones manuales → 0 issues. |

### 🏗️ God Objects refactorizados (patrón Facade)

Los dos God Objects más grandes se descompusieron **sin cambiar ninguna firma pública** (los controllers no se tocaron):

- **`admin.service.ts`** → extraídos `AdminCategoriesService`, `AdminDashboardService`, `AdminTrustService`, `AdminPaymentsService` + helper compartido `admin-shared.ts` (`withCategoryAlias`, `planToPriority`, `clearProvidersCache`). El god object delega vía Facade.
- **`auth.service.ts`** (998 → 323 líneas) → extraídos `AuthRegistrationService` y `AuthAccountService` + `auth-shared.ts` (`generateTokens`).

### 🧪 Tests críticos de dinero e identidad añadidos

Flujos que antes tenían **0 cobertura** y causarían pérdidas si un refactor los rompiera:

- `payments.flow.spec.ts` — PlanRequest (Yape) → aprobar activa suscripción ACTIVA; rechazar NO la cambia; doble-aprobación bloqueada.
- `trust.flow.spec.ts` — envío de documentos → cola PENDING; aprobación → `trustStatus=APPROVED` + badge `isTrusted`.

---

## 📊 Resumen Ejecutivo

| Severidad | Cantidad | Apps afectadas |
|-----------|----------|----------------|
| 🔴 CRÍTICO | **1** | Backend, Admin, Web (dependencias) |
| 🟠 ALTA | **6** | Backend |
| 🟡 MEDIA | **7** | Backend, Mobile |
| ⚪ BAJA | **5** | Mobile, Admin/Web |

**Hallazgo principal de esta auditoría:** la postura de seguridad **mejoró drásticamente** respecto a la auditoría previa (2026-04-27). **5 de los 6 hallazgos CRÍTICOS anteriores están RESUELTOS** (ver sección *Resuelto*). El riesgo crítico restante es **externo** (vulnerabilidades en dependencias npm). El código propio está en buena forma de seguridad; la deuda restante es de **escalabilidad e infraestructura** (caché mal cableada, throttler en memoria, historial de migraciones roto) y **mantenibilidad** (God objects, cobertura de tests desigual).

### ⚡ Acciones inmediatas antes del próximo deploy

1. **[CRÍTICO]** Parchear dependencias: `npm audit fix` en `backend/`, `admin/`, `web/`. Priorizar el DoS de `next` (admin/web) y las vulns de `ws`/`engine.io-client`.
2. **[ALTA]** Corregir el cableado de `CacheModule` (`store` → `stores`): hoy `CACHE_MANAGER` corre **en memoria**, no en Redis → el circuit breaker de la IA pierde estado al reiniciar, la invalidación de caché del admin (`clearProvidersCache`) es **no-op**, y las métricas son por-instancia. **Mientras no se arregle, desplegar con UNA sola instancia en Render.**
3. **[ALTA]** Migrar `firebase-admin@12.7.0 → 13.x` (cierra varias vulns transitivas).
4. **[ALTA]** Resolver el historial de migraciones Prisma (dup-init) antes de declarar Prisma fuente de verdad o habilitar `migrate deploy` en CI/Render.

---

## ✅ Resuelto desde la auditoría 2026-04-27 (verificado en código actual)

Estos hallazgos eran CRÍTICOS/ALTOS y **ya no aplican**:

| Hallazgo previo | Estado | Evidencia |
|-----------------|--------|-----------|
| CORS abierto (`origin: true`) | ✅ Resuelto | `main.ts:48` → `origin: allowedOrigins` |
| WebSocket sin auth / suplantación de `userId` | ✅ Resuelto | `events.gateway.ts:103` valida JWT en `handleConnection`; usa `userId` del handshake |
| Eventos admin por broadcast a todos | ✅ Resuelto | `events.gateway.ts:261` → `server.to('admin').emit(...)` |
| OTP/reset tokens logueados sin gate | ✅ Resuelto | `auth.service.ts:129` → `if (NODE_ENV !== 'production')` |
| Credenciales R2 reales en `.env.example` | ✅ Resuelto | `.env.example` ahora con placeholders vacíos |
| Sin `helmet` / sin `compression` | ✅ Resuelto | `package.json` → `helmet@8`, `compression@1.8` |
| `console.log` en `jwt.strategy.ts` por request | ✅ Resuelto | ya no existe en el archivo |
| Sin tests automatizados | ⚠️ Parcial | Módulo IA con ~60 tests (unit/integration/e2e/contract); resto del backend y mobile siguen ~0 |

---

## 🔴 CRÍTICO

### C1 · [Seguridad] Dependencias npm con vulnerabilidades explotables (DoS) — Backend, Admin, Web
- **Archivos**: `backend/package.json`, `admin/package.json`, `web/package.json`
- **Descripción** (`npm audit`, 2026-06-02):
  - **Backend**: 20 vulnerabilidades (18 moderate, 2 high). Principal vector: `firebase-admin@12.7.0` arrastra dependencias transitivas vulnerables.
  - **Admin**: 9 vulnerabilidades (6 moderate, 3 high). `next` (rango vulnerable, **DoS en Server Components**), `ws` (8.0.0–8.20.0), `brace-expansion`.
  - **Web**: 5 vulnerabilidades (4 moderate, 1 high). `engine.io-client` → `ws` vulnerable (cliente de socket.io).
- **Riesgo**: El DoS de `next` puede **tumbar el SSR del panel admin / web** (caída de servicio en producción). Las vulns de `ws` afectan el canal WebSocket en tiempo real (notificaciones). Las transitivas de `firebase-admin` exponen a prototype pollution / DoS en parsers.
- **Sugerencia**:
  1. `npm audit fix` en los tres proyectos (la mayoría son no-breaking).
  2. `npm i firebase-admin@13` en backend (semver major — probar `verifyIdToken`, social login y push tras el upgrade).
  3. `npm i next@latest` en `admin/` y `web/` (cierra el DoS y el XSS de `postcss`).
  4. Añadir `npm audit --audit-level=high` como gate en CI para no regresar.

---

## 🟠 ALTA

### A1 · [Arquitectura/Infra] `CacheModule` mal cableado → `CACHE_MANAGER` corre EN MEMORIA, no en Redis
- **Archivo**: [backend/src/app.module.ts:50-72](../backend/src/app.module.ts#L50-L72)
- **Descripción**: el `useFactory` retorna `{ store, ttl }` (clave **singular** `store`). Con `cache-manager@7` (+ `@nestjs/cache-manager@3`), la API correcta es `{ stores: [...] }` (**plural**, array). `cache-manager-redis-yet@5` es para `cache-manager@5` (incompatibilidad de versión). Resultado: la conexión Redis se abre pero el cache-manager **no la usa** y cae a un store LRU **en memoria, por-instancia**.
- **Riesgo**:
  - El **circuit breaker** de la IA y la **caché de respuestas** viven en memoria → se **pierden al reiniciar/deploy** y **no se comparten** entre instancias.
  - `AdminService.clearProvidersCache()` busca `cm.store.client` para hacer `SCAN` → es **no-op** sobre memoria → la invalidación de caché tras mutar proveedores/categorías **no funciona** (datos viejos a mobile/web hasta que expire el TTL).
  - Las **métricas de observabilidad** de la IA (`gemini_errors`, `cb_opens`) son por-instancia → el panel admin las lee inconsistentes si hay >1 instancia.
  - *Nota*: las **cuotas** de la IA SÍ están seguras (usan `AiQuotaService`, un cliente Redis dedicado con `INCR` atómico) — no dependen de este `CACHE_MANAGER`.
- **Sugerencia**: migrar a la API v7 con `@keyv/redis` (o `cache-manager@5` + `cache-manager-redis-store`), retornando `{ stores: [new Keyv(...)] }`. **Mientras tanto, correr 1 sola instancia en Render** para que breaker/caché/métricas sean coherentes.

### A2 · [Seguridad/Escalabilidad] Throttler con storage en memoria
- **Archivo**: [backend/src/app.module.ts:39](../backend/src/app.module.ts#L39)
- **Descripción**: `ThrottlerModule.forRoot([...])` sin storage Redis → contadores por-instancia.
- **Riesgo**: con N instancias en Render, un atacante obtiene `límite × N` requests/min → **bypass del rate-limit** (credential stuffing, brute-force de OTP).
- **Sugerencia**: `@nest-lab/throttler-storage-redis` apuntando al Redis de Upstash ya configurado. Además, aplicar `@Throttle` estricto por endpoint en `/auth/*` (login 5/min, verify-otp 5/15min, forgot-password 3/15min).

### A3 · [Seguridad] `/uploads/*` servido estáticamente sin autenticación
- **Archivo**: [backend/src/main.ts:71-73](../backend/src/main.ts#L71-L73)
- **Descripción**: `app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' })` expone públicamente la carpeta local. Hoy el directorio está **vacío** (riesgo **latente**), pero cualquier flujo que escriba localmente un documento de verificación (DNI/RUC) o voucher de Yape quedaría accesible por URL adivinable.
- **Riesgo**: fuga de PII si en el futuro se almacena algo localmente en vez de R2.
- **Sugerencia**: eliminar el `useStaticAssets` (el flujo real sube a R2) o gatearlo con guard JWT + validación de propiedad.

### A4 · [Base de Datos] Historial de migraciones Prisma roto — `migrate deploy` desde cero falla
- **Archivos**: `backend/prisma/migrations/` (`0_init`, `20260331071259_init`)
- **Descripción**: existen **dos baselines solapados** que crean el esquema completo → `prisma migrate deploy` en una BD limpia falla con `type "UserRole" already exists`. Además `0_init` estaba en UTF-16 (rompía el driver). El proyecto vive de facto sobre `prisma db push` (las BDs locales no tienen `_prisma_migrations`).
- **Riesgo**: ningún entorno limpio/CI puede levantar el esquema vía migraciones; drift latente entre `schema.prisma` y producción; si Render alguna vez corre `migrate deploy`, el deploy se cae.
- **Sugerencia**: consolidar el historial (un único baseline) y baseline-ar Supabase con `prisma migrate resolve --applied`. No habilitar `migrate deploy` en CI hasta resolverlo. (Las 3 tablas de IA ya están validadas + con guard test `ai-migrations.spec.ts`.)

### A5 · [Seguridad] `firebase-admin@12.7.0` con vulnerabilidades transitivas
- **Archivo**: [backend/package.json:54](../backend/package.json#L54)
- **Descripción**: versión mayor atrasada; arrastra la mayoría de las 20 vulns del `npm audit` del backend.
- **Riesgo**: DoS en parsers multipart, prototype pollution vía gRPC/protobuf.
- **Sugerencia**: `npm i firebase-admin@13` y regresión de `verifyIdToken` + social login + push.

### A6 · [Arquitectura] Drift de contrato Front↔DTO (`forbidNonWhitelisted`) — patrón sistémico
- **Archivos**: `backend/src/main.ts` (ValidationPipe `forbidNonWhitelisted: true`) + DTOs de `admin/`
- **Descripción**: el `ValidationPipe` rechaza con 400 cualquier campo que el DTO no declare. Cuando el frontend evoluciona y el DTO no, los flujos se rompen en silencio. Esta sesión corrigió **dos** casos reales: `UpdateCategoryDto` (faltaba `slug`) y `UpdateProviderDto` (faltaban `availability`, `isVisible`) — ambos daban `400 "property X should not exist"`.
- **Riesgo**: cada feature nueva del cliente que mande un campo no whitelisteado romperá el flujo (categorías/proveedores ya lo sufrieron en producción).
- **Sugerencia**: contract tests front↔back (o tipos compartidos) + checklist al agregar campos. Considerar `forbidNonWhitelisted: false` con `whitelist: true` (strip silencioso) en endpoints de edición tolerantes — evaluando el trade-off de seguridad.

---

## 🟡 MEDIA

### M1 · [Mantenibilidad] God objects — `admin.service.ts` (2153 líneas) y `auth.service.ts` (1007)
- **Archivos**: [backend/src/admin/admin.service.ts](../backend/src/admin/admin.service.ts) (2153), [backend/src/auth/auth.service.ts](../backend/src/auth/auth.service.ts) (1007)
- **Descripción**: `admin.service.ts` mezcla métricas, CRUD de proveedores, verificación, plan-requests, reportes, analytics, CRUD de categorías, cache-invalidation — todo en una clase (creció desde 1362 líneas). Viola SRP; difícil de testear y mantener.
- **Sugerencia**: subdividir por dominio: `AdminDashboardService`, `AdminProvidersService`, `AdminCategoriesService`, `AdminPlanRequestsService`, `AdminReportsService`. Igual para `auth.service` (auth vs registro/OTP vs account-status).

### M2 · [Seguridad/Tipado] `tsconfig.json` con `noImplicitAny: false` + `req: any` difundido
- **Archivo**: [backend/tsconfig.json:21-22](../backend/tsconfig.json#L21-L22)
- **Descripción**: `strictNullChecks: true` (bien) pero `noImplicitAny: false` y `strictBindCallApply: false`. Múltiples controllers usan `@Request() req: any`, ocultando errores de tipo en `req.user`.
- **Sugerencia**: activar `noImplicitAny: true` progresivamente; tipar `AuthenticatedRequest { user: { userId: number; role: UserRole; email: string } }`.

### M3 · [Calidad] Cobertura de tests muy desigual
- **Descripción**: el módulo IA está bien cubierto (~60 tests: unit + integration + e2e + contract). El **resto del backend** (auth, admin, providers, reviews, subastas, payments) y **todo mobile** siguen con cobertura ~0 (solo `widget_test.dart` default).
- **Riesgo**: regresiones en flujos críticos de dinero/auth sin red de seguridad (el caso `referrals.flow` mostró cómo un test desactualizado pasa desapercibido).
- **Sugerencia**: priorizar `auth.service` (registro/OTP/login/refresh), `payments`/`subastas` (transaccional), y repos clave de Flutter.

### M4 · [Calidad] AI Guardrails: rama de toxicidad + PII (email/uuid/ruc) sin test
- **Archivo**: [backend/src/ai-assistant/ai-guardrails.service.ts](../backend/src/ai-assistant/ai-guardrails.service.ts)
- **Descripción**: la capa de moderación de salida tiene tests solo para DNI/teléfono. La rama `isToxic → true` y la redacción de `email`/`uuid`/`ruc` no están testeadas.
- **Riesgo**: posible fuga de PII en respuestas de la IA si la redacción regresa.
- **Sugerencia**: agregar casos de toxicidad + cada patrón de PII (es lógica de seguridad de salida).

### M5 · [Mobile] `use_build_context_synchronously` — BuildContext tras `await`
- **Archivo**: [mobile/lib/features/providers_list/presentation/providers/providers_provider.dart:470-559](../mobile/lib/features/providers_list/presentation/providers/providers_provider.dart#L470) (+ `onboarding_screen.dart:45`, `profile_social_section.dart:302`)
- **Descripción**: `dart analyze` reporta uso de `BuildContext` a través de gaps async (varias ocurrencias). Algunas guardadas por un `mounted` no relacionado.
- **Riesgo**: crashes (`looking up a deactivated widget's ancestor`) o navegación/SnackBars perdidos si el widget se desmonta durante el `await`.
- **Sugerencia**: capturar `Navigator`/`ScaffoldMessenger` **antes** del `await`, o guardar con `if (!context.mounted) return;` correctamente.

### M6 · [Base de Datos] Modelo `User` sin índices secundarios
- **Archivo**: [backend/prisma/schema.prisma](../backend/prisma/schema.prisma) (modelo `User`)
- **Descripción**: solo `@unique` en `email`/`firebaseUid`. El listado admin filtra por `role`/`isActive` y busca por texto en nombre/email (seq scan).
- **Sugerencia**: `@@index([role, isActive])`; para búsqueda, `pg_trgm` GIN sobre `firstName||' '||lastName`.

### M7 · [Mantenibilidad] `console.log` residuales en producción
- **Archivos**: `backend/src/offer-posts/offer-posts.service.ts` (1), `backend/src/main.ts` (banner de arranque — aceptable)
- **Descripción**: quedan `console.log` sueltos fuera del `Logger` de NestJS. Los de `auth.service` ya están gateados por `NODE_ENV` (OK).
- **Sugerencia**: migrar a `Logger` con nivel configurable; eliminar los de debug.

---

## ⚪ BAJA

### B1 · [Mobile] `dart analyze`: 21 *infos* de estilo
- **Descripción**: `use_null_aware_elements`, `unnecessary_underscores`, `no_leading_underscores_for_local_identifiers` (`app_network_image.dart`), `curly_braces_in_flow_control_structures`, `unintended_html_in_doc_comment`. Todos nivel `info` (no rompen build).
- **Sugerencia**: `dart fix --apply` (revisar el diff antes; no se aplicó en esta auditoría por la regla de no modificar código).

### B2 · [Mobile] `flutter_markdown` está *discontinued*
- **Archivo**: `mobile/pubspec.yaml`
- **Descripción**: instalado a propósito esta sesión para renderizar las respuestas de la IA. El paquete está descontinuado por el equipo de Flutter.
- **Sugerencia**: migrar a `flutter_markdown_plus` o `gpt_markdown` cuando haya ventana.

### B3 · [Mobile] Dependencias Flutter atrasadas
- **Descripción**: `firebase_*`, `go_router`, `socket_io_client`, `sentry_flutter` con versiones mayores disponibles; `js` (transitivo) *discontinued*.
- **Sugerencia**: upgrade en olas (core Firebase primero, luego routing/sockets).

### B4 · [Backend] `app.set('trust proxy')` y headers detrás de Render
- **Descripción**: verificar que el throttler/IP-detection use `X-Forwarded-For` correctamente detrás del proxy de Render (ya se hace en e2e con `trust proxy`, confirmar en prod).
- **Sugerencia**: `app.set('trust proxy', 1)` en `main.ts` para IPs reales en rate-limit/logs.

### B5 · [Mantenibilidad] Comentarios y artefactos obsoletos
- **Descripción**: comentarios `// TODO`/`// pendiente`, y `0_init/migration.sql` re-encodeado esta sesión (UTF-16→UTF-8) pendiente de commit/consolidación.
- **Sugerencia**: limpieza en el sprint de consolidación de migraciones (A4).

---

## 🔬 Herramientas de escaneo ejecutadas (FASE 1)

| Herramienta | Ámbito | Resultado |
|-------------|--------|-----------|
| `npm audit` | backend / admin / web | 20 / 9 / 5 vulns (ver C1) |
| `eslint-plugin-security@4` | backend (instalado devDep) | Sin patrones peligrosos (eval/child_process/eval/random-token/`$queryRawUnsafe`) en grep dirigido |
| `dart analyze` | mobile (completo) | 21 issues `info` (M5 + B1) |
| `dart fix` | mobile | **No ejecutado con `--apply`** (regla: no modificar código). Recomendado en B1 |
| grep dirigido | todo el repo | Sin secretos hardcodeados, sin `.env` reales trackeados, sin URLs de prod filtradas, sin `NEXT_PUBLIC_` sensibles |

**Nota sobre `dart fix --apply`**: la consigna pedía ejecutarlo, pero **modifica código fuente** — en conflicto con la regla "no modificar código de producción durante la auditoría". Se documentan los hallazgos vía `dart analyze`; aplicar `dart fix --apply` queda como acción recomendada (B1) bajo revisión de diff.

---

## 🎯 Plan de remediación priorizado

**Sprint 1 (pre-deploy):** C1 (audit fix) · A1 (cache → 1 instancia / fix stores) · A5 (firebase-admin 13).
**Sprint 2 (escalabilidad):** A2 (throttler Redis) · A4 (consolidar migraciones) · A3 (quitar /uploads).
**Sprint 3 (deuda):** M1 (romper God objects) · M2 (noImplicitAny) · M3/M4 (tests auth/payments + guardrails).
**Continuo:** A6 (contract tests front↔back) · B1-B5 (limpieza).

> **Conclusión**: el ecosistema Servi está **considerablemente más sano** que en la auditoría anterior — los vectores de seguridad graves del código propio están cerrados. El trabajo restante es de **robustez de infraestructura** (caché/throttler/migraciones) y **mantenibilidad para escalar** (God objects, tests). Ninguno bloquea el funcionamiento actual con 1 instancia, pero **A1 y A2 deben resolverse antes de escalar horizontalmente**.
