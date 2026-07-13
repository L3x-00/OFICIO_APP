# Runbook de reactivación de funcionalidades ocultas

- **Última revisión:** 2026-07-13
- **Estado base revisado:** `main` en `002791d`
- **Origen:** PR #36 (`a50fc9c`) y PR #37 (`002791d`)

Este documento explica cómo volver a publicar, de forma independiente, las
cinco funcionalidades ocultas y la funcionalidad restringida por tipo de
proveedor:

1. Subastas "ConfiServ".
2. Ofertas/promociones (`offer_posts`).
3. Referidos y monedas.
4. Agenda.
5. Cotización.
6. Carta y Catálogo para proveedores `OFICIO`.

El código, las tablas y el historial principal se conservaron. La reactivación
no debe hacerse revirtiendo PRs completos: cada capa tiene su propio switch o
bloque de presentación.

---

## 1. Reglas antes de reactivar

### 1.1 No revertir PR #36 ni PR #37 completos

No usar `git revert a50fc9c` ni `git revert 002791d`. Esos commits también
contienen correcciones de pagos, notificaciones, seguridad, pruebas y la
deprecación de `PlanRequest`. Revertirlos completos reabriría errores que no
pertenecen a estas funcionalidades.

Usar los commits solo como referencia histórica:

```powershell
git diff a50fc9c^ a50fc9c -- <ruta>
git diff 002791d^ 002791d -- <ruta>
git show a50fc9c^:<ruta>
git show 002791d^:<ruta>
```

Copiar únicamente el bloque necesario. Nunca reemplazar un archivo actual por
su versión antigua completa: puede haber correcciones posteriores.

### 1.2 Reactivar una feature por PR

Flujo recomendado:

1. Crear rama `feat/reactivar-<feature>` desde `origin/main`.
2. Mantener los flags de producción apagados mientras se prepara el código.
3. Ajustar código, copy y pruebas de esa sola feature.
4. Verificar backend, móvil, web/admin afectados.
5. Abrir PR y esperar CI verde.
6. Desplegar backend con el flag todavía apagado.
7. Encender el flag backend y verificar API.
8. Publicar web y/o `.aab` después de confirmar backend sano.

Para ocultarla otra vez, invertir el orden: primero retirar UI pública; luego
apagar el backend.

### 1.3 Los valores son literales

Los flags backend solo están activos cuando su valor es exactamente `true` en
minúsculas. Cualquier otro valor equivale a apagado.

| Capa | Tipo de switch | Efecto |
|---|---|---|
| Render/backend | `FEATURE_*=true` | Runtime. Reiniciar servicio; no requiere cambiar código. |
| Ofi tools | `AI_TOOL_<NOMBRE>_ENABLED=true` | Runtime. Además la tool debe estar declarada y permitida para la persona. |
| Web/Vercel | `NEXT_PUBLIC_*=true` | Build-time. Requiere nuevo deploy de web. |
| Mobile | `const bool k*Enabled = true` | Compile-time. Requiere nuevo `.aab` y publicación en Play. |
| Carta/Catálogo OFICIO | No existe flag actual | Requiere PR backend; se recomienda añadir flags reversibles. |

### 1.4 Orden seguro de despliegue

Backend primero. UI después. Así una app o web nueva nunca apunta a endpoints
que todavía devuelven 404.

Excepción operativa: Agenda y Cotización se muestran en móvil a partir del
array `features` devuelto por backend. Al encender su flag en Render pueden
reaparecer también en `.aab` ya instalados; no necesitan publicación móvil.

### 1.5 Base de datos de producción

El agente nunca ejecuta SQL contra Supabase producción. El usuario aplica el
SQL manualmente y confirma el resultado. Referidos/Monedas sí necesita
reactivar una fila de conocimiento de Ofi. Agenda, Cotización y Carta/Catálogo
solo necesitarían SQL de datos si la auditoría de producción demuestra que
faltan valores en `Category.features`; ese SQL se prepara y revisa en una tanda
separada. Ninguna reactivación necesita borrar o recrear tablas, triggers o
funciones.

---

## 2. Matriz rápida

| Funcionalidad | Backend Render | Mobile | Web | Admin | BD |
|---|---|---|---|---|---|
| Subastas | `FEATURE_SUBASTAS=true` | `kSubastasEnabled=true` + `.aab` | Restaurar nav y `SUBASTAS_ENABLED` + deploy | Sin cambio | Sin SQL |
| Ofertas | `FEATURE_OFERTAS=true` | `kOfertasEnabled=true` + `.aab` | No hay storefront web de `offer_posts` | Restaurar nav + deploy | Sin SQL |
| Referidos | `FEATURE_REFERIDOS=true` | `kReferidosEnabled=true` + `.aab` | `NEXT_PUBLIC_FEATURE_REFERIDOS=true`, restaurar ruta/nav/banner | Historial ya accesible | SQL manual Ofi |
| Agenda | `FEATURE_AGENDA=true` | Dinámico desde `features`; sin `.aab` | Sin switch dedicado | Sin cambio | SQL manual solo si falta en categorías |
| Cotización | `FEATURE_COTIZACION=true` | Dinámico desde `features`; sin `.aab` | Restaurar copy si se desea | Sin cambio | SQL manual solo si falta en categorías |
| Carta/Catálogo OFICIO | PR backend; ideal flags nuevos | Dinámico desde `features` | Dinámico si consume `features` | Admin actual no edita `features` | SQL manual solo si falta en categorías |

Importante: la ruta web `/panel/ofertas` pertenece a **Subastas/Oportunidades**,
no a `offer_posts`. No mezclar ambos módulos aunque compartan la palabra
"ofertas" en la interfaz.

---

## 3. Subastas "ConfiServ"

### 3.1 Qué está apagado

- Todo `/subastas/*` responde 404 mediante `FEATURE_SUBASTAS`.
- Móvil oculta banner, ruta `/my-requests`, "Mis solicitudes", tab
  Oportunidades, deep-links FCM, chips de notificación, salas socket y showcase.
- Web oculta el acceso del proveedor a `/panel/ofertas` y redirige esa página.
- Copy de planes y FAQ dejó de prometer oportunidades/subastas.
- No se eliminaron solicitudes, postulaciones, reseñas ni datos históricos.

### 3.2 Backend

En Render, servicio backend:

```text
FEATURE_SUBASTAS=true
```

Guardar la variable y reiniciar/redeployar el servicio. El guard está en:

- `backend/src/subastas/subastas.controller.ts`
- `backend/src/common/feature-flag.guard.ts`

Con el flag activo vuelven a responder:

- `POST /subastas/requests`
- `GET /subastas/requests/mine`
- `POST /subastas/requests/accept`
- `DELETE /subastas/requests/:id`
- `GET /subastas/opportunities/me`
- `POST /subastas/offers`
- `DELETE /subastas/offers/:offerId`
- `POST /subastas/offers/arrived`

No retirar el guard. Mantenerlo permite volver a ocultar por env sin deploy.

### 3.3 Mobile

Cambiar únicamente:

```dart
// mobile/lib/core/constants/feature_flags.dart
const bool kSubastasEnabled = true;
```

Ese flag ya vuelve a incluir de forma coordinada:

- `/my-requests` en `mobile/lib/core/router/app_router.dart`.
- "Mis solicitudes" en
  `mobile/lib/features/auth/presentation/screens/profile_screen.dart`.
- Banner `SubastaBanner` en
  `mobile/lib/features/providers_list/presentation/screens/providers_screen.dart`.
- Tab Oportunidades y sus índices en
  `mobile/lib/features/provider_dashboard/presentation/screens/provider_panel.dart`.
- Salas socket de categorías en
  `mobile/lib/features/provider_dashboard/presentation/providers/dashboard_provider.dart`.
- Acciones de notificaciones en
  `mobile/lib/features/notifications/presentation/screens/notifications_screen.dart`.
- Navegación FCM en `mobile/lib/main.dart`.
- Paso de tutorial en `mobile/lib/features/showcase/showcase_data.dart`.

No hardcodear índices de tabs. Conservar `kPanelTab*` y los índices derivados de
flags existentes.

Copy que debe revisarse antes de publicar el `.aab`:

- `mobile/lib/core/widgets/auth_side_effect_dialogs.dart`: decidir si los
  planes vuelven a prometer "Acceso a oportunidades".
- `mobile/lib/features/payments/presentation/screens/plan_selector_sheet.dart`:
  restaurar "Subastas" solo en el plan que realmente tenga ese beneficio.
- `mobile/lib/features/providers_list/presentation/widgets/provider_contact_bar.dart`:
  volver a mencionar interacción por subasta si aplica al permiso de reseña.

No restaurar `requestPlanUpgrade`: pertenece a `PlanRequest`, flujo deprecado e
inseguro; no es parte de Subastas.

### 3.4 Web proveedor

1. En `web/app/panel/ofertas/page.tsx`, cambiar:

   ```ts
   const SUBASTAS_ENABLED = true;
   ```

2. En `web/components/sidebar.tsx`:
   - Restaurar el import `Zap` desde `lucide-react` si sigue ausente.
   - Descomentar `{ label: 'Ofertas', icon: Zap, href: '/panel/ofertas' }`.

3. En `web/app/panel/layout.tsx`:
   - Restaurar `Zap` si el import fue retirado.
   - Descomentar el item móvil de `/panel/ofertas`.

4. Restaurar, si el producto vuelve a prometer la feature:
   - FAQ comentada en `web/components/ai-chat-widget.tsx`.
   - FAQ comentada en `web/components/modals/faq-modal.tsx`.
   - Copy "oportunidades" en `web/app/cliente/page.tsx`.

El componente completo de oportunidades permanece dentro de
`web/app/panel/ofertas/page.tsx` como `PanelOfertasInner`; no reconstruirlo.

### 3.5 Ofi

No existe una tool `search_subastas`. Para reactivar explicación/copy:

- Revisar `backend/src/ai-assistant/strategies/client.strategy.ts` y volver a
  indicar que Ofi ayuda a entender subastas.
- Restaurar las FAQ web indicadas arriba.
- No reutilizar `search_offers`: esa tool consulta `offer_posts`, no Subastas.

### 3.6 Prueba mínima antes de publicar

1. Cliente crea una solicitud.
2. Proveedor de categoría compatible recibe socket/FCM y ve Oportunidades.
3. Proveedor envía propuesta.
4. Cliente recibe `NEW_OFFER`, abre `/my-requests` y acepta.
5. Proveedor recibe `OFFER_ACCEPTED` y navega al tab correcto.
6. Verificar que solicitudes cerradas/expiradas no aparezcan como abiertas.

### 3.7 Rollback

1. Retirar nav web o volver `SUBASTAS_ENABLED=false` y desplegar web.
2. Publicar móvil con `kSubastasEnabled=false` cuando corresponda.
3. Poner `FEATURE_SUBASTAS=false` en Render.
4. No borrar historial.

---

## 4. Ofertas/promociones (`offer_posts`)

### 4.1 Qué está apagado

- `/offers` y `/providers/me/offers` responden 404.
- Móvil oculta tab Ofertas, banner del home y gestión en Servicios.
- Admin oculta el enlace de moderación, pero la página sigue accesible por URL.
- Ofi no declara `search_offers` ni recomienda publicar promociones.
- El cron que expira ofertas viejas continúa activo.

### 4.2 Backend

En Render:

```text
FEATURE_OFERTAS=true
```

El flag habilita:

- Rutas públicas `/offers`.
- Gestión del proveedor `/providers/me/offers`.

Los controllers `/admin/offers` y `/admin/offer-reports` nunca se apagaron.
Mantener el guard actual para poder volver a ocultar por env.

### 4.3 Mobile

```dart
// mobile/lib/core/constants/feature_flags.dart
const bool kOfertasEnabled = true;
```

El mismo flag restaura:

- Branch y tab `/offers` del shell cliente en
  `mobile/lib/core/router/app_router.dart`.
- Índices correctos de Alertas y Perfil en
  `mobile/lib/core/router/app_router.dart` y
  `mobile/lib/core/router/app_shell.dart`.
- `OffersBanner` del home en
  `mobile/lib/features/providers_list/presentation/screens/providers_screen.dart`.
- Paso showcase de Ofertas en
  `mobile/lib/features/showcase/showcase_data.dart`.
- Carga y sección `OfferPostsSection` del panel proveedor en
  `mobile/lib/features/provider_dashboard/presentation/screens/panel_services_tab.dart`.

Requiere compilar, probar y publicar un `.aab` nuevo.

### 4.4 Admin

En `admin/components/sidebar.tsx`:

1. Restaurar `Tag as TagIcon` en imports.
2. Descomentar:

   ```ts
   { href: '/marketplace/offers', label: 'Ofertas', icon: TagIcon }
   ```

No tocar el tab "Solicitudes de Plan". Ese tab pertenece a `PlanRequest` y
permanece deprecado por falta de comprobante, monto y auditoría.

### 4.5 Ofi

La ejecución `searchOffersSafe()` y el case `search_offers` siguen presentes,
pero la declaración fue comentada y la allowlist no la incluye.

Para reactivarla completamente:

1. Descomentar la definición `search_offers` en
   `backend/src/ai-assistant/tools/common-tools.ts`.
2. Añadir `search_offers` a las personas que deban usarla en
   `TOOLS_BY_PERSONA`, dentro de
   `backend/src/ai-assistant/tools/tool-registry.ts`. Para la reactivación
   mínima, añadirla solo a CLIENT. No exponerla a PROVIDER sin un alcance y
   pruebas separados.
3. En Render habilitar:

   ```text
   AI_TOOL_SEARCH_OFFERS_ENABLED=true
   ```

4. Restaurar el tip "Publica una oferta" en
   `backend/src/ai-assistant/ai-data-access.service.ts`.
5. Actualizar pruebas del registro de tools.

Dato importante: antes de ocultarla, `search_offers` ya estaba fuera de la
allowlist. Encender solo `AI_TOOL_SEARCH_OFFERS_ENABLED` no basta.

### 4.6 Web

Actualmente no existe storefront web público de `offer_posts`. No activar
`web/app/panel/ofertas`: esa ruta es Subastas/Oportunidades.

Si se quiere Ofertas también en web, eso es una implementación nueva y debe ir
en otro alcance; no forma parte de la reactivación mínima.

### 4.7 Prueba mínima

1. Proveedor crea, edita, oculta y elimina una oferta.
2. Cliente ve tab, banner y detalle.
3. Oferta expirada no aparece en listado público.
4. Reporte llega al admin y puede resolverse.
5. Ofi devuelve promociones reales solo cuando la tool está habilitada.

### 4.8 Rollback

1. Ocultar nav admin y UI móvil.
2. Retirar/declarar inactiva la tool Ofi.
3. Poner `FEATURE_OFERTAS=false`.
4. Mantener cron, moderación e historial.

---

## 5. Referidos y monedas

### 5.1 Bloqueo obligatorio: alinear recompensas antes de publicar

El backend actual es la fuente de verdad:

```text
Invitador aprobado: 25 monedas
Invitado aprobado: 5 monedas
Plan ESTANDAR: 1000 monedas / 1 mes
Plan PREMIUM: 2000 monedas / 2 meses
```

Antes de reactivar, corregir dos copias antiguas:

- `web/components/referral-panel.tsx` todavía muestra costos `500/1000`.
- El bloque comentado de `backend/src/ai-assistant/ai-knowledge.seeder.ts`
  todavía dice `50` para el invitador y `500/1000` para planes.

No publicar Referidos ni reactivar conocimiento Ofi hasta alinear ambos con
`backend/src/referrals/referrals.service.ts`.

### 5.2 Backend

En Render:

```text
FEATURE_REFERIDOS=true
```

Esto reactiva `/referrals/*`, vuelve a acreditar monedas desde
`onProviderApproved()` y permite sugerencias internas relacionadas. La
constante que declara tools se evalúa al iniciar el proceso: reiniciar Render es
obligatorio.

Los endpoints admin `/admin/referral-stats` y `/admin/rewards` permanecieron
vivos durante el ocultamiento.

### 5.3 SQL manual de Ofi

Aplicar manualmente en Supabase SQL Editor después de corregir el copy y antes
de hacer pública la UI. Este UPDATE es idempotente y también corrige el contenido
antiguo:

```sql
UPDATE ai_knowledge_entries
SET
  content = '{
    "codigo": "Cada usuario tiene un código de referido único.",
    "recompensa": "Al aprobarse un invitado, el que invita gana 25 monedas y el invitado 5.",
    "canje": "1000 monedas = 1 mes Estándar; 2000 = 2 meses Premium."
  }'::jsonb,
  "isActive" = true,
  "updatedAt" = NOW()
WHERE topic = 'referidos_y_monedas'
RETURNING topic, "isActive", version, "updatedAt";
```

Resultado esperado: exactamente una fila. Si devuelve cero filas, detener el
rollout y revisar; no insertar datos a ciegas.

La Knowledge Base se cachea hasta 5 minutos bajo la key
`ai:knowledge:context`. En el estado actual no existe endpoint Admin conectado
a `AiKnowledgeService.invalidate()`: esperar el TTL completo tras el UPDATE.
No vaciar Redis completo ni borrar otras keys.

### 5.4 Seeder y Ofi

1. Descomentar la entrada `referidos_y_monedas` en
   `backend/src/ai-assistant/ai-knowledge.seeder.ts`.
2. Corregirla a `25/5` y `1000/2000` antes de descomentarla. Esto protege bases
   nuevas; el seeder no actualiza producción cuando la tabla ya tiene filas.
3. Revisar `client.strategy.ts` y `guest.strategy.ts` para volver a mencionar
   monedas.
4. Restaurar ejemplos de monedas/referidos en la descripción de
   `explain_feature` dentro de `common-tools.ts`.
5. Habilitar en Render, si Ofi debe consultar el saldo:

   ```text
   AI_TOOL_GET_USER_COINS_ENABLED=true
   AI_TOOL_EXPLAIN_FEATURE_ENABLED=true
   ```

6. Para estadísticas de referidos también:
   - Añadir `get_referral_stats` a la persona CLIENT en
     `tools/tool-registry.ts`.
   - Habilitar `AI_TOOL_GET_REFERRAL_STATS_ENABLED=true`.

`get_referral_stats` está declarado y ejecutable, pero no está en la allowlist
actual. Encender solo su variable no lo expone.

### 5.5 Mobile

```dart
// mobile/lib/core/constants/feature_flags.dart
const bool kReferidosEnabled = true;
```

El flag restaura automáticamente:

- Contador de monedas en home:
  `mobile/lib/features/providers_list/presentation/screens/providers_screen.dart`.
- Ruta `/referrals`: `mobile/lib/core/router/app_router.dart`.
- Entrada "Promociones y referidos" del perfil:
  `mobile/lib/features/auth/presentation/screens/profile_screen.dart`.
- Sección Promociones del panel proveedor:
  `mobile/lib/features/provider_dashboard/presentation/screens/panel_settings_tab.dart`.
- Código de referido y llamada backend en onboarding:
  `mobile/lib/features/auth/presentation/screens/onboarding/provider_onboarding_form.dart`.
- FAQ local de Ofi invitado:
  `mobile/lib/features/ai_assistant/presentation/guest_chat_screen.dart`.
- Paso showcase de monedas:
  `mobile/lib/features/showcase/showcase_data.dart`.

Requiere nuevo `.aab`.

### 5.6 Web

En Vercel/web:

```text
NEXT_PUBLIC_FEATURE_REFERIDOS=true
```

Requiere nuevo build/deploy. Ese flag restaura automáticamente:

- Tab Referidos de `/cliente`.
- Aplicación del código en onboarding.
- FAQ, Acerca de, manual y FAQ del widget IA.

Además hay tres bloques manuales:

1. Restaurar la implementación de `web/app/panel/referidos/page.tsx`. La versión
   anterior puede consultarse con:

   ```powershell
   git show a50fc9c:web/app/panel/referidos/page.tsx
   ```

   Debe volver a renderizar `ReferralPanel`; no dejar `notFound()`.

2. En `web/components/sidebar.tsx`, restaurar import `Gift` y el enlace
   `/panel/referidos`.
3. En `web/app/panel/layout.tsx`, restaurar import `Gift` y el item móvil.
4. En `web/app/page.tsx`, restaurar import y bloque `ReferralBanner` si se desea
   promoción en landing.

Antes del deploy, corregir `PLAN_REWARDS` en
`web/components/referral-panel.tsx` a `1000/2000`.

### 5.7 Prueba mínima

1. Usuario obtiene código y lo aplica otro usuario.
2. Aprobación del proveedor acredita exactamente `25` y `5` una sola vez.
3. Segunda aprobación no duplica monedas.
4. Canje Estándar descuenta `1000`; Premium `2000`.
5. Web y móvil muestran los mismos costos que backend.
6. Ofi responde con `25/5` y `1000/2000`, nunca con cifras antiguas.
7. Probar historial y saldos previamente congelados.

### 5.8 Rollback

1. Poner `NEXT_PUBLIC_FEATURE_REFERIDOS=false` y desplegar web.
2. Publicar móvil con `kReferidosEnabled=false`.
3. Poner `FEATURE_REFERIDOS=false` en Render.
4. Aplicar manualmente:

   ```sql
   UPDATE ai_knowledge_entries
   SET "isActive" = false, "updatedAt" = NOW()
   WHERE topic = 'referidos_y_monedas';
   ```

5. No borrar saldos, códigos, referrals ni redemptions.

---

## 6. Agenda

### 6.1 Qué está apagado

- El backend retira `agenda` del array público `features`.
- `GET /appointments/provider/:providerId/slots` devuelve 404.
- `POST /appointments` devuelve 404.
- El cron de recordatorios del día siguiente sale sin consultar BD.
- Listado, confirmación, cancelación, rechazo y finalización permanecieron vivos
  para drenar citas existentes.

### 6.2 Reactivación

En Render:

```text
FEATURE_AGENDA=true
```

Reiniciar el backend. No se necesita cambio móvil: el CTA público y la entrada
del panel derivan del array `features` devuelto por backend.

Antes de encender:

1. Verificar que las categorías correctas tengan `agenda` en
   `Category.features`; las hijas heredan del padre solo cuando su array está
   vacío.
2. Verificar horarios `appointmentSchedule` de proveedores.
3. Revisar citas futuras: al encender, el cron de recordatorios vuelve a correr
   y puede notificar citas ya existentes que aún no tengan `reminderSentAt`.

No ejecutar SQL si las categorías ya están bien configuradas. En el estado
actual (`002791d`), el Admin y su API de categorías **no permiten editar**
`Category.features`. Si faltara `agenda`, elegir una de estas rutas en una tanda
separada:

1. Añadir soporte validado para `features` al Admin/API, con tests y auditoría.
2. Generar un SQL de datos idempotente bajo protocolo `sql-prod`, limitado por
   `slug` o `id` revisados; el usuario lo aplica manualmente.

Nunca actualizar categorías por coincidencias amplias de nombre.

### 6.3 Prueba mínima

1. Perfil con categoría `agenda` devuelve `agenda` en `features` público.
2. Cliente consulta slots y crea cita.
3. Proveedor ve, confirma/rechaza y completa.
4. Cliente cancela según reglas actuales.
5. Cron envía un solo recordatorio y respeta `reminderSentAt`.
6. Perfil sin feature `agenda` no muestra CTA.

### 6.4 Rollback

Poner `FEATURE_AGENDA=false`. El CTA desaparece y no se crean citas nuevas;
historial y endpoints de drenaje continúan disponibles.

---

## 7. Cotización

### 7.1 Qué está apagado

- El backend retira `cotizacion` del array público `features`.
- `POST /quotations/photo` y `POST /quotations` devuelven 404.
- Listar, responder y rechazar permanecieron vivos para drenar pendientes.
- La landing cambió "Conecta y cotiza" por "Conecta directamente".

### 7.2 Reactivación

En Render:

```text
FEATURE_COTIZACION=true
```

Reiniciar backend. No existe flag móvil; el CTA reaparece en apps instaladas
cuando el backend vuelve a incluir `cotizacion` en `features`.

Antes de encender, verificar que las categorías correctas tengan `cotizacion`
en `Category.features`. El Admin/API actual no edita este campo. Si falta,
seguir una tanda separada: soporte Admin/API validado o SQL idempotente limitado
por `slug`/`id`, revisado y aplicado manualmente por el usuario. Nunca hacer un
`UPDATE` masivo por nombre.

Para restaurar el mensaje comercial web, editar
`web/components/hero-section.tsx`:

```text
Título: Conecta y cotiza
Descripción: Chatea directamente con el profesional, explica tu problema y recibe un presupuesto transparente.
```

Ese cambio requiere build/deploy web, pero no es necesario para que el flujo
backend/móvil funcione.

### 7.3 Prueba mínima

1. Perfil compatible devuelve `cotizacion` en `features` público.
2. Cliente sube una foto y crea una cotización.
3. La cotización aparece en "Mis cotizaciones".
4. Proveedor lista, responde o rechaza.
5. Perfil sin feature no muestra CTA.
6. Validar límites y tipos de imagen del upload.

### 7.4 Rollback

Poner `FEATURE_COTIZACION=false`. Las nuevas solicitudes y uploads quedan
bloqueados; historial y respuesta a pendientes siguen vivos.

---

## 8. Carta y Catálogo para proveedores OFICIO

Esta no es una feature apagada globalmente. Carta y Catálogo siguen activos
para `NEGOCIO`; el backend excluye `OFICIO` en tres niveles:

1. Filtra `carta_digital` y `catalogo` del array `features`.
2. Bloquea lectura pública de carta/catálogo para un OFICIO.
3. Bloquea gestión del dueño OFICIO.

Actualmente no existe variable de entorno. Reactivarlo requiere PR backend.

### 8.1 Opción recomendada: flags reversibles e independientes

Añadir a `backend/.env.example`:

```text
FEATURE_CARTA_OFICIO=false
FEATURE_CATALOGO_OFICIO=false
```

En `backend/src/common/provider-features.service.ts`, cambiar la condición que
filtra ambos features para que cada uno acepte OFICIO solo con su flag:

```ts
if (
  f === 'carta_digital' &&
  providerType !== 'NEGOCIO' &&
  process.env.FEATURE_CARTA_OFICIO !== 'true'
) {
  return false;
}

if (
  f === 'catalogo' &&
  providerType !== 'NEGOCIO' &&
  process.env.FEATURE_CATALOGO_OFICIO !== 'true'
) {
  return false;
}
```

Esto permite reactivar Carta y Catálogo por separado.

### 8.2 Carta para OFICIO

En `backend/src/menu/menu.service.ts`, tanto en lectura pública como en
`assertOwner`, sustituir el bloqueo rígido por:

```ts
if (
  provider.type !== 'NEGOCIO' &&
  process.env.FEATURE_CARTA_OFICIO !== 'true'
) {
  // conservar la excepción actual de cada superficie
}
```

Después del deploy, en Render:

```text
FEATURE_CARTA_OFICIO=true
```

### 8.3 Catálogo para OFICIO

En `backend/src/catalog/catalog.service.ts`, tanto en lectura pública como en
`assertOwner`, sustituir el bloqueo rígido por:

```ts
if (
  provider.type !== 'NEGOCIO' &&
  process.env.FEATURE_CATALOGO_OFICIO !== 'true'
) {
  // conservar la excepción actual de cada superficie
}
```

Después del deploy, en Render:

```text
FEATURE_CATALOGO_OFICIO=true
```

### 8.4 Categorías: condición adicional obligatoria

Los flags no inventan funcionalidades para todas las categorías. El proveedor
solo recibe Carta/Catálogo si alguna categoría efectiva contiene:

- `carta_digital` para Carta.
- `catalogo` para Catálogo.

Antes de encender, revisar categorías OFICIO en producción. El seed actual
asigna Carta principalmente a `neg-alimentacion` y Catálogo a `neg-retail`; la
configuración real de producción puede diferir.

En el estado actual (`002791d`), el Admin/API de categorías no expone el campo
`features`. Si una categoría OFICIO aprobada necesita `carta_digital` o
`catalogo`, abrir una tanda separada para una de estas opciones:

1. Incorporar edición validada y auditada de `features` al Admin/API.
2. Preparar SQL idempotente por `slug` o `id` exactos bajo `sql-prod`; el usuario
   lo aplica manualmente y valida las filas retornadas.

No ejecutar un `UPDATE` masivo por nombre: podría habilitar herramientas
comerciales a rubros incorrectos.

### 8.5 Mobile y web

No se necesita flag móvil. `DashboardProfileModel` y las pantallas públicas ya
derivan `hasMenu`/`hasCatalog` del array backend. Cuando backend incluya el
feature para un OFICIO:

- El panel muestra "Mi carta digital" o "Mi catálogo".
- El perfil público muestra la entrada correspondiente.
- Los endpoints de gestión dejan de responder 403 para ese OFICIO.

Hacer prueba con `.aab` actual y con la versión que se vaya a publicar. Si una
superficie web no consume `features`, eso será trabajo de UI separado.

### 8.6 Tests que deben cambiar

- `backend/test/unit/provider-features.service.spec.ts`: cubrir flags apagados,
  Carta activa sola, Catálogo activo solo y ambos activos para OFICIO.
- `backend/test/unit/menu.service.spec.ts`: lectura y gestión OFICIO con flag.
- `backend/test/unit/catalog.service.spec.ts`: lectura y gestión OFICIO con flag.
- Mantener pruebas de ownership, límites de plan y feature por categoría.

### 8.7 Prueba mínima

1. OFICIO con categoría sin feature no ve Carta/Catálogo.
2. OFICIO con `carta_digital` y flag activo crea, edita, reordena y publica.
3. OFICIO con `catalogo` y flag activo hace lo mismo.
4. Un flag no activa la otra funcionalidad.
5. NEGOCIO continúa funcionando con ambos flags apagados.
6. Límites GRATIS/ESTÁNDAR/PREMIUM siguen vigentes.
7. Privacidad de WhatsApp y links de pedido siguen respetándose.

### 8.8 Rollback

Poner los flags nuevos en `false`. No borrar carta, productos ni categorías;
los datos vuelven a quedar ocultos para OFICIO y permanecen visibles para
NEGOCIO.

---

## 9. Verificación técnica obligatoria

Usar Node 20 para backend, admin y web.

### Backend

```powershell
cd backend
npx tsc --noEmit
npm test
npm run test:integration
```

Pruebas dirigidas relevantes:

- `backend/test/unit/feature-flag.guard.spec.ts`
- `backend/test/unit/provider-features.service.spec.ts`
- `backend/test/unit/referrals.service.spec.ts`
- `backend/test/unit/menu.service.spec.ts`
- `backend/test/unit/catalog.service.spec.ts`
- `backend/test/integration/referrals.flow.spec.ts`
- Tests IA de registry/function-calling/multi-tool.

### Mobile

```powershell
cd mobile
flutter analyze
flutter test
```

Confirmar especialmente `mobile/test/app_smoke_test.dart`: las rutas deben
seguir la misma constante que el árbol de navegación.

### Web y Admin

```powershell
cd web
npm run build

cd ../admin
npm run type-check
npm test
npm run build
```

### CI y producción

1. CI Backend, Mobile y Admin/Web verde.
2. Verificar `GET /health` de Render.
3. Probar API con cuenta de staging/canary, no con datos críticos.
4. Revisar logs de 404/403/500 y errores FCM/socket.
5. Publicar UI después del backend.
6. Monitorear al menos un flujo completo por tipo de usuario.

---

## 10. Checklist final por feature

### Subastas

- [ ] `FEATURE_SUBASTAS=true`.
- [ ] `kSubastasEnabled=true`.
- [ ] Web `SUBASTAS_ENABLED=true` y navs restaurados.
- [ ] FAQ/copy revisado.
- [ ] Flujo cliente → proveedor → aceptación validado.
- [ ] Nuevo `.aab` publicado.

### Ofertas

- [ ] `FEATURE_OFERTAS=true`.
- [ ] `kOfertasEnabled=true`.
- [ ] Nav admin restaurado.
- [ ] `search_offers` declarada, allowlisted y habilitada si se usa Ofi.
- [ ] CRUD, expiración y moderación validados.
- [ ] Nuevo `.aab` publicado.

### Referidos

- [ ] Copy alineado a `25/5` y `1000/2000`.
- [ ] `FEATURE_REFERIDOS=true`.
- [ ] SQL Ofi aplicado manualmente y una fila retornada.
- [ ] Seeder corregido/restaurado.
- [ ] Tools Ofi declaradas, allowlisted y habilitadas.
- [ ] `kReferidosEnabled=true`.
- [ ] `NEXT_PUBLIC_FEATURE_REFERIDOS=true` y web redeployada.
- [ ] Ruta/nav/banner web restaurados.
- [ ] Idempotencia de aprobación validada.
- [ ] Nuevo `.aab` publicado.

### Agenda

- [ ] Categorías y horarios revisados.
- [ ] Citas futuras revisadas antes de reactivar cron.
- [ ] `FEATURE_AGENDA=true`.
- [ ] Crear, confirmar, cancelar y recordar validados.

### Cotización

- [ ] Categorías revisadas.
- [ ] `FEATURE_COTIZACION=true`.
- [ ] Upload, creación y respuesta validados.
- [ ] Copy web restaurado si corresponde.

### Carta/Catálogo OFICIO

- [ ] Flags reversibles añadidos por PR.
- [ ] Filtro de `visibleProviderFeatures` actualizado por separado.
- [ ] Gates de Menu y Catalog actualizados.
- [ ] Categorías OFICIO auditadas.
- [ ] NEGOCIO probado sin regresiones.
- [ ] Carta y Catálogo probados independientemente.

---

## 11. Principio de rollback

Ocultar no debe destruir datos. Ante un incidente:

1. Retirar UI pública.
2. Apagar env backend.
3. Desactivar conocimiento Ofi si aplica.
4. Conservar historial y tablas.
5. Investigar con logs y tests.
6. Reabrir solo después de corregir la causa.

Nunca usar `DROP`, truncados, borrado masivo ni una reversión completa de los
PRs de ocultamiento para apagar estas funcionalidades.
