# ESTADO ACTUAL — Servi

**Última actualización:** 2026-07-01 (backlog OBSERVACIONES completo + tema adaptativo)

> ÚNICA fuente de verdad del estado (la copia de la raíz está gitignored y es
> solo un puntero local). La especificación larga que vivía aquí quedó
> obsoleta; el histórico está en git.

## Apps y despliegue
- **Backend** NestJS (TS ESM) → Render (`oficio-backend.onrender.com`). `main` → auto-deploy. **Live**, health `GET /health` 200.
- **Mobile** Flutter (cliente + proveedor).
- **Web** público Next.js 16 (puerto 3002) — landing + panel proveedor + chat + perfil público.
- **Admin** Next.js.
- **BD** Supabase PostgreSQL 16 + PostGIS. **Cache** Upstash Redis. **Storage** R2/MinIO.

## Features recientes en producción
- **Serie de funcionalidades por categoría** end-to-end (backend + móvil): Carta digital, Catálogo (ambos con carrito → pedido WhatsApp), Agenda de citas (slots 30 min, recordatorio cron 24h) y Cotización. Feature-gate por categoría + CTA en detalle + entrada en panel.
- **Gating por plan** (PR #25): carta/catálogo ítems GRATIS 5 / ESTÁNDAR 6 / PREMIUM ∞; agenda días activos/semana GRATIS 1 / ESTÁNDAR 3 / PREMIUM 7 (excede → 402).
- **Backlog OBSERVACIONES FINALES (10 ítems) COMPLETO** — PRs #20 (tiempo real), #21 (ofertas), #23 (notif: deep-link por `metadata` JSONB + independencia por rol vía `targetProfileType`), #24 (localidad correcta en alta admin + radio respeta filtros), #25 (gating por plan).
- **Mejora de envío de correos** (mobile + backend, PR #26).
- **Rediseño visual móvil** "cálida artesanal" (fases 1–4 + panel) con tema claro (crema) / oscuro (casi negro cálido) y helpers de contraste AA (`onSolid`/`tintOn`). Tema por defecto = **sistema** (sigue al dispositivo).
- **Toggles de privacidad del proveedor** (`showPhone`/`showWhatsapp`/`showExactLocation`) — desplegados; columnas aplicadas a prod por SQL.
- **Perfil público de usuario** (modal nombre + apellido + fecha de registro, móvil + web; endpoint `GET /users/:id/public` protegido por JWT).
- **Asistente IA "Ofi"** — aislado, con guardrails de entrada (anti prompt-injection) y de salida (redacción PII + toxicidad), caché semántico y cuota atómica por usuario.

## Hardening aplicado (auditoría V2 — 2026-06-11)
- **Pagos:** aprobación Yape y PlanRequest blindadas contra doble-clic (update condicional atómico en tx). Cron de expiración re-valida estado en el write (no pisa pagos concurrentes).
- **Autorización:** moderación de reseñas y subida de archivos ahora requieren JWT/ADMIN; chat y recomendaciones derivan el `userId` del token (no del body).
- **OOM:** todos los uploads tienen límites de tamaño Multer (5–8 MB) + filtro de tipo.
- **Flutter:** corregida fuga de listeners FCM (idempotencia); formulario de onboarding persiste borrador en `SharedPreferences`.
- **Observabilidad:** tabla `AuditLog` para eventos críticos (best-effort) + logs a stdout.

## Salud de subsistemas
| Subsistema | Estado |
|-----------|--------|
| Resiliencia Redis (3 clientes) | OK — `.on('error')` + reconnect; proceso sobrevive cortes de Upstash |
| Cuota Redis (10k/día) | OK — catálogos `@CacheTTL(1h)`; cuota IA por `INCR` |
| Índices BD (GIST/GIN/trgm/tsv) | OK |
| Guardrails IA (PII/toxicidad/inyección) | OK |
| WebSockets | OK — handshake con JWT, listeners de error de engine |

## Pendientes
1. **Aplicar `prisma/sql/audit_log.sql`** al pooler de Supabase (idempotente). Hasta entonces, las escrituras de auditoría fallan en silencio (no rompen nada).
2. (Recomendado) Fijar el monto de pago Yape server-side contra catálogo en soles (anti-tampering).
3. Considerar deprecar uno de los dos flujos de aprobación de pago paralelos (`YapePayment` vs `PlanRequest`) — deuda técnica.

## Comandos
```bash
# Backend
cd backend && npm run start:dev      # dev
npx tsc --noEmit                     # typecheck
npm test                             # ~200 unit tests
# Mobile
cd mobile && flutter analyze
cd mobile && flutter test            # ~152 tests
# Web
cd web && npm run build
# Infra local
docker-compose up -d                 # PostgreSQL/PostGIS + Redis + MinIO
```
