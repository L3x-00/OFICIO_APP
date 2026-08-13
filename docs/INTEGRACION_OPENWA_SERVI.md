# Integración WhatsApp ↔ OpenWA — F1–F3

**Estado:** F1 determinista, F2 de Ofi público y F3 de vínculo seguro
implementados en
`backend/src/whatsapp-assistant`, ambos **APAGADOS por defecto**. El master
switch `WHATSAPP_ASSISTANT_ENABLED=false` deja el webhook en `204`, sin BD,
envíos ni secretos. Aun con F1 encendido, F2 requiere su propio opt-in
`WHATSAPP_ASSISTANT_AI_ENABLED=true`.
F3 requiere además SQL manual y `WHATSAPP_ASSISTANT_LINK_ENABLED=true`.

**Reparto de responsabilidades:** OpenWA (`D:\OpenWA-Service`) permanece
**genérico** (sesiones, envío, webhooks). Servi contiene la **identidad, las
reglas, la auditoría mínima y el conocimiento** (FAQ pública y Ofi). Servi nunca
mete lógica de negocio en OpenWA.

---

## 1. Alcance de F1, F2 y F3

- Entrada: webhook `message.received` de OpenWA hacia Servi.
- Salida: a lo sumo **una** respuesta por mensaje, vía `POST send-text` de OpenWA.
- F1 aplica primero una política **100% determinista**, sin consultar
  usuario/proveedor/cuenta:
  - **FAQ pública de Servi** (servicios, uso de la app, registro, planes,
    proveedores, ayuda).
  - Fuera de Servi → **rechazo corto**.
  - `STOP` / `DETENER` / `NO QUIERO` → **opt-out** persistido; no se envía nada más.
  - `HUMANO` / `ASESOR` / `PERSONA` → **pausa del bot** + una sola confirmación
    factual. Mensajes posteriores durante la pausa no reciben respuesta. La
    asignación/notificación a un agente humano queda para F4.
  - Número no vinculado a una cuenta → **solo FAQ pública** (cero OTP, cuenta o
    perfil). Sin acciones de admin, pagos, perfil, referidos ni escritura.
- F2 es un enriquecimiento opcional de las consultas que F1 **ya clasificó como
  Servi**. Reutiliza Ofi con persona `PUBLIC`, sin JWT ni vínculo de cuenta:
  - Solo `search_providers`, `search_categories` y `explain_feature`; catálogo
    público de proveedores verificados.
  - Sin historial, conversaciones, memoria, caché semántica, aprendizaje ni
    herramientas de usuario, proveedor, admin, pagos o referidos.
  - No llegan a Ofi teléfono, JID, `chatId`, `messageId` ni sus HMAC; solo el
    texto entrante. La salida es texto corto con guardrails, sin tarjetas ni
    datos de contacto.
  - Un tema fuera de Servi **nunca llega a IA**. Si Ofi está apagada, lenta,
    bloqueada o sin presupuesto, se conserva la FAQ determinista de F1.
- F3 permite vínculo posterior, nunca implícito: el usuario autenticado pide un
  código de 10 símbolos desde Servi y escribe exactamente `VINCULAR CÓDIGO` en
  el WhatsApp oficial. El código dura 10 min por defecto, se guarda solo como
  HMAC y se consume una sola vez. `STOP` y `HUMANO` siempre ganan al comando.
  - Se conserva un vínculo actual por `sessionId + userId` y un dueño por
    `sessionId + contactHash`; otro usuario jamás puede tomar un contacto.
  - El rol, actividad y tipo se resuelven de `users/providers` en **cada**
    inbound. ADMIN se degrada a USUARIO. El vínculo no guarda rol ni permisos.
  - Para Ofi, un chat vinculado sigue siendo lectura de catálogo público:
    no historial, memoria, cuenta, pagos, perfil, referidos, admin ni escritura.

### F4 — handover humano, métricas y DLQ segura

- `HUMANO` mantiene la pausa determinista de F1 y, con
  `WHATSAPP_ASSISTANT_OPERATIONS_ENABLED=true`, abre un único handover opaco
  por contacto. El panel ADMIN muestra solo identificador interno, estado y
  hora; no expone `sessionId`, HMAC, teléfono, JID, texto ni cuenta vinculada.
- La DLQ lista únicamente fallos `FAILED` no reconocidos y su `errorCode`
  seguro. Reconocer un fallo deja auditoría del admin y **no** reintenta ni
  permite reenviar: Servi no persiste contenido o destino, para mantener
  at-most-once y privacidad.
- F4 usa su propio flag. Apagado, F1-F3 no insertan ni consultan sus tablas y
  el endpoint admin responde que la operación no está disponible.

## 2. Contrato real de OpenWA usado

Verificado contra `D:\OpenWA-Service`:

- **Webhook entrante** (`webhook.service.ts`): cuerpo JSON
  `{ event, timestamp, sessionId, idempotencyKey, deliveryId, data }`.
  Para `message.received`, `data` es un `IncomingMessage`
  (`whatsapp-engine.interface.ts`): `{ id, from, chatId, body, type, timestamp,
fromMe, isGroup, author?, ... }`.
- **Firma** (`webhook.service.ts#generateSignature`): header
  `X-OpenWA-Signature: sha256=<hex>`, `hex = HMAC_SHA256(secret, rawBody)`.
  Servi lo lee como `x-openwa-signature` (case-insensitive) y verifica sobre el
  **cuerpo crudo** con comparación de tiempo constante.
- **Envío** (`message.controller.ts` + `send-message.dto.ts`):
  `POST {baseUrl}/api/sessions/{sessionId}/messages/send-text`, header
  `X-API-Key`, cuerpo `{ chatId, text }`. Respuesta `{ messageId, timestamp }`.

Servi **no inventa endpoints alternativos**. Si el contrato cambia, se adapta el
parser (`whatsapp-assistant.types.ts` + `parseAndValidate`) a la fuente real.

## 3. Variables de entorno (backend)

Ninguna lleva valores reales en `.env.example`. Requeridas **solo al activar**:

| Variable                                 | Descripción                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `WHATSAPP_ASSISTANT_ENABLED`             | Master switch. `false` por defecto.                                               |
| `OPENWA_BASE_URL`                        | Base URL de OpenWA. `http(s)`; `http` solo fuera de producción.                   |
| `OPENWA_API_KEY`                         | API key de mínimo privilegio (header `X-API-Key`), limitada a la sesión de Servi. |
| `OPENWA_WEBHOOK_SECRET`                  | Secreto HMAC (32 bytes) con el que OpenWA firma el webhook.                       |
| `OPENWA_SERVI_SESSION_ID`                | UUID de la sesión de Servi en OpenWA.                                             |
| `WHATSAPP_ASSISTANT_CONTACT_HASH_SECRET` | Secreto LOCAL para HMAC de contacto e id de mensaje; ninguno se guarda en claro.  |

Opcionales de F2. F1 no cambia si faltan o si `WHATSAPP_ASSISTANT_AI_ENABLED`
permanece en `false`:

| Variable                                  | Descripción                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `WHATSAPP_ASSISTANT_AI_ENABLED`           | Opt-in de Ofi público. `false` por defecto. Requiere además `AI_ENABLED=true` de Ofi. |
| `WHATSAPP_ASSISTANT_AI_DAILY_PER_CONTACT` | Máximo diario por contacto HMAC. Default `10`; Redis caído = F2 no llama a IA.        |
| `WHATSAPP_ASSISTANT_AI_TIMEOUT_MS`        | Deadline por mensaje. Default `12000`; al vencer responde fallback F1.                |
| `WHATSAPP_ASSISTANT_AI_MAX_INPUT_CHARS`   | Tope de texto a Ofi. Default `600`.                                                   |
| `WHATSAPP_ASSISTANT_AI_MAX_REPLY_CHARS`   | Tope de respuesta WhatsApp. Default `900`.                                            |

Opcionales de F3. El link no funciona sin las tres condiciones: SQL manual,
switch y secreto. El fallo siempre es genérico para no revelar cuentas/códigos:

| Variable                              | Descripción                                                            |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `WHATSAPP_ASSISTANT_LINK_ENABLED`     | Opt-in de generación/consumo de vínculo. `false` por defecto.          |
| `WHATSAPP_ASSISTANT_LINK_SECRET`      | Secreto distinto de HMAC webhook/contacto; mínimo 32 bytes aleatorios. |
| `WHATSAPP_ASSISTANT_LINK_TTL_MINUTES` | Expiración de desafío. Default `10`, máximo efectivo `30`.             |

Opcional de F4. Requiere SQL manual antes de encenderlo; no modifica el envío
ni habilita replay de mensajes:

| Variable                                | Descripción                                             |
| --------------------------------------- | ------------------------------------------------------- |
| `WHATSAPP_ASSISTANT_OPERATIONS_ENABLED` | Opt-in del ledger de handover/DLQ. `false` por defecto. |

Rutas privadas F3 (todas con JWT y `userId` solo del token):
`POST /whatsapp-assistant/link-code`, `GET /whatsapp-assistant/link`,
`DELETE /whatsapp-assistant/link`. Nunca devuelven teléfono, JID o hash.

## 4. Persistencia mínima (privacidad)

Se guardan **solo claves mínimas**: nunca texto ni teléfono.

- `whatsapp_inbound_message` — `unique(sessionId, messageIdHash)`, `status`
  (`RECEIVED → SEND_STARTED → SENT | FAILED | SUPPRESSED`), timestamps y
  `errorCode` (código seguro, sin detalle). `messageIdHash` es un HMAC con
  separación de dominio: algunos IDs contienen el JID/teléfono. Da la semántica
  **at-most-once** sin persistir ese dato en claro.
- `whatsapp_contact_preference` — `unique(sessionId, contactHash)` con
  `optedOutAt` / `humanHandoverAt`. El contacto se identifica **solo por HMAC**.
- F3 añade `whatsapp_link_challenge` y `whatsapp_linked_contact`; ningún código,
  rol ni teléfono se conserva en claro.
- F4 añade `whatsapp_handover` (contacto HMAC, estado y tiempos) y dos marcas
  de reconocimiento DLQ sobre `whatsapp_inbound_message`. El panel ADMIN no
  selecciona ni recibe `contactHash`, `sessionId` o `messageIdHash`.

SQL idempotente equivalente: `backend/prisma/sql/whatsapp_assistant.sql`. El
schema Prisma es la fuente; el SQL es el espejo que **el propietario aplica a
mano** en Supabase (protocolo `/sql-prod`) **antes de encender el flag**. Ningún
agente ejecuta SQL/Prisma contra prod.

## 5. Semántica at-most-once

1. Se crea la clave única `(sessionId, HMAC(messageId))` **antes** de decidir.
2. Un segundo delivery (o entrega concurrente) choca en el índice único → se
   responde `204` y **no** se produce otra salida.
3. Antes de llamar a `send-text` se marca `SEND_STARTED`.
4. Si la llamada sale pero el estado final falla, **no** se reintenta
   automáticamente. F4 solo permite reconocer el fallo en una DLQ sin replay;
   los fallos de envío guardan solo un `errorCode` seguro.

## 6. F0 — configuración de OpenWA (operación manual)

F0 se hace **una vez, a mano** en OpenWA (Servi no configura OpenWA remoto):

1. **Sesión Servi:** crear/emparejar la sesión de WhatsApp de Servi en OpenWA y
   anotar su `sessionId` (UUID) → `OPENWA_SERVI_SESSION_ID`.
2. **API key de mínimo privilegio:** crear una API key **limitada a ese UUID de
   sesión** → `OPENWA_API_KEY`. Sin permisos sobre otras sesiones.
3. **Secreto HMAC:** generar 32 bytes aleatorios
   (`openssl rand -hex 32`) → `OPENWA_WEBHOOK_SECRET`.
4. **Webhook:** registrar en OpenWA un webhook contra la URL pública de Servi en
   Render (`https://<servi-backend>/whatsapp-assistant/webhook`) con:
   - `events = ["message.received"]`
   - `secret = OPENWA_WEBHOOK_SECRET`
   - filtro `fromMe = false` + solo mensajes con texto (defensa en profundidad;
     Servi vuelve a validar todo).
5. **Secreto de contacto:** generar otro secreto local
   (`WHATSAPP_ASSISTANT_CONTACT_HASH_SECRET`).

## 7. Activación (orden estricto)

1. Aplicar `backend/prisma/sql/whatsapp_assistant.sql` en Supabase (manual).
2. Completar en Render las 6 variables de la §3.
3. Poner `WHATSAPP_ASSISTANT_ENABLED=true` y reiniciar el backend.
4. Solo tras validar F1: para F2, asegurar `AI_ENABLED=true`, completar los
   límites opcionales y poner `WHATSAPP_ASSISTANT_AI_ENABLED=true`. Si F2 falla,
   apagar solo este segundo switch conserva F1.
5. Solo tras validar F1/F2: aplicar manualmente
   `backend/prisma/sql/whatsapp_assistant_links.sql`, completar
   `WHATSAPP_ASSISTANT_LINK_SECRET` y habilitar
   `WHATSAPP_ASSISTANT_LINK_ENABLED=true`. No activar F3 si ese SQL no está
   aplicado; no usar `migrate deploy` ni `db push` contra producción.
6. Solo tras validar F1-F3: aplicar manualmente
   `backend/prisma/sql/whatsapp_assistant_operations.sql` y habilitar
   `WHATSAPP_ASSISTANT_OPERATIONS_ENABLED=true`. El panel ADMIN sirve para
   tomar handovers y reconocer DLQ; no activa reintentos de entrega.

## 8. Pruebas

- Unitarias en `backend/src/whatsapp-assistant/*.spec.ts`: firma válida/inválida,
  sesión/evento/`fromMe`/grupo inválidos, flag apagado, duplicado/concurrencia,
  STOP, HUMANO, pausa, fuera de alcance, y que **no** se llama a OpenWA en los
  casos suprimidos.
- F2 agrega: no IA con flag apagado, cuota HMAC fail-closed, texto sin PII de
  transporte, límites de entrada/salida, fallback F1 y rechazo fuera de Servi
  sin llamada a Ofi.
- F3 agrega: código efímero HMAC, vencimiento/uso único, no takeover,
  STOP/HUMANO antes de vínculo, rol ADMIN degradado y contexto vinculado sin
  tools de cuenta.
- F4 agrega: `HUMANO` crea un único handover opaco, endpoints solo ADMIN,
  listas sin PII, reconocimiento atómico y DLQ que no llama a OpenWA.
- Smoke manual (staging): con el flag encendido, enviar a la sesión de Servi
  desde otro número:
  - un texto de FAQ → recibe respuesta pública.
  - `STOP` → deja de recibir; reenviar cualquier texto → sin respuesta.
  - `HUMANO` → una confirmación; textos siguientes → sin respuesta.
  - firmar mal a mano → `401`.

## 9. Rollback

Poner `WHATSAPP_ASSISTANT_ENABLED=false` y reiniciar: el webhook vuelve a `204`
inerte al instante, sin borrar datos. El módulo puede además retirarse de
`AppModule` sin afectar al resto de Servi. Las tablas quedan inertes (se pueden
conservar); no es necesario tocar Supabase para desactivar.

Para revertir solo F2, poner `WHATSAPP_ASSISTANT_AI_ENABLED=false`: F1 sigue
activa, determinista y sin llamadas a Ofi.

Para revertir solo F3, poner `WHATSAPP_ASSISTANT_LINK_ENABLED=false`: F1/F2
siguen; los vínculos y desafíos quedan inertes sin borrar historial ni datos.

Para revertir solo F4, poner `WHATSAPP_ASSISTANT_OPERATIONS_ENABLED=false`:
F1-F3 siguen y el ledger queda inerte. No borra tickets ni habilita reintentos.
