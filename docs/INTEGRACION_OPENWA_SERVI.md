# Integración WhatsApp ↔ OpenWA — F1 (asistente determinista)

**Estado:** F1 implementado en `backend/src/whatsapp-assistant`, **APAGADO por
defecto** (`WHATSAPP_ASSISTANT_ENABLED=false`). Con el flag apagado el webhook
responde `204` y no produce ningún efecto (no toca BD, no envía nada, no exige
secretos).

**Reparto de responsabilidades:** OpenWA (`D:\OpenWA-Service`) permanece
**genérico** (sesiones, envío, webhooks). Servi contiene la **identidad, las
reglas F1, la auditoría mínima y el conocimiento** (FAQ pública). Servi nunca
mete lógica de negocio en OpenWA.

---

## 1. Alcance de F1

- Entrada: webhook `message.received` de OpenWA hacia Servi.
- Salida: a lo sumo **una** respuesta por mensaje, vía `POST send-text` de OpenWA.
- Política **100% determinista, sin IA**, sin `AiAssistantService`, sin consultar
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

## 4. Persistencia mínima (privacidad)

Se guardan **solo claves mínimas**: nunca texto ni teléfono.

- `whatsapp_inbound_message` — `unique(sessionId, messageIdHash)`, `status`
  (`RECEIVED → SEND_STARTED → SENT | FAILED | SUPPRESSED`), timestamps y
  `errorCode` (código seguro, sin detalle). `messageIdHash` es un HMAC con
  separación de dominio: algunos IDs contienen el JID/teléfono. Da la semántica
  **at-most-once** sin persistir ese dato en claro.
- `whatsapp_contact_preference` — `unique(sessionId, contactHash)` con
  `optedOutAt` / `humanHandoverAt`. El contacto se identifica **solo por HMAC**.

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
   automáticamente (F4 manejará la DLQ). Los fallos de envío guardan solo un
   `errorCode` seguro.

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

## 8. Pruebas

- Unitarias en `backend/src/whatsapp-assistant/*.spec.ts`: firma válida/inválida,
  sesión/evento/`fromMe`/grupo inválidos, flag apagado, duplicado/concurrencia,
  STOP, HUMANO, pausa, fuera de alcance, y que **no** se llama a OpenWA en los
  casos suprimidos.
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
