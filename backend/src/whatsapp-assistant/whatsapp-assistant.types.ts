/**
 * Forma REAL (parcial y tolerante) del payload que OpenWA entrega a un webhook
 * suscrito, según D:\OpenWA-Service:
 *   - `webhook.service.ts` (`WebhookPayload`): { event, timestamp, sessionId,
 *      idempotencyKey, deliveryId, data }.
 *   - `whatsapp-engine.interface.ts` (`IncomingMessage`) es el `data` de
 *      `message.received`: { id, from, chatId, body, type, timestamp, fromMe,
 *      isGroup, author?, ... }.
 *
 * Sólo declaramos los campos que F1 necesita; el resto se ignora.
 */
export interface OpenWaIncomingMessageData {
  id?: unknown;
  from?: unknown;
  chatId?: unknown;
  body?: unknown;
  fromMe?: unknown;
  isGroup?: unknown;
}

export interface OpenWaWebhookPayload {
  event?: unknown;
  sessionId?: unknown;
  data?: OpenWaIncomingMessageData;
}

/** Resultado interno del manejo del webhook (el controller lo mapea a HTTP). */
export type WebhookOutcome =
  | { status: 204 } // fuera de alcance / suprimido / duplicado / flag off.
  | { status: 200 }; // procesado con salida (o intento de salida registrado).
