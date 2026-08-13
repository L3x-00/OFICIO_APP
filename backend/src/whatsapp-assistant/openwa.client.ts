import { Injectable, Logger } from '@nestjs/common';
import { WhatsappAssistantConfig } from './whatsapp-assistant.config.js';

/** Timeout duro de la llamada saliente a OpenWA. */
const SEND_TIMEOUT_MS = 10_000;

/** Error de envío con código SEGURO y corto (sin cuerpo, sin PII). */
export class OpenWaSendError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'OpenWaSendError';
  }
}

/**
 * ÚNICO cliente autorizado para enviar mensajes a OpenWA. Sólo expone
 * `sendText` contra el endpoint genérico de OpenWA:
 *
 *   POST {baseUrl}/api/sessions/{sessionId}/messages/send-text
 *   header: X-API-Key: <apiKey>
 *   body:   { chatId, text }
 *
 * (Contrato real: D:\OpenWA-Service `message.controller.ts` +
 * `send-message.dto.ts`.) No inventa endpoints alternativos.
 */
@Injectable()
export class OpenWaClient {
  private readonly logger = new Logger(OpenWaClient.name);

  constructor(private readonly config: WhatsappAssistantConfig) {}

  /**
   * Envía un texto. `baseUrl` ya validado (http/https) por el caller vía
   * `assertEnabledConfig()`. Lanza `OpenWaSendError(code)` en fallo — el caller
   * persiste solo `code`, nunca el detalle.
   */
  async sendText(
    baseUrl: string,
    sessionId: string,
    chatId: string,
    text: string,
  ): Promise<void> {
    const url = `${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({ chatId, text }),
        signal: controller.signal,
      });
    } catch (err) {
      const code =
        err instanceof Error && err.name === 'AbortError'
          ? 'SEND_TIMEOUT'
          : 'SEND_NETWORK_ERROR';
      // Log SIN detalle (podría contener host/PII): solo el código seguro.
      this.logger.warn(`OpenWA send falló: ${code}`);
      throw new OpenWaSendError(code);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      // No leemos ni logueamos el cuerpo (puede reflejar el mensaje/chatId).
      const code = `SEND_HTTP_${res.status}`;
      this.logger.warn(`OpenWA send no-2xx: ${code}`);
      throw new OpenWaSendError(code);
    }
  }
}
