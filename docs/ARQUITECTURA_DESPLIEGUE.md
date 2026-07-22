# ARQUITECTURA DE DESPLIEGUE — Servi

**Última actualización:** 2026-07-22

> ÚNICA fuente de verdad de arquitectura (la copia de la raíz está gitignored
> y es solo un puntero local). El estudio largo que vivía aquí quedó obsoleto;
> el histórico está en git.

## Topología

```
Mobile (Flutter)       ─┐
Web (Next.js/Vercel)   ─┼─► Backend NestJS (Render) ─► Supabase Postgres+PostGIS
Admin (Next.js/Vercel) ─┘        │                  ├─► Upstash Redis (cache/throttle/quota IA)
                                 │                  └─► R2 / MinIO (storage)
                                 └─► WebSocket (socket.io) ── Push FCM (Firebase)
```

**Borde público:** web `oficioapp.org.pe` (Cloudflare/Vercel), admin
`oficioadmin.vercel.app`, API `api.oficioapp.org.pe` (Cloudflare/Render). DNS
delegado a Cloudflare (`javier.ns.cloudflare.com`, `katelyn.ns.cloudflare.com`).

## Estado de despliegue verificado

- Backend: Render, auto-deploy desde `main`; `GET /health` respondió `ok` el
  2026-07-13. Subastas, Ofertas y Referidos devolvieron 404 con sus flags
  apagados.
- Web: Vercel `oficio_web`, commit `002791d` desplegado con estado `success`.
- Admin: Vercel `oficioadmin`, commit `002791d` desplegado con estado `success`.
- Mobile: distribución manual mediante `.aab`; no se verificó que la versión
  con el ocultamiento actual ya esté publicada en Play.

**Release candidato:** PR #49 integra cambios backend, mobile, admin y web sobre
`e58a0f4`. Todavía no es producción hasta squash merge y verificación posterior
de Render/Vercel. No contiene migraciones ni SQL. La publicación Android queda
fuera: el propietario genera y publica el `.aab`.

## Límites del tier gratuito (DISEÑAR PARA ESTO)

| Recurso | Límite | Implicación de diseño |
|---------|--------|------------------------|
| **Render Free** | 512 MB RAM, 0.1 vCPU, **se duerme** | Un OOM o una excepción no capturada = reinicio frío que corta todas las requests. → Multer con `limits` estrictos (5–8 MB); handlers globales `uncaughtException`/`unhandledRejection` que NO matan el proceso. 0.1 vCPU alarga handlers → amplía ventanas de carrera (de ahí los updates condicionales atómicos en pagos). |
| **Upstash Redis** | **10 000 cmds/día** | Cachear datos volátiles agota la cuota. → Solo se cachean catálogos (categorías/localities `@CacheTTL(1h)`) y respuestas IA (FAQ/búsqueda). Cuota IA con `INCR`+`PEXPIRE` (2 cmds/consulta). Los 3 clientes Redis comparten estrategia de reconexión. |
| **Supabase** | **500 MB** | **PROHIBIDO** tablas de logs masivas. → Logs operativos a **stdout**; `subscription_audit_log` registra cambios de plan. El `AuditLog` general de auditoría V2 nunca se integró. |
| Red móvil | 3G/4G inestable | Operaciones best-effort (subida de fotos, auditoría, memoria IA) no bloquean el flujo principal. |

## Conexión a base de datos
- **DATABASE_URL** → pooler de sesión de Supabase (puerto **5432**, `?sslmode=require`).
- **Migraciones:** el repo tiene baseline único `0_init` validado, pero el estado del baseline en prod no está confirmado. Producción usa **SQL idempotente manual**; CI usa `db push` solo sobre BD efímera. NUNCA `migrate deploy`, `db push` ni `--force-reset` contra prod.
- Triggers en BD manejan `location_geog` (geography), `search_tsv` (tsvector) y `subscription_audit_log` (vía GUC `app.current_user_id`, scope `is_local=true` — jamás pasar a session scope con pooler).
- **SQL aplicados:** `pr1_features_agenda.sql`, `pr2_carta_catalogo.sql`, `pr_cotizacion.sql`, `pr_notif_metadata.sql`, `alcance_distritos.sql`, `provider_location_geog_trigger.sql`, `audit_log.sql` (crea `subscription_audit_log`, PR #34) y `ocultar_features_kb.sql` (PR #37: desactiva una entrada de conocimiento Ofi; sin schema, triggers ni funciones).

## Índices clave (ya en schema)
- `providers_location_geog_gist`, `service_requests_location_geog_gist` (GIST geoespacial).
- `providers_businessname_trgm`, `providers_description_trgm` (GIN trigram, búsqueda fuzzy).
- `providers_search_tsv_gin` (GIN full-text).
- Compuestos: `(isVisible, verificationStatus[, averageRating|localityId])`, `(role, isActive)` y `(subscriptionId, changedAt)` en `subscription_audit_log`.

## Resiliencia / seguridad operativa
- **Redis:** `.on('error')` + reconnect en Throttler (ioredis), Cache (KeyvRedis/node-redis) y AiQuota; ninguno mata el proceso.
- **Proceso:** `main.ts` captura `uncaughtException`/`unhandledRejection` (log + Sentry, sin `process.exit`).
- **WebSocket:** producción valida JWT y registra listeners de error del engine. PR #49 además consulta usuario activo/rol actual en BD durante el handshake; Admin reconecta, libera socket al salir y combina eventos con fallback visible de 60 s.
- **Uploads:** PR #49 exige JWT en todas las rutas sensibles, limita tamaño/píxeles, decodifica y re-encodea con Sharp, elimina metadatos y valida origen/carpeta de URLs gestionadas. La foto inicial desde Admin usa la misma frontera y un lock transaccional; solo existe cuando el proveedor tiene cero imágenes.
- **Pagos:** transacciones atómicas con claim condicional; idempotencia MercadoPago por `reference`; webhook MP con firma HMAC.
- **Sentry:** backend y Flutter capturan excepciones; DSN por variable de entorno.
- **Identidad/sesiones en PR #49:** allowlist de campos, guards/roles, privacidad de salida pública, email social verificado, revocación de refresh tokens al suspender y rol WebSocket tomado de BD. Móvil no abandona login/registro ante errores esperables.
- **Notificaciones en PR #49:** retención leídas 5 días/no leídas 30; móvil depura con el mismo criterio y conserva eventos críticos hasta mostrarlos. Aprobación/rechazo de proveedor se entrega en foreground, resume o cold start sin repetición indefinida.
- **Admin en PR #49:** CSV protegido contra fórmulas; headers defensivos y CSP `Report-Only`; notificaciones filtradas por fecha en servidor y actualizadas por eventos. Referidos/Recompensas solo se ocultan de navegación, sin eliminar rutas o datos.
- **Android release:** R8 minify + resource shrinking activos; cleartext bloqueado salvo hosts locales de desarrollo. No hay certificate pinning por su riesgo operativo de corte durante rotaciones; la frontera de seguridad permanece en el backend.

Cambios externos no se aplicaron desde código. Estado observado y orden seguro de
TLS, correo, MFA, Supabase y origen Render:
[`SEGURIDAD_OPERATIVA.md`](SEGURIDAD_OPERATIVA.md).

## Variables de entorno críticas (no hardcodear)
`DATABASE_URL`, `REDIS_HOST/PORT/PASSWORD/TLS`, `JWT_SECRET`, `MERCADOPAGO_*` (incl. `WEBHOOK_SECRET`), `SENTRY_DSN`, `ALLOWED_ORIGINS`, claves R2/MinIO, credenciales Firebase, claves IA (Gemini/OpenRouter).

**Feature flags:** backend desactivado por defecto hasta valor literal `true`: `FEATURE_SUBASTAS`, `FEATURE_OFERTAS`, `FEATURE_REFERIDOS`, `FEATURE_AGENDA` y `FEATURE_COTIZACION`. Herramientas Ofi: `AI_TOOL_<NOMBRE>_ENABLED`, también `false` por defecto. Web requiere build con `NEXT_PUBLIC_FEATURE_REFERIDOS=true` para reactivar su UI; Subastas/Ofertas/Referidos requieren flag Dart y nuevo `.aab`. Agenda/Cotización móvil derivan del array backend `features` y pueden reaparecer sin recompilar.

Carta y Catálogo no están apagados globalmente: funcionan para `NEGOCIO` y
están bloqueados para `OFICIO` en el filtro de features y en los servicios de
lectura/gestión. No existe flag runtime para OFICIO. Procedimiento completo de
reactivación y rollback:
[`REACTIVACION_FUNCIONALIDADES_OCULTAS.md`](REACTIVACION_FUNCIONALIDADES_OCULTAS.md).
