# REPORTE DE RELEASE — 2026-07-22

## 1. Estado ejecutivo

Release consolidado: **PR #49**, rama `feat/release-cierre-julio`.

Estado al redactar: código completo, verificación local global verde y cierre
documental en curso. Aún no declarar producción hasta CI verde, squash merge y
comprobación de Render/Vercel. No hubo cambios de schema, migraciones, SQL de
producción, DNS ni configuración Supabase.

Objetivo cumplido en código: corregir auth manual, retención/notificaciones,
eventos críticos de proveedor y operación Admin; integrar hardening viable sin
añadir controles frágiles; preservar funciones, datos y trabajo local ajeno.

## 2. Reglas aplicadas

- Producción protegida: ramas por tema, PR independiente y release consolidado.
- Cambios quirúrgicos; sin borrar tablas, rutas históricas ni funcionalidades.
- Sin `git add -A`; stage solo de archivos del tema.
- Sin CRUD administrativo de fotos. Solo alta inicial si existen cero imágenes.
- Sin certificate pinning: riesgo de dejar versiones instaladas sin API tras
  rotación normal de certificados.
- Sin `DROP`, `db push`, `migrate deploy`, `execute_sql` ni SQL automático.
- Cambios UX locales ajenos preservados; artefactos coverage no versionados en
  esta tanda.

## 3. Integración por fase

| Fase | PR | Commit en release | Resultado |
|---|---:|---|---|
| Hardening 7A–7F | #39 | `0f4b24b` | Fronteras públicas, uploads, auth social, sesiones, WS, CSV, logs y headers |
| Runtime web Next 16 | #40 | `1bde0a5` | `proxy.ts`, metadata y raíz Turbopack |
| UX web autorizada | #41 | `ddaf0cd` | Registro adaptativo al tema y marca Servi |
| UX mobile autorizada | #42 | `e5696c3` | Root navigator, perfiles unificados y toggle Ofi |
| Auth manual | #43 | `047aaca` | Errores permanecen en login/registro |
| Retención notificaciones | #44 | `acfdd0f`, `a083d80` | Leídas 5 d, no leídas 30 d, lectura persistida |
| Estado proveedor global | #45 | `9399cc1` | Overlays aprobación/rechazo y entrega diferida |
| Notificaciones Admin | #46 | `3c4de61` | Realtime, reconexión, fallback y filtros fecha |
| Ocultar crecimiento Admin | #47 | `fe842c8` | Nav/widget fuera; rutas e historial vivos |
| Foto faltante proveedor | #48 | `e58a0f4` | Una imagen inicial, solo cuando no existe ninguna |
| Release consolidado | #49 | pendiente de squash | Única integración destinada a `main` |

Los PRs #39–#48 permanecen como trazabilidad temática. No deben mergearse por
separado después de #49: duplicarían cambios ya integrados.

## 4. Cambios funcionales

### 4.1 Login y registro móvil

- Credenciales inválidas ya no cambian a onboarding ni modo invitado.
- El usuario permanece en login y recibe mensaje amigable.
- Correo ya registrado permanece en registro y explica que debe iniciar sesión.
- `_isGuest` solo se limpia después de autenticación exitosa.
- Router y estado auth dejan de interpretar un fallo esperado como usuario nuevo.

### 4.2 Retención de notificaciones

- Backend elimina leídas con más de 5 días y no leídas con más de 30 días.
- Mobile aplica el mismo criterio a caché/lista y sincroniza con servidor.
- Aviso discreto informa cuando se retiró historial vencido.
- Lectura individual se persiste; no reaparece por refresco.
- No se añadió mensaje por cada borrado ni tarea pesada en cada render.

### 4.3 Aprobación y rechazo de proveedor

- Backend incluye `providerId`, tipo y metadatos suficientes en el evento.
- FCM foreground, resume y cold start alimentan una cola persistida.
- Overlay global puede aparecer desde cualquier sección al volver a la app.
- Aprobación muestra celebración ligera; rechazo muestra motivo y acción útil.
- Recibo local evita repetir el mismo evento indefinidamente.
- Notificación normal se conserva como historial.

### 4.4 Ciclo de notificaciones Admin

- Filtro por fecha llega al backend mediante DTO validado.
- Lista escucha `notification` y `adminEvent`.
- Refrescos simultáneos se agrupan; no dispara tormenta de requests.
- Reconecta y usa fallback cada 60 s solo con pestaña visible.
- Logout desconecta socket y limpia listeners.

### 4.5 Referidos y recompensas Admin

- Grupo `Crecimiento` oculto del sidebar.
- `ReferralsWidget` oculto del dashboard.
- `/referrals`, `/rewards`, endpoints, tablas e historial siguen intactos.
- Reactivación exacta documentada en
  `REACTIVACION_FUNCIONALIDADES_OCULTAS.md`.

### 4.6 Foto inicial desde Admin

- Galería compartida muestra imágenes en edición y cola de verificación.
- Placeholder visible ante URL rota; la pantalla no queda bloqueada.
- Upload solo aparece cuando el proveedor tiene cero imágenes.
- Endpoint protegido por JWT + rol ADMIN y límites de imagen existentes.
- Servicio toma lock de fila dentro de transacción: dos uploads concurrentes no
  pueden crear dos “primeras” imágenes.
- Objeto R2 se limpia si falla BD o pierde la carrera.
- Caché del proveedor se invalida tras éxito.
- No existe reemplazo, eliminación, ordenamiento ni edición administrativa.

## 5. Hardening viable incluido

- Uploads autenticados; tamaño/píxeles acotados; decode/re-encode Sharp y
  metadatos descartados.
- URLs gestionadas validadas por origen y carpeta esperados.
- Perfil propio usa DTO allowlist; endpoints públicos aplican guards, roles,
  ownership, paginación y privacidad de salida.
- Login social exige proveedor confiable y `email_verified`; no une UIDs
  distintos solo por email.
- Suspensión revoca refresh tokens; WebSocket consulta usuario activo y rol en BD.
- Export CSV neutraliza fórmulas.
- Fallback de correo no registra OTP, URL sensible ni destinatario.
- Admin agrega `nosniff`, `DENY`, referrer/permissions, noindex y CSP en modo
  `Report-Only`.

No incluido por riesgo operativo o alcance externo: certificate pinning, CSP
enforcement, WAF agresivo, bloqueo del hostname Render, SSL enforcement de BD,
Data API, DNSSEC, TLS mínimo, SPF/DKIM/DMARC y MFA. Ver
`SEGURIDAD_OPERATIVA.md`.

## 6. Verificación global

Entorno Node: 20.20.2. Flutter: 3.41.6.

| Sistema | Comprobación | Resultado |
|---|---|---|
| Backend | Unit | 63 suites, 571/571 |
| Backend | Integration | 19 suites, 101/101 |
| Backend | E2E | 2 suites, 16/16 |
| Backend | Gemini real | 1 suite, 7/7 |
| Backend | TypeScript / build | OK / OK |
| Backend | ESLint | 0 errores, 262 warnings históricos |
| Mobile | Tests | 220/220 |
| Mobile | Analyze | 0 errores, 0 warnings, 14 infos |
| Admin | Vitest | 9 archivos, 25/25 |
| Admin | Type-check / build | OK / OK |
| Web | Tests | No define suite |
| Web | Build + TypeScript | OK |

Cobertura:

- Backend: statements 58.23%, branches 50.68%, functions 43.65%, lines 58.80%.
- Mobile: 12.4% (3468/27873), ratchet mínimo 9% superado.
- Admin: statements/lines 15.04%, branches 69.66%, functions 41.29%.

Deuda conocida no introducida:

- Jest backend muestra warning de `forceExit`/handles abiertos tras pasar.
- Admin lint global: 84 errores y 24 warnings históricos; CI informativo.
- Cobertura Admin global baja; flujos nuevos sí tienen pruebas focales.
- Web no tiene suite automatizada propia.

## 7. Graphify y contexto

Graphify regenerado en worktree limpio desde `e58a0f4`:

- 945 archivos;
- 9,242 nodos;
- 14,871 relaciones;
- 462 comunidades.

`graph.html` se omite porque el grafo supera límite visual de 5,000 nodos. Las
fuentes vigentes son `graphify-out/GRAPH_REPORT.md` y `graphify-out/graph.json`.

Documentos actualizados:

- `CONTEXTO_PROYECTO.md`;
- `ARQUITECTURA_DESPLIEGUE.md`;
- `SEGURIDAD_OPERATIVA.md`;
- `REACTIVACION_FUNCIONALIDADES_OCULTAS.md`;
- `ESTADO_ACTUAL.md`;
- este reporte.

`AUDITORÍA_TÉCNICA.md` sigue como snapshot histórico; no se reescribe como
estado vivo.

## 8. Rollback técnico

- Código: revertir el squash de #49 mediante PR; no revertir PRs #39–#48 uno por
  uno sobre un árbol parcialmente desplegado.
- Mobile: mantener/publicar `.aab` anterior si el nuevo todavía no salió.
- Referidos Admin: volver a comentar grupo `Crecimiento` y `ReferralsWidget`.
- Foto Admin: retirar botón y endpoint; imágenes creadas válidamente permanecen.
- Notificaciones: restaurar ventanas anteriores solo por PR; no borrar tablas.
- Hardening: evitar rollback global. Corregir únicamente frontera que cause
  regresión y conservar autenticación/autorización.

## 9. Acciones manuales restantes

Antes de declarar release cerrado:

1. Esperar CI verde de #49.
2. Squash merge a `main`.
3. Verificar Render `GET /health` y logs de arranque.
4. Verificar deploys Vercel web/admin del squash.
5. Smoke: login inválido, registro duplicado, lista/filtro Admin y vista de fotos.
6. Probar alta de foto con cuenta Admin solo sobre proveedor sin imágenes.
7. Generar/publicar `.aab` por el propietario.

Seguridad externa, separada del release:

1. Rotar cuenta de prueba compartida y revocar sesiones.
2. Exigir MFA en plataformas operativas.
3. Fijar TLS mínimo 1.2 en Cloudflare y verificar clientes soportados.
4. Configurar SPF/DKIM y DMARC gradual con valores reales de Brevo.
5. Evaluar Data API y SSL enforcement Supabase en ventana con rollback.

No hay SQL pendiente para este release.

## 10. Exclusiones locales preservadas

No se incluyen settings locales Claude, coverage generado, reportes Android,
`my-video/`, `supabase/`, archivos auxiliares ni cambios UX posteriores no
commiteados del propietario. Revisar `git status --short` antes de cualquier
stage futuro.
