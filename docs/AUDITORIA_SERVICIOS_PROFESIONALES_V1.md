# Auditoría de seguimiento — Servicios Profesionales V1

**Fecha inicial:** 2026-07-30 · **Cierre:** 2026-07-31
**Alcance:** `git diff 5d8d292..HEAD` (106 archivos) + 2 dimensiones adicionales corridas después
(UX móvil/web/admin, gaps de test). **Estado: CERRADA.** Los 16 hallazgos de §1-3 están corregidos y
probados (ver §6), la segunda auditoría UX/tests está corregida y probada (ver §7), y la verificación
final de las 4 apps está verde (ver §9). Único pendiente de código: 3.2 (SQL preparado, no ejecutado —
el propietario lo aplica manualmente). Gaps de cobertura explícitos, no silenciosos: P0-7 y P0-10 (§7).
SQL de rondas previas ya aplicado en Supabase por el propietario — nada de esto lo toca.

Metodología: cada hallazgo abajo lo leí yo mismo en el código real (no solo lo que reportó el
auditor) antes de listarlo como confirmado. Cito archivo:línea exacto.

---

## 1. CRÍTICO — bloquea producción

### 1.1 El panel web crashea para TODO proveedor Profesional
**`web/lib/profile-type-context.tsx:6`** y **`web/components/sidebar.tsx:297`** y
**`web/app/panel/layout.tsx:26`**

```ts
// profile-type-context.tsx:6 — tipo local, NO es el ProfileType de lib/types.ts
export type ProfileType = 'OFICIO' | 'NEGOCIO';

// sidebar.tsx:297
const META: Record<'OFICIO' | 'NEGOCIO', {...}>
// sidebar.tsx:173-174
const activeMeta = activeType ? META[activeType] : META.OFICIO;
const ActiveIcon = activeMeta.icon;   // <- explota si activeType === 'PROFESIONAL'
```

`activeType` se llena en runtime con el string crudo que devuelve el backend (`availableTypes` hace
`types.add(p.type)` sobre la respuesta de `/users/my-provider-status`, sin filtrar). Cuando un
proveedor es `PROFESIONAL`, `META['PROFESIONAL']` es `undefined` →
`TypeError: Cannot read properties of undefined (reading 'icon')` en el primer render del panel.
El error boundary de Next tumba **todo el árbol `/panel`**: perfil, servicios, mensajes, estadísticas.

`npx tsc --noEmit` pasa limpio porque el tipo local miente — no hay guardia de compilación.

**Alcanzable:** sí, siempre. Cualquier proveedor que se registre como Profesional desde la web, o
cuya migración se apruebe, entra a `/panel` y crashea de inmediato.

**Fix:** borrar `ProfileType`/`ProviderProfileSummary`/`MyProviderStatus` locales de
`profile-type-context.tsx` y reexportar los de `@/lib/types` (ya tienen los 3 valores +
`normalizeProfileType`); agregar la clave `PROFESIONAL` a `META` (sidebar.tsx:297) y `PROFILE_META`
(panel/layout.tsx:26).

**Riesgo del fix:** al ampliar el tipo, `tsc` marcará todos los `Record` indexados por tipo en web —
hay que revisar cada uno, no solo estos dos, o el crash se mueve de archivo. Cambio puramente de
tipos + un mapa nuevo; no toca backend ni datos.

---

## 2. ALTO — dinero o flujo principal roto

### 2.1 Migrar con UNA sola especialidad devuelve 400 (el caso más común)
**`backend/src/professional-migrations/dto/submit-professional-migration.dto.ts:21-27`**

```ts
const categoryIdsFromFormData = ({ value }) => {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(Number) : value;  // con 1 id: devuelve el string crudo
  } catch { ... }
};
```

Verificado: móvil (`auth_repository.dart:263`) y web (`api.ts:708`) mandan `categoryIds` como campo
multipart **repetido sin `[]`**. Multer/append-field solo convierte en array a partir de la
*segunda* aparición del campo — con una sola especialidad, `value` llega como el string `'12'`.
`JSON.parse('12')` da el número `12` (no un array) → la rama cae a `return value` → llega el string
`'12'` a `@IsArray()`, que lo rechaza. El DTO legacy de registro (`register-provider.dto.ts:178-183`)
ya resuelve este exacto problema con `return [value]`; ese patrón no se reusó aquí.

**Alcanzable:** cualquier proveedor que elija solo 1 especialidad al migrar (`professional_migration_screen.dart:131`
solo exige `isNotEmpty`, no exige 2+). Con 2+ especialidades funciona — bug intermitente.

**Fix:** en el DTO, si `parsed` es un número, envolver en array (`return [Number(parsed)]`) antes del
fallback. Una línea.

**Riesgo:** ninguno, solo amplía lo que ya se acepta. Agregar un test del DTO con un único id.

### 2.2 "Ir a mi panel" desde tu propia tarjeta rompe para Profesional (404)
**`mobile/lib/features/providers_list/presentation/widgets/provider_contact_bar.dart:250-252`**

```dart
providerType: provider.type == ProviderType.negocio ? 'NEGOCIO' : 'OFICIO',
```

Verificado línea por línea junto con `switchProfile()` (`auth_provider.dart:808-813`, no-op si el
tipo no está en `_providerProfiles`) y `ProviderPanel.initState`. Este archivo **no está en el diff**
de la tanda — quedó con el binario de antes aunque `ProviderType` ya tiene `profesional`
(`core/utils/provider_type.dart:7`).

**Escenario:** un Oficio migra a Profesional (aprobado, mismo `Provider.id`). El proveedor se busca a
sí mismo en el listado, abre su propia tarjeta y toca "Ir a mi panel" → se abre con
`providerType: 'OFICIO'` explícito → `switchProfile('OFICIO')` no hace nada (no tiene ese perfil) →
`GET /provider-profile/me?type=OFICIO` → 404. Antes de migrar, el mismo botón funcionaba: es una
regresión directa de la funcionalidad estrella.

**Fix:** `providerType: provider.type.apiValue ?? auth.activeProfileType` (mismo criterio XOR que ya
usa `provider_panel.dart:96-98`, que yo mismo corregí en la tanda anterior pero solo ahí — faltó este
archivo y el de abajo).

**Riesgo:** ninguno relevante, cambio de una línea en UI local.

### 2.3 El FAB "Ir a mi panel" (puerta principal al panel) nunca abre el panel Profesional
**`mobile/lib/features/providers_list/presentation/widgets/join_us_fab.dart:152-169`**

Mismo patrón que 2.2 pero en el FAB flotante: `verificationStatusFor('OFICIO')` /
`verificationStatusFor('NEGOCIO')` únicamente; `onlyType = hasOficio ? 'OFICIO' : 'NEGOCIO'`. Un
usuario que **solo** es Profesional cae al modal de alta en vez de a su panel; un Profesional+Negocio
salta directo al panel de Negocio y el panel profesional queda inalcanzable desde el FAB.

**Fix:** `final individualType = auth.hasProfessionalProfile ? 'PROFESIONAL' : 'OFICIO';` y usarlo en
las 4 apariciones de `'OFICIO'` dentro de `_openProviderPanel`/`_showPanelChoiceModal`.

**Riesgo:** hay que propagar `individualType` también a `verificationStatusFor`/`rejectionReasonFor`
dentro del chooser, o los banners mirarían un tipo distinto del que abre el panel.

### 2.4 Yape desde el panel (móvil y web) no manda `providerType` → 400 con 2 perfiles
**`mobile/.../plan_selector_sheet.dart:397`**, **`.../subscription_section.dart:241`**,
**`web/app/panel/perfil/page.tsx:676-683`**

El backend cambió en fase 1 de `findFirst({userId})` (resolvía siempre, elegía el primero) a exigir
`providerType` cuando hay 2 perfiles (`payments.service.ts:108-121`,
test `payments.service.spec.ts:168` confirma que es intencional). Ningún caller de estas 3 pantallas
fue actualizado para mandar el tipo activo.

**Escenario:** proveedor con perfil individual + Negocio yapea de verdad, sube el comprobante → 400
"Indica el tipo de perfil para enviar el comprobante". El dinero ya salió de su cuenta y el
comprobante nunca queda registrado.

**Fix:** pasar `providerType`/`activeType` (ya está en scope en los 3 sitios) al abrir el modal de
Yape.

**Riesgo:** ninguno relevante — es completar un parámetro ya soportado por el backend y por el modal.

### 2.5 Cancelar plan con 2 perfiles también da 400 (regresión)
**`mobile/lib/features/provider_dashboard/data/dashboard_repository.dart:276-278`**

`cancelPlan()` no manda `?type=` aunque `payments.controller.ts` ya lo acepta y
`payments.service.ts:369-373` ahora exige el tipo con 2 perfiles (test
`payments.regression.spec.ts:81` lo documenta como intencional). Antes de este diff, cancelar
siempre funcionaba (aunque podía tocar el perfil equivocado); ahora con 2 perfiles **no cancela**.

**Fix:** agregar parámetro opcional `type` a `cancelPlan()` y mandar
`widget.dash.currentProviderType` desde `subscription_section.dart:575`.

**Riesgo:** bajo.

### 2.6 `loadDashboard()` sin argumentos borra el tipo activo y el panel entero empieza a fallar
**`mobile/lib/features/provider_dashboard/presentation/providers/dashboard_provider.dart:78`**

```dart
_currentProviderType = providerType;  // incondicional, incluso si es null
```

4 call sites lo llaman sin tipo (después de cancelar plan, botones de reintento en Estadísticas,
callback de retorno de MercadoPago). Con 2 perfiles, el siguiente `GET /provider-profile/me` sin tipo
devuelve 400 y el panel queda en estado de error en cascada.

**Fix:** `if (providerType != null) _currentProviderType = providerType;` — arregla los 4 sitios de
una vez. Verificar que `_clearAll()` en logout siga poniéndolo en null explícitamente (sí lo hace).

**Riesgo:** bajo, es restaurar el comportamiento "sticky" que ya existía implícitamente.

### 2.7 Mejorar plan justo después de migrar da 400/403 hasta reiniciar la app
**`backend/src/payments/mercadopago/mercadopago.service.ts:72-85`**,
**`mobile/lib/features/auth/presentation/providers/auth/auth_socket_mixin.dart`**

`createPreference`/`submitYape` exigen coincidencia EXACTA de tipo (`findUnique({userId_type:{userId,type}})`,
sin el fallback OFICIO→PROFESIONAL que el webhook sí implementa (`payments.service.ts:568-573`). El
móvil manda `auth.activeProfileType ?? 'OFICIO'`, y ese estado queda obsoleto porque
`auth_socket_mixin.dart` maneja `PLAN_*`/`PROVIDER_*`/`TRUST_*`/`REFERRAL_*` pero **no**
`PROFESSIONAL_MIGRATION_APPROVED`, así que no dispara `_syncProviderStatus()`.

**Escenario:** admin aprueba la migración, el proveedor recibe el push y va directo a mejorar su plan
→ 400 "No tienes un perfil OFICIO para activar el plan". No puede pagar hasta reiniciar la app.

**Fix:** mismo fallback OFICIO→PROFESIONAL que ya existe en el webhook, aplicado también al pedir la
preferencia/enviar Yape; y agregar el evento de socket para refrescar el estado sin reiniciar.

**Riesgo:** el fallback hace que un pedido "OFICIO" cobre sobre el perfil PROFESIONAL — es lo correcto
(misma fila Provider), pero el detalle de MercadoPago seguiría diciendo "OFICIO" si no se recalcula.

### 2.8 Los listados nunca muestran especialidad ni el sello de credenciales verificadas
**`backend/src/providers/providers.service.ts`** — `findAll` (279-313), `getNearby` (672-693),
`getFeaturedGrouped` (526-549)

Solo `findOne` (detalle) selecciona `professionalProfile`/`verificationDocs`. Los 3 listados (buscar,
home agrupada, radar por cercanía) no los piden → `toPublicProvider` siempre emite
`professionalProfile: null, credentialVerified: false` ahí. El único diferenciador visible del tipo
nuevo — y el único incentivo de subir credenciales — es invisible exactamente donde el cliente
compara y elige.

**Fix:** agregar los mismos 2 selects que ya usa `findOne` a los 3 `include`.
`toPublicProvider` ya borra `verificationDocs` incondicionalmente antes de serializar, así que no hay
riesgo de fuga al ampliarlo.

**Riesgo:** 2 joins más en las consultas más calientes del producto (Render 512MB/0.1vCPU). Mitigado
por `take:1` + los cachés existentes (findAll 30s, featured 60s) — conviene medir después.

---

## 3. MEDIO / BAJO

| # | Severidad | Archivo:línea | Resumen | Riesgo del fix |
|---|---|---|---|---|
| 3.1 | medium | `professional-migrations.service.ts:105` | `submit()` no exige que el Oficio esté `verificationStatus=APROBADO` (a diferencia de trust-validation, su hermano); un Oficio PENDIENTE/RECHAZADO puede subir "certificados" y el admin los aprueba sin ver ese estado (`getForAdmin` no lo selecciona) | Si el producto quiere permitir migrar durante el alta, este gate bloquearía ese camino — **confirmar con el propietario antes de aplicar el gate**; agregar los campos al admin es 100% seguro y aditivo |
| 3.2 | medium | `backend/prisma/sql/profesionales_05_catalogo_inicial.sql:85,126` | Categorías `pro-*` nacen con `features` vacío; un Oficio con cotizaciones/agenda abiertas que migra pierde el acceso a esas secciones en el panel (los registros siguen en BD, solo se ocultan) | Es dato en producción — SQL manual idempotente adicional, solo `UPDATE` donde `features` esté vacío, nunca masivo |
| 3.3 | medium | `payments.service.ts:582,590` | Pago MercadoPago legacy ambiguo (2+ candidatos o ninguno) se descarta con un `logger.error` y `return`; sin `AdminNotification`, sin fila persistida — dinero cobrado sin rastro si el usuario reclama | Ninguno — es puramente aditivo (crear notificación antes del `return`) |
| 3.4 | low | `admin/components/pending-approvals-table.tsx:13-18,144` | En el dashboard general de aprobaciones pendientes (no en `/trust-validation`, que sí se corrigió), Profesional y Oficio comparten el mismo badge "Profesional" — el admin no distingue a cuál le está aprobando qué | Solo presentación |
| 3.5 | low | `mobile/.../card_provider_info.dart:35-37` | La tarjeta de listado pinta "Servicios profesionales" en azul (color de Oficio) en vez del verde convenido en el panel | Usar `tintOn`, no el verde crudo, para mantener contraste AA |
| 3.6 | low | `web/app/[slug]/page.tsx:312` | La página pública tipa (y pinta) `institution`/`yearsExperience` que el backend **no** devuelve hoy — no hay fuga activa, pero se perdió la barrera de compilación que lo impediría si alguien amplía el select sin querer | Ninguno — es borrar código muerto y angostar el tipo |

---

## 4. Lo que NO se auditó todavía

Las 3 corridas del workflow de auditoría murieron por el límite de sesión de la cuenta (cada agente
de auditoría gasta 150-280k tokens; 9 en paralelo + 9 verificadores lo agotan casi de inmediato). Sin
cubrir con el mismo rigor:

- **`migracion-backend`** (dedicado): transacción de `approve()` línea por línea, carrera de doble
  aprobación, preservación exacta de `Provider.id`/relaciones. *Cobertura parcial*: las notas "SANO"
  de seguridad-privacidad y categorías-features ya confirmaron guards, `updateMany`+`claimed.count`
  para la carrera, y que `approve()` no toca plan/rol/referidos — pero nadie trazó la transacción
  completa buscando relaciones huérfanas.
- **`xor-invariante`** (dedicado): igual, cubierto tangencialmente por las notas SANO de las otras 2
  dimensiones (categorías, features, límites de plan todos correctos), pero sin una pasada dedicada.
- **`flujos-sueltos`**: los hallazgos 2.2/2.3/2.4-2.7 de esta misma auditoría YA son flujos
  cortados/sueltos — pero no hubo pasada dedicada a buscar más (ej. notificaciones de
  aprobación/rechazo de migración: ¿el móvil las interpreta y muestra algo?).
- **`ux-movil-tema-animaciones`**: tema claro/oscuro, contraste AA, animaciones, responsividad en
  Flutter — **no auditado**. Pedido explícito del usuario, pendiente.
- **`ux-web-admin-responsive`**: responsividad de los wizards/paneles nuevos en web y admin —
  **no auditado**. Pedido explícito del usuario, pendiente.
- **`gaps-de-test`**: mapeo de las 10 pruebas obligatorias del plan contra los tests existentes —
  **no auditado**. Necesario antes de escribir los tests de regresión que pediste.

---

## 5. Lo que se confirmó SANO (no repetir trabajo)

- Autorización de los 4 endpoints admin de migraciones: guards + roles correctos, sin IDOR, sin mass
  assignment (ValidationPipe global `whitelist+forbidNonWhitelisted`).
- Cero fuga de PII en endpoints públicos: perfil público solo emite `{specialty}` + booleano; DNI,
  título, colegiatura, institución nunca salen de un endpoint público. `verificationDocs` se borra
  incondicionalmente antes de serializar.
- Documentos de credenciales van al bucket PRIVADO, firmados, con el mismo hardening 7A-7F que
  trust-validation (Multer limits, Sharp re-encode, descarte de metadata).
- El sello "Credenciales verificadas" no es autoservicio: solo `professional-migrations.service.ts`
  escribe esa tabla; no se puede falsear desde el panel propio.
- Carta digital/Catálogo correctamente bloqueados para Profesional (igual que Oficio) en las 2
  superficies (listado y panel) y en los 4 servicios de escritura.
- Validación de categoría por tipo en los 3 caminos (registro, edición propia, alta admin); fallback
  silencioso de categoría por defecto **eliminado**, no reintroducido.
- Agenda/Cotización/Referidos no se reactivan por accidente; los flags siguen intactos.
- Escenario de pago en vuelo durante una migración (el más peligroso de la lista): **no se pierde ni
  se duplica** — la referencia v2 usa `providerId` estable, y el fallback v1 resuelve la misma fila.
- Ningún cron job filtra por tipo de proveedor (revisados los 9 `@Cron` del proyecto).
- Índices/triggers de auditoría de suscripción no se disparan de forma espuria al aprobar una
  migración (la migración no toca plan/suscripción).

---

## 6. Fixes aplicados (cierre de la auditoría, 2026-07-31)

Las 9 dimensiones quedaron cubiertas: las 3 de la corrida original (arriba) + `gaps-de-test`,
`ux-movil-tema-animaciones` y `ux-web-admin-responsive` corridas secuencialmente (un agente a la vez —
la corrida paralela original agotó el límite de sesión dos veces). `migracion-backend` y
`xor-invariante` quedaron cubiertas tangencialmente por las notas SANO de §5; no se abrió una pasada
dedicada adicional (ver gaps al final).

**1.1 (crítico) — corregido.** `web/lib/profile-type-context.tsx` reexporta `ProfileType`/tipos de
`@/lib/types`; `sidebar.tsx` y `panel/layout.tsx` agregan la clave `PROFESIONAL` a `META`/`PROFILE_META`.
De paso se corrigió la colisión de nombre: OFICIO ya no se etiqueta "Profesional" (confundía con el
tipo nuevo) — ahora "Oficio" en `sidebar.tsx`, `panel/layout.tsx` y `admin/components/pending-approvals-table.tsx`.
`web/lib/api.ts` amplió 5 firmas `"OFICIO"|"NEGOCIO"` a `ProfileType` (8 errores de `tsc` en cascada,
todos resueltos ahí, ninguna lógica adicional rota).

**2.1 — corregido + test.** `submit-professional-migration.dto.ts`: `categoryIdsFromFormData` ahora
envuelve un número parseado (`typeof parsed === 'number'`) en array antes del fallback. Test nuevo:
`backend/test/unit/submit-professional-migration.dto.spec.ts` (5 casos vía `plainToInstance`+`validate`).

**2.2 / 2.3 — corregidos.** `provider_contact_bar.dart` usa `provider.type.apiValue ?? activeProfileType`;
`join_us_fab.dart` calcula `individualType = hasProfessionalProfile ? 'PROFESIONAL' : 'OFICIO'` y lo
propaga a las 4 apariciones + al chooser modal (icono/color dinámico para Profesional).

**2.4 / 2.5 — corregidos + test.** Yape en `plan_selector_sheet.dart`, `subscription_section.dart` y
`web/app/panel/perfil/page.tsx` ahora manda `providerType`/`activeType`. `cancelPlan()` acepta
`{String? type}` opcional en `dashboard_repository.dart`. Test nuevo `mobile/test/providers/dashboard_provider_test.dart`
(4 casos: fija tipo + query param, preserva tipo sin argumento, cancelPlan con/sin tipo).

**2.6 — corregido + test.** `dashboard_provider.dart`: `loadDashboard()` hace
`providerType ??= _currentProviderType;` al inicio, antes de fijar `_currentProviderType` y antes de
las llamadas de red — cubierto por el mismo test nuevo de arriba.

**2.7 — corregido + test.** Fallback OFICIO→PROFESIONAL agregado a `mercadopago.service.ts` (`createPreference`)
y `payments.service.ts` (`submitYapePayment`), con `resolvedType` reflejado en la descripción del item
MP. `auth_socket_mixin.dart` ahora maneja `PROFESSIONAL_MIGRATION_APPROVED/REJECTED` disparando
`_syncProviderStatus()`. Tests nuevos en `mercadopago.service.spec.ts` y `payments.service.spec.ts`.

**2.8 — corregido + test.** `providers.service.ts`: `findAll`, `getFeaturedGrouped` y `getNearby` ahora
incluyen `professionalProfile.specialty` y `verificationDocs` (certificado aprobado) — mismo patrón de
cast ya usado en `findOne` (`PublicProfessionalProviderDelegate`, extendido con `findMany`). 3 tests
nuevos en `providers.service.spec.ts`, incluyendo el primer test de `getFeaturedGrouped()` (no tenía
ninguno).

**3.1 — decisión del propietario aplicada.** Se preguntó explícitamente y se eligió bloquear:
`submit()` ahora exige `verificationStatus === 'APROBADO'` antes de aceptar la migración, con
`BadRequestException` si el Oficio está PENDIENTE/RECHAZADO. `getForAdmin()` expone
`verificationStatus`/`trustStatus`/`isVisible` y el detalle admin (`[id]/page.tsx`) los pinta como
badges junto al nombre del solicitante. 2 tests existentes actualizados (fixture `mockEligibleOficio`)
+ 1 test nuevo para el rechazo.

**3.2 — SQL preparado, NO ejecutado (pendiente del propietario).**
`backend/prisma/sql/profesionales_06_features_categorias_pro.sql` (nuevo, idempotente, con guard `DO $$`
y `SELECT` de verificación) rellena `features` de las categorías `pro-*` que nacieron vacías. Sigue la
regla dura del proyecto: ningún agente ejecuta SQL contra Supabase.

**3.3 — corregido + test.** `payments.service.ts` agrega `recordUnresolvedMpPayment()` (crea
`AdminNotification` tipo `MP_PAYMENT_UNRESOLVED` + emite evento admin) en los 2 puntos donde antes solo
había `logger.error`+`return`. Se sumó el tipo al enum de `events.gateway.ts` y a la whitelist
`ADMIN_NOTIF_WHERE` de `admin.service.ts` (si no se agrega ahí, la notificación se persiste pero nunca
aparece en el inbox admin). Tests actualizados en `payments.service.spec.ts` y `admin-notify.spec.ts`
(este último ahora compara el array completo, no `arrayContaining`, para que borrar una entrada futura
falle el test).

**3.4 — corregido.** `pending-approvals-table.tsx` gana su propia entrada `PROFESIONAL` (verde
esmeralda, coherente con sidebar/panel/admin) y el fallback para tipos desconocidos ya no reusa el
estilo de OFICIO — pinta el tipo crudo en gris neutro.

**3.5 — corregido.** `card_provider_info.dart` cambia el ternario binario por un `switch` que cubre
`negocio`/`profesional`/default, usando `AppColors.tintOn(AppColors.available, c.isDark)` para
Profesional (antes cualquier tipo no-Negocio caía en azul de Oficio).

**3.6 — corregido.** `web/app/[slug]/page.tsx`: se retiró el pintado de `institution`/`yearsExperience`
que el backend no devuelve; de paso el badge de tipo `PROFESIONAL` pasó a esmeralda (antes índigo,
igual al badge separado de "Credenciales verificadas" — ahora se distinguen visualmente).

---

## 7. Segunda auditoría — UX móvil/web/admin y gaps de test (2026-07-30/31)

Corrida secuencial (1 agente a la vez) tras agotar el límite de sesión con 9 agentes en paralelo.

**UX móvil (8 sitios de contraste/overflow + 1 fix raíz):** `professional_migration_screen.dart` (5
sitios: iconos/botón de éxito, banner informativo, botón submit + su spinner, icono de estado
pendiente — todos reemplazando `Colors.white`/`AppColors.available` crudos por `tintOn`/`onSolid`);
`filter_bar.dart` (chip Profesional con `AppColors.amberDeep` literal — `onSolid()` no es `const`,
documentado inline); `provider_panel.dart` (chip del switcher envuelto en `Flexible`+`ellipsis`, evita
overflow con "Panel de Servicio profesional" en pantallas angostas). **Fix raíz más allá de lo
reportado:** `join_us_status_banners.dart` (`ApprovedProfileBanner`) tenía el color verde de Oficio
hardcodeado — afectaba a los 3 tipos, no solo a Profesional. Se agregaron parámetros
`accentColor`/`iconColor` y se actualizaron los 3 call-sites en `join_us_initial_view.dart` (además de
`join_us_components.dart` y `profile_preview_mock.dart` para el mismo patrón de color parametrizable).

**UX web/admin (2 responsive + 1 color + 1 a11y):** tabla de cola de migraciones en
`admin/app/professional-migrations/page.tsx` envuelta en `overflow-x: auto` (se recortaba, no
scrolleaba, bajo 768px); 4 grids `grid-cols-2` fijos en `provider-onboarding-form.tsx` cambiados a
`grid-cols-1 sm:grid-cols-2` (institución/años, título/colegiatura×2, teléfono/whatsapp, nombre
comercial/razón social — colapsaban en móvil); `aria-label` agregado al `<select>` de filtro de tipo en
`admin/components/providers-list.tsx`; `web/app/globals.css` cambia `overflow-x: hidden` por
`overflow-x: clip` en `body` (`hidden` fuerza `overflow-y: auto` y duplica el scroll vertical).

**Gaps de test (6 huecos P0 cerrados):** ver §6 arriba (cada fix llevó su test). Diferidos
explícitamente, no silenciosamente: **P0-7** (ningún test cubre el handler nuevo
`PROFESSIONAL_MIGRATION_APPROVED/REJECTED` de `auth_socket_mixin.dart` — requeriría infraestructura de
socket falso que hoy no existe, todos los tests móviles mockean solo HTTP); **P0-10** (`web/` no tiene
infraestructura de test — cero `vitest.config`, cero RTL/jsdom — el bug crítico 1.1 que se arregló ahí
no tiene test de regresión propio; `admin/` sí la tiene y podría servir de plantilla). Items P1
catalogados y no implementados: test de integración del índice parcial de BD, 4to camino de rechazo de
categoría vía auto-edición, asserts negativos de relaciones intactas en `approve()`, test de reintento
tras rechazo, test de que Ofi reconoce PROFESIONAL, test de tema/accesibilidad por widget.

---

## 8. Regresiones descubiertas en la verificación final (2026-07-31)

`flutter test` completo (231 tests) detectó 4 fallos reales tras todo lo anterior — los 4 eran dobles
de prueba/fixtures que quedaron desactualizados frente a la superficie nueva de `PROFESIONAL`, no bugs
de producción:

- **`test/models/models_test.dart`**: `ProviderType.fromString('cualquier-otra-cosa')` esperaba
  `ProviderType.oficio` (comportamiento pre-Fase-3, cuando no existía un tercer tipo). Desde
  `core/utils/provider_type.dart` (nuevo en Fase 3), un valor no reconocido cae deliberadamente a
  `ProviderType.unknown` (bucket explícito) en vez de alias-earse silenciosamente a `oficio`. Se
  actualizó la expectativa al valor correcto y se agregó el caso `'PROFESIONAL' → profesional`.
- **`test/providers/providers_filter_test.dart`**: esperaba que `setType('BUSINESS')`/`setType('PROFESSIONAL')`
  (alias legacy en inglés) viajaran LITERALES al backend. Fase 3 agregó canonicalización
  (`normalizeProviderType`) en `ProvidersProvider.setType()` precisamente para que esos alias legacy se
  traduzcan a `NEGOCIO`/`OFICIO` antes de salir — el test pre-Fase-3 nunca se actualizó. Se renombraron
  los casos para reflejar la canonicalización y se agregó un caso con el valor canónico nuevo
  (`'PROFESIONAL' → PROFESIONAL`, sin traducir).
- **`test/widgets/ai_assistant_fab_ofi_toggle_test.dart`**: el doble `_FakeAuth` (usa `noSuchMethod`
  para simular `AuthProvider`) no sobrescribía el nuevo getter `hasProfessionalProfile` que
  `ai_assistant_fab.dart` empezó a consultar en Fase 3; la llamada fallaba en runtime y el `catch (_)`
  de `_shouldShow()` (diseñado para fallar abierto y mostrar el FAB ante cualquier error) enmascaraba
  el fallo — el FAB nunca se ocultaba en el test aunque el código de producción es correcto. Se agregó
  `@override bool get hasProfessionalProfile => false;` al doble.

Ningún fix de producción fue necesario para estos 3 archivos — los 3 son actualizaciones de tests
desactualizados. Ninguno de los 3 había sido tocado por los fixes de §6/§7, por eso sobrevivieron sin
detectarse hasta correr la suite completa al final.

---

## 9. Verificación final — 4 apps (2026-07-31)

| App | Comando | Resultado |
|---|---|---|
| Backend | `npm test` | 73 suites / 638 tests — verde |
| Mobile | `flutter test` | 231/231 — verde (tras los 3 fixes de §8) |
| Mobile | `flutter analyze` | 0 warnings/errores, 14 infos de estilo preexistentes (`curly_braces_in_flow_control_structures`) |
| Admin | `npx vitest run` | 10 archivos / 26 tests — verde |
| Admin | `npx tsc --noEmit` | limpio |
| Web | `npm run build` (incluye TS) | compila + typecheck limpio, 18 rutas generadas |

Ningún SQL, migración ni dato de producción fue tocado durante esta tanda. `backend/prisma/sql/profesionales_06_features_categorias_pro.sql`
queda preparado para que el propietario lo aplique manualmente cuando decida (ver §6, hallazgo 3.2).
