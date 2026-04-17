# Bitácora de Errores de Arquitectura

Registro de errores estructurales encontrados en auditoría del 2026-04-17.
Cada error incluye: qué pasó, por qué ocurrió y la regla de oro para no repetirlo.

---

## Error 1 — Validación rota en campos opcionales con Regex (DTO RUC/DNI)

**Archivo**: `backend/src/auth/dto/register-provider.dto.ts`

**Qué pasó**:
El campo `ruc` tenía `@IsOptional()` + `@Matches(/^\d{11}$/)`. Flutter envía `""` (string vacío)
cuando el usuario deja el campo en blanco, no `null`. El decorador `@IsOptional()` de
`class-validator` solo omite la validación si el valor es `null` o `undefined`, **no si es `""`**.
Resultado: cualquier registro de NEGOCIO sin RUC lanzaba un `ValidationException` 400 silencioso.

**Raíz del error**:
Asumir que Flutter y NestJS comparten el mismo concepto de "campo vacío".
Flutter serializa formularios vacíos como `""`, no como campo ausente.

**Parche aplicado**:
```typescript
// Decorador NullIfEmpty transforma "" → null antes de las validaciones
const NullIfEmpty = () =>
  Transform(({ value }) => (value === '' || value === undefined ? null : value));

@NullIfEmpty()
@IsOptional()
@ValidateIf(o => o.ruc !== null && o.ruc !== undefined)
@Matches(/^\d{11}$/, { message: 'El RUC debe tener exactamente 11 dígitos' })
ruc?: string | null;
```

**Regla de oro**:
> Todo campo opcional que venga de Flutter debe tener `@Transform` que convierta `""` a `null`
> **antes** de cualquier `@IsOptional()` o `@Matches`. Nunca confiar en que el cliente envíe `null`.

---

## Error 2 — Notificaciones de plan sin aislamiento por tipo de perfil

**Archivos**: `backend/src/events/events.gateway.ts`, `backend/src/admin/admin.service.ts`,
`backend/src/provider-profile/provider-profile.service.ts`,
`mobile/lib/features/auth/presentation/providers/auth_provider.dart`

**Qué pasó**:
Un usuario con perfil OFICIO y perfil NEGOCIO recibe una notificación de aprobación/rechazo
de plan. La notificación solo incluía `targetUserId`, sin indicar a qué perfil pertenecía.
Si el usuario tenía activo el perfil OFICIO en el panel, una notificación del perfil NEGOCIO
podía disparar `_syncProviderStatus()` y mezclar el estado visible en la UI.

**Raíz del error**:
El modelo de notificaciones fue diseñado cuando un usuario solo podía tener un perfil.
Al agregar soporte multi-perfil (OFICIO + NEGOCIO) no se actualizó el payload de notificaciones.

**Parche aplicado**:
- Añadido `targetProfileType String?` al modelo `AdminNotification` en Prisma.
- Añadido `targetProfileType?: string` al `NotificationPayload` del WebSocket.
- Flutter filtra en `_handleRemoteNotification`: si `targetProfileType != _activeProfileType`, ignora la notificación.

**Regla de oro**:
> Cada notificación que afecte a un perfil específico (no al usuario) debe incluir
> `targetProfileType`. Nunca usar solo `targetUserId` cuando el usuario puede tener
> múltiples perfiles del mismo dominio.

---

## Error 3 — Sin protección contra solicitudes de plan duplicadas

**Archivo**: `backend/src/provider-profile/provider-profile.service.ts`

**Qué pasó**:
`requestPlanUpgrade()` cancelaba solicitudes PENDIENTES previas y creaba una nueva cada vez.
Un usuario podía tocar el botón múltiples veces seguidas (tap rápido, retry de red, etc.)
y generar N registros en `plan_requests` en el mismo segundo, saturando la tabla y
creando inconsistencia en el panel del administrador.

**Raíz del error**:
La lógica de "cancelar primero, crear después" tiene una race condition si dos requests
llegan concurrentes. Además, el frontend no tenía debounce y el usuario podía generar
múltiples taps legítimos.

**Parche aplicado**:
```typescript
// Antes de crear, verificar existencia
const existingPending = await this.prisma.planRequest.findFirst({
  where: { providerId: provider.id, status: 'PENDIENTE' },
});
if (existingPending) {
  throw new ConflictException('Ya tienes una solicitud en proceso.');
}
```

**Regla de oro**:
> Para cualquier recurso "singleton por estado" (solo puede existir una solicitud PENDIENTE
> por proveedor), siempre verificar existencia y lanzar `ConflictException` antes de crear.
> No usar el patrón "cancelo-y-creo" porque no es atómico bajo concurrencia.

---

## Error 4 — Enum `ProviderType` con valores fantasma (PROFESSIONAL, BUSINESS)

**Archivo**: `backend/prisma/schema.prisma`

**Qué pasó**:
El enum `ProviderType` contenía 4 valores: `OFICIO`, `NEGOCIO`, `PROFESSIONAL`, `BUSINESS`.
Los valores `PROFESSIONAL`/`BUSINESS` eran alias del viejo naming que nunca se usaron en la BD
(la columna `type` siempre almacenó `OFICIO`/`NEGOCIO`). Sin embargo, existía un campo
`providerType ProviderType @default(PROFESSIONAL)` que sí los referenciaba, causando:
1. Confusión al leer el schema — parecía que había 4 tipos de proveedor válidos.
2. El campo `providerType` en la BD era redundante con `type` pero con diferente semántica.
3. Al regenerar el cliente Prisma, los tipos TypeScript incluían los 4 valores aumentando
   superficie de error.

**Raíz del error**:
Refactor a medias: se renombraron los tipos en el código pero no se eliminaron los valores
obsoletos del enum ni el campo de BD que los usaba.

**Parche aplicado**:
- Eliminados `PROFESSIONAL` y `BUSINESS` del enum `ProviderType`.
- Eliminado el campo `providerType` del modelo `Provider`.
- `providers.service.ts` mantiene compatibilidad legacy con alias de string para no romper
  versiones viejas de Flutter: `if (type === 'OFICIO' || type === 'PROFESSIONAL')`.
- Ejecutado `db push --accept-data-loss` + `prisma generate` para sincronizar BD y cliente.

**Regla de oro**:
> Un enum de Prisma solo debe contener valores que se almacenan en la BD.
> Si un valor existe solo como alias en el código, mantenlo como constante TypeScript,
> no como valor de enum. Ejecutar `prisma db push` después de cada cambio de schema.

---

## Resumen de Reglas de Oro

| # | Área | Regla |
|---|------|-------|
| 1 | Validación | Flutter envía `""`, no `null`. Siempre `@Transform` antes de `@IsOptional` |
| 2 | Notificaciones | Con multi-perfil, toda notif de perfil necesita `targetProfileType` |
| 3 | Concurrencia | Recursos singleton-por-estado: verificar antes de crear, no cancelar-y-crear |
| 4 | Schema | Solo valores reales en enums Prisma. Alias de código = constantes TS, no enum values |
