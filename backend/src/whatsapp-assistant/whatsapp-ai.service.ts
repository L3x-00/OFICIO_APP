import { Injectable, Logger, Optional } from '@nestjs/common';
import { AiAssistantService } from '../ai-assistant/ai-assistant.service.js';
import { AiQuotaService } from '../ai-assistant/ai-quota.service.js';
import { secondsUntilPeruMidnight } from '../ai-assistant/ai-assistant.helpers.js';
import { WhatsappAssistantConfig } from './whatsapp-assistant.config.js';
import type { LinkedWhatsappIdentity } from './whatsapp-link.service.js';

/** Prefijo del contador por contacto (el contacto ya viene como HMAC). */
const CONTACT_PREFIX = 'wa:ai:daily:';

/**
 * Puente F2: reutiliza "Ofi" en modo PÚBLICO SOLO LECTURA para los mensajes de
 * WhatsApp que la política determinista F1 ya reconoció como consultas Servi.
 *
 * Reparto de responsabilidades:
 *   • Ofi (`chatPublicReadOnly`) pone la persona PUBLIC (solo catálogo
 *     público), el sanitizer, los guardrails, el circuit breaker y el
 *     presupuesto GLOBAL diario. No persiste conversación, memoria ni caché.
 *   • Este puente pone lo propio del CANAL: el flag de WhatsApp, el tope por
 *     contacto, el deadline del canal y el formato de salida para WhatsApp.
 *
 * Garantías (verificadas en tests):
 *   • Opt-in propio: `WHATSAPP_ASSISTANT_AI_ENABLED` (default FALSE). Apagado
 *     ⇒ nunca se llama a Ofi y F1 responde igual que antes.
 *   • Cero PII hacia la IA: sólo viaja el TEXTO del mensaje. Nunca el teléfono,
 *     el JID, el chatId ni el messageId (ni siquiera sus HMAC).
 *   • Tope por contacto FAIL-CLOSED: sin contador atómico (Redis caído) no se
 *     gasta IA; se responde con el texto determinista de F1.
 *   • Cualquier fallo, bloqueo o timeout ⇒ `null` ⇒ el llamador usa el texto
 *     determinista. La IA nunca puede empeorar la respuesta de F1.
 */
@Injectable()
export class WhatsappAiService {
  private readonly logger = new Logger(WhatsappAiService.name);

  constructor(
    private readonly config: WhatsappAssistantConfig,
    // Opcionales: los tests construyen el servicio a mano y un despliegue que
    // retire el módulo de IA debe seguir compilando y sirviendo F1.
    @Optional() private readonly ai?: AiAssistantService,
    @Optional() private readonly quota?: AiQuotaService,
  ) {}

  /**
   * Intenta responder con Ofi. Devuelve el texto ya adaptado a WhatsApp, o
   * `null` cuando NO se debe usar IA (flag apagado, texto fuera de rango, tope
   * del contacto alcanzado, IA bloqueada/caída o respuesta vacía).
   */
  async tryAnswer(text: string, contactHash: string): Promise<string | null> {
    return this.tryAnswerWith(text, contactHash, (message) =>
      this.ai?.chatPublicReadOnly(message, {
        timeoutMs: this.config.aiTimeoutMs,
      }),
    );
  }

  /**
   * F3: mismo puente y cuota del canal, con contexto de rol/tipo ya resuelto
   * desde BD. No se pasa userId, contacto ni ninguna capacidad de cuenta a Ofi.
   */
  async tryAnswerLinked(
    text: string,
    contactHash: string,
    identity: LinkedWhatsappIdentity,
  ): Promise<string | null> {
    return this.tryAnswerWith(text, contactHash, (message) =>
      this.ai?.chatLinkedReadOnly(message, identity, {
        timeoutMs: this.config.aiTimeoutMs,
      }),
    );
  }

  private async tryAnswerWith(
    text: string,
    contactHash: string,
    ask: (message: string) => Promise<{ reply: string } | null> | undefined,
  ): Promise<string | null> {
    if (!this.config.aiEnabled || !this.ai) return null;

    const message = text.trim();
    if (!message) return null;
    // Mensajes largos no se mandan a la IA (coste + superficie de inyección).
    if (message.length > this.config.aiMaxInputChars) return null;

    if (!(await this.consumeContactBudget(contactHash))) return null;

    let result: { reply: string } | null;
    try {
      result = (await ask(message)) ?? null;
    } catch {
      // `chatPublicReadOnly` no debería lanzar; si lo hace, cae a F1.
      // Nunca se loguea el texto ni el contacto.
      this.logger.warn('Ofi falló en la ruta pública de WhatsApp');
      return null;
    }
    if (!result) return null;

    const formatted = toWhatsappText(result.reply, this.config.aiMaxReplyChars);
    return formatted.length > 0 ? formatted : null;
  }

  /**
   * Tope diario POR CONTACTO (ventana hasta la medianoche de Perú), atómico vía
   * `AiQuotaService`. El presupuesto global lo aplica la propia ruta pública de
   * Ofi. FAIL-CLOSED a propósito: si no hay contador real, no se gasta IA — el
   * tráfico de WhatsApp es entrante y no autenticado.
   */
  private async consumeContactBudget(contactHash: string): Promise<boolean> {
    if (!this.quota?.available) return false;
    const { allowed } = await this.quota.incrementWithLimit(
      `${CONTACT_PREFIX}${contactHash}`,
      this.config.aiDailyPerContact,
      secondsUntilPeruMidnight() * 1000,
    );
    return allowed;
  }
}

/**
 * Adapta la respuesta a WhatsApp: sin Markdown de chat web, sin bloques de
 * código, párrafos compactos y longitud acotada (un mensaje, no un muro).
 */
export function toWhatsappText(raw: string, maxChars: number): string {
  const cleaned = raw
    .replace(/```[a-z]*\n?/gi, '') // vallas de código
    .replace(/\*\*(.+?)\*\*/gs, '*$1*') // **negrita** → *negrita* (WhatsApp)
    .replace(/^#{1,6}\s+/gm, '') // encabezados Markdown
    .replace(/[`>]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

  if (cleaned.length <= maxChars) return cleaned;
  // Corte en el último espacio para no partir una palabra.
  const cut = cleaned.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
