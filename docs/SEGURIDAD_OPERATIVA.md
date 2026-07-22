# Seguridad operativa

> Estado auditado: 2026-07-22. Producción. Este documento no contiene secretos.

## 1. Regla de ejecucion

- Cambios de codigo: PR, CI verde y despliegue normal.
- DNS, Cloudflare, Vercel, Render, Firebase, Brevo y Supabase: aplicar uno por uno, verificar y conservar rollback.
- SQL de produccion: solo archivo idempotente aplicado manualmente por el propietario. Esta auditoria no requiere SQL.
- Nunca habilitar un control que reinicie un servicio sin ventana de mantenimiento.
- Nunca copiar claves, tokens, contrasenas o archivos `.env` a tickets, commits o chats.

## 2. Estado comprobado

| Control | Estado 2026-07-22 | Decisión |
|---|---|---|
| HTTPS web, API y admin | Activo | Mantener |
| HSTS web/API/admin | Activo | Mantener |
| TLS 1.0/1.1 en `www.oficioapp.org.pe` | Aceptado por Cloudflare | Subir minimo a TLS 1.2 |
| TLS 1.0/1.1 en API/admin | Rechazado | Correcto |
| Cabeceras web | HSTS, `DENY`, `nosniff`, referrer policy | CSP queda en observacion antes de imponerla |
| Cabeceras admin | Producción `db0d000`: `nosniff`, `DENY`, referrer, permissions, noindex y CSP Report-Only observados | Mantener CSP sin enforcement hasta revisar reportes |
| Origen directo Render | Publicamente accesible | No asumir que Cloudflare protege ese hostname |
| SPF/DKIM/DMARC del dominio | Sin MX ni `_dmarc` observados | Configurar solo tras validar remitente real en Brevo |
| DNSSEC | Sin DS/DNSKEY observado | Habilitar con registrador y Cloudflare, con verificacion |
| Supabase Database SSL enforcement | Desactivado | Programar ventana; habilitar causa reinicio breve |
| Uso de Supabase Data API en codigo | No encontrado | Deshabilitar en dashboard tras confirmar integraciones externas |
| MFA de cuentas operativas | No verificable desde repo | Obligatoria para propietarios y administradores |
| Credencial de prueba compartida | Expuesta fuera del gestor de secretos | Rotar y revocar sesiones |

### 2.1 Hardening de código activo — PR #49

Validado con suites completas, CI y runtime Render/Vercel el 2026-07-22:

- uploads autenticados, límites estrictos, re-encode Sharp sin metadatos y
  validación de origen/carpeta para objetos gestionados;
- allowlist de actualización de perfil, guards/roles y respuestas públicas sin
  campos privados;
- login social solo con proveedor permitido y correo verificado; no vincula UIDs
  distintos solo por compartir email;
- suspensión revoca refresh tokens; WebSocket revalida usuario activo y rol en BD;
- paginación acotada, CSV neutralizado contra fórmulas y logs de correo sin OTP,
  URL sensible ni destinatario;
- Admin con headers defensivos y CSP solo `Report-Only`.

No se añadió certificate pinning, bloqueo del origen Render, WAF agresivo,
renovación de claves ni cambio Supabase. Esos controles requieren operación
externa y rollback independiente. Evidencia de merge/deploy en
`CONTEXTO_PROYECTO.md` y `REPORTE_RELEASE_2026-07-22.md`.

## 3. Acciones obligatorias sin cambio de codigo

### 3.1 Rotar la cuenta de prueba

1. Cambiar inmediatamente la contrasena de la cuenta compartida.
2. Revocar sus sesiones y refresh tokens desde el flujo administrativo disponible.
3. No reutilizar esa contrasena en Firebase, correo ni paneles.
4. Guardar futuras credenciales de prueba en un gestor de secretos.
5. Verificar login con la nueva clave y rechazo de la anterior.

### 3.2 Cloudflare: TLS minimo 1.2

1. Seleccionar la zona `oficioapp.org.pe`.
2. En SSL/TLS, fijar Minimum TLS Version en `TLS 1.2`.
3. No cambiar modo SSL, certificados de origen ni reglas WAF en esta misma operacion.
4. Verificar web y API desde Android soportado y navegadores actuales.
5. Confirmar que TLS 1.0 y 1.1 fallen y TLS 1.2 responda.

Rollback: restaurar temporalmente el valor anterior solo si un cliente soportado deja de conectar. Registrar el cliente antes de revertir.

### 3.3 Correo: SPF, DKIM y DMARC

No publicar registros inventados. Primero confirmar en Brevo el dominio y remitente usados realmente por Render.

1. Verificar que `EMAIL_FROM` de produccion pertenezca a un dominio autenticado en Brevo.
2. Copiar exactamente SPF y DKIM entregados por Brevo a Cloudflare DNS.
3. Esperar verificacion positiva de Brevo.
4. Crear DMARC en modo observacion: `p=none`, con buzón controlado para reportes.
5. Observar al menos siete dias; corregir fuentes no alineadas.
6. Subir gradualmente a `quarantine` y despues a `reject` solo con alineacion estable.

Rollback: volver a `p=none`. No eliminar SPF/DKIM que ya validen correo legitimo.

### 3.4 MFA y cuentas de plataforma

Exigir MFA en Cloudflare, Vercel, Render, Supabase, Firebase, Brevo, GitHub y Google Play. Mantener dos propietarios, codigos de recuperacion fuera del equipo y cuentas nominales; prohibir usuarios compartidos.

Verificacion trimestral:

- propietarios vigentes;
- MFA activo;
- tokens sin uso revocados;
- llaves de servicio con alcance minimo;
- logs de acceso sin ubicaciones o agentes desconocidos.

## 4. Android y limite real

Estado actual verificado en repo:

- release firmado, R8 `minify` y `shrinkResources` activos;
- cleartext bloqueado por defecto; excepciones limitadas a hosts de desarrollo local;
- HTTPS usa trust store del sistema Android;
- secretos y decisiones de autorizacion deben permanecer en backend, nunca confiar en ocultar Dart/Java dentro del `.aab`.

La ingenieria inversa no puede impedirse por completo. R8 encarece el analisis,
pero el binario, endpoints y flujo de UI siguen siendo inspeccionables. La defensa
real es que manipular el cliente no permita saltar JWT, ownership, roles, DTOs,
limites ni validaciones del backend.

No se agrego certificate pinning en esta tanda. Sin pines de respaldo, rotacion
probada y mecanismo de recuperacion, un cambio normal de certificado puede dejar
todas las versiones instaladas sin acceso a la API. Mantener HTTPS + trust store
Android; evaluar pinning solo como proyecto operativo separado.

## 5. Supabase

Proyecto auditado: ConfiServ. No ejecutar `db push`, `migrate deploy`, `--force-reset` ni SQL desde el agente.

### 5.1 Deshabilitar Data API

El codigo de backend, web, admin y mobile no usa `supabase-js`, PostgREST ni GraphQL de Supabase. Prisma conecta directamente a Postgres. Antes de cambiar:

1. Revisar Edge Functions, automatizaciones y herramientas externas no versionadas.
2. En Supabase, abrir API Settings y deshabilitar Data API para el proyecto.
3. Probar login, perfiles, busqueda, pagos, uploads y panel admin.
4. Confirmar que backend sigue conectando por `DATABASE_URL`.

Rollback: reactivar Data API. No modificar grants ni RLS en esta operacion.

### 5.2 Exigir SSL a Postgres

Estado comprobado por CLI: enforcement desactivado. Activarlo reinicia brevemente la base; requiere ventana.

Precondiciones:

1. Confirmar que todas las conexiones de produccion usan SSL (`sslmode=require` o equivalente).
2. Confirmar acceso de rollback a Supabase.
3. Avisar ventana y observar API antes, durante y despues.

Comando para el propietario durante la ventana:

```powershell
supabase ssl-enforcement update --project-ref pnwjqmlewivhzbhvdrek --enable-db-ssl-enforcement --experimental
```

Verificacion:

```powershell
supabase ssl-enforcement get --project-ref pnwjqmlewivhzbhvdrek --experimental
```

Rollback de emergencia:

```powershell
supabase ssl-enforcement update --project-ref pnwjqmlewivhzbhvdrek --disable-db-ssl-enforcement --experimental
```

## 6. Origen directo de Render

El hostname de Render responde sin pasar por Cloudflare. Eso no es una vulnerabilidad por si solo, pero invalida controles que existan solo en Cloudflare.

- Autenticacion, autorizacion, rate limits, validacion y Helmet deben vivir tambien en NestJS.
- No bloquear el origen hasta confirmar webhooks, health checks, Vercel y aplicaciones Android instaladas.
- Si se restringe en el futuro, usar una migracion medida con hostname estable, health check separado y rollback inmediato.

## 7. Cadencia minima

| Frecuencia | Control |
|---|---|
| Semanal | Alertas de Render/Vercel/Sentry, errores de auth y picos de `429`/`401` |
| Mensual | `npm audit --omit=dev`, dependencias, cuentas admin y tokens |
| Trimestral | MFA, DNS, remitentes, restauracion de backups y prueba de revocacion |
| Antes de release | Tests completos, build, secretos ausentes del diff y prueba Android/API |
| Tras incidente | Rotar secretos afectados, revocar sesiones, conservar evidencia y documentar causa |

## 8. Criterio de cierre

Una accion externa solo se marca completada con fecha, responsable y evidencia de verificacion. "Recomendado" o "documentado" no significa "aplicado".
