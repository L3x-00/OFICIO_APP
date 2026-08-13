import {
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WhatsappAssistantConfig } from './whatsapp-assistant.config.js';
import { WhatsappPolicyService } from './whatsapp-policy.service.js';
import { WhatsappAiService } from './whatsapp-ai.service.js';
import {
  LINK_FAILURE_REPLY,
  LINK_SUCCESS_REPLY,
  WhatsappLinkService,
} from './whatsapp-link.service.js';
import { WhatsappOperationsService } from './whatsapp-operations.service.js';
import { OpenWaClient, OpenWaSendError } from './openwa.client.js';
import {
  hashContact,
  hashInboundMessageId,
  verifyOpenWaSignature,
} from './whatsapp-signature.js';
import type {
  OpenWaWebhookPayload,
  WebhookOutcome,
} from './whatsapp-assistant.types.js';

const OK: WebhookOutcome = { status: 200 };
const NO_EFFECT: WebhookOutcome = { status: 204 };

/** Máximo de texto que aceptamos analizar (defensa; el resto se ignora). */
const MAX_TEXT_LENGTH = 4096;

interface ValidInbound {
  sessionId: string;
  messageId: string;
  chatId: string;
  sender: string;
  text: string;
}

/**
 * Orquestador F1 de la integración WhatsApp ↔ OpenWA.
 *
 * Orden de defensas (regla del prompt de fase):
 *   0. Flag apagado ⇒ 204 inerte, SIN requerir secretos ni tocar BD.
 *   1. Config válida (secretos/URL) — obligatoria sólo con el flag encendido.
 *   2. Firma HMAC sobre el cuerpo CRUDO — ausente/ inválida ⇒ 401.
 *   3. Validación estricta del evento — fuera de alcance ⇒ 204 sin efectos.
 *   4. Idempotencia at-most-once (unique sessionId+HMAC(messageId)).
 *   5. Preferencia de contacto (opt-out / pausa) antes de responder.
 *   6. Política determinista (FAQ / opt-out / derivación / rechazo).
 *
 * NUNCA loguea teléfono, texto, secreto, HMAC ni payload completo.
 */
@Injectable()
export class WhatsappAssistantService {
  private readonly logger = new Logger(WhatsappAssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: WhatsappAssistantConfig,
    private readonly policy: WhatsappPolicyService,
    private readonly openwa: OpenWaClient,
    // F2: fallback a "Ofi" solo lectura. Opcional — sin él (o con su flag
    // apagado) el comportamiento es exactamente el determinista de F1.
    @Optional() private readonly ai?: WhatsappAiService,
    @Optional() private readonly links?: WhatsappLinkService,
    @Optional() private readonly operations?: WhatsappOperationsService,
  ) {}

  async handleWebhook(
    rawBody: Buffer | undefined,
    signatureHeader: string | undefined,
  ): Promise<WebhookOutcome> {
    // 0. Flag apagado ⇒ endpoint inerte. Sin auth, sin BD, sin secretos.
    if (!this.config.enabled) {
      return NO_EFFECT;
    }

    // 1. Config obligatoria al estar habilitado. Base URL validada (http/https).
    const baseUrl = this.config.assertEnabledConfig();

    // 2. Autenticación por HMAC sobre el cuerpo crudo (comparación const-time).
    if (
      !verifyOpenWaSignature(
        rawBody,
        signatureHeader,
        this.config.webhookSecret,
      )
    ) {
      throw new UnauthorizedException('firma inválida');
    }

    // 3. Parseo del cuerpo YA firmado + validación estricta.
    const inbound = this.parseAndValidate(rawBody as Buffer);
    if (!inbound) {
      return NO_EFFECT; // fuera de alcance: 204 sin efectos.
    }

    const contactHash = hashContact(
      inbound.sender,
      this.config.contactHashSecret,
    );
    const messageIdHash = hashInboundMessageId(
      inbound.messageId,
      this.config.contactHashSecret,
    );
    const decision = this.policy.decide(inbound.text);

    // STOP y HUMANO cambian una preferencia del contacto. Se reclaman junto con
    // la clave idempotente en una transacción: si la preferencia no se puede
    // guardar, tampoco queda una clave que bloquee el retry del webhook.
    if (decision.kind === 'opt_out') {
      return this.recordOptOut(inbound.sessionId, messageIdHash, contactHash);
    }
    if (decision.kind === 'handover') {
      const handover = await this.recordHandover(
        inbound.sessionId,
        messageIdHash,
        contactHash,
      );
      if (!handover) return NO_EFFECT;
      if (!handover.shouldSend) return NO_EFFECT;
      return this.sendAndRecord(
        inbound.sessionId,
        handover.inboundId,
        baseUrl,
        inbound.chatId,
        decision.reply,
      );
    }

    // 4. Idempotencia: crear la clave ANTES de decidir. Un duplicado (mismo
    //    sessionId+HMAC(messageId)) choca en el índice único ⇒ nunca reenvía.
    let inboundId: number;
    try {
      const row = await this.prisma.whatsappInboundMessage.create({
        data: {
          sessionId: inbound.sessionId,
          messageIdHash,
          status: 'RECEIVED',
        },
        select: { id: true },
      });
      inboundId = row.id;
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        // Delivery duplicado (o concurrente): ya está siendo/ fue procesado.
        // At-most-once ⇒ NO producir otra salida.
        return NO_EFFECT;
      }
      throw err;
    }

    // 5. Preferencia de contacto: opt-out o pausa por derivación humana.
    const pref = await this.prisma.whatsappContactPreference.findUnique({
      where: {
        sessionId_contactHash: {
          sessionId: inbound.sessionId,
          contactHash,
        },
      },
      select: { optedOutAt: true, humanHandoverAt: true },
    });

    if (pref?.optedOutAt) {
      await this.markSuppressed(inboundId);
      return NO_EFFECT; // dado de baja: jamás se le envía.
    }
    if (pref?.humanHandoverAt) {
      await this.markSuppressed(inboundId);
      return NO_EFFECT; // bot en pausa: mensajes posteriores no responden.
    }

    // 6. Vínculo F3 después de HMAC, dedup y preferencias. El código exacto
    // nunca se persiste/loguea; todo resultado inválido recibe igual respuesta.
    if (decision.kind === 'link') {
      const linked =
        (await this.links?.consumeCode(contactHash, decision.code)) ?? false;
      return this.sendAndRecord(
        inbound.sessionId,
        inboundId,
        baseUrl,
        inbound.chatId,
        linked ? LINK_SUCCESS_REPLY : LINK_FAILURE_REPLY,
      );
    }

    // 7. Solo una consulta que la política YA reconoció como Servi puede llegar
    //    a Ofi. Un `reject` queda siempre determinista: la IA jamás decide el
    //    alcance ni recibe mensajes ajenos a la plataforma.
    //    Si Ofi está apagada, sin presupuesto, bloqueada o lenta, se conserva
    //    la respuesta FAQ fija de F1.
    let reply = decision.reply;
    if (decision.kind === 'faq' && this.ai) {
      const identity = await this.links?.resolveIdentity(contactHash);
      const aiReply = identity
        ? await this.ai.tryAnswerLinked(inbound.text, contactHash, identity)
        : await this.ai.tryAnswer(inbound.text, contactHash);
      if (aiReply) reply = aiReply;
    }

    return this.sendAndRecord(
      inbound.sessionId,
      inboundId,
      baseUrl,
      inbound.chatId,
      reply,
    );
  }

  /**
   * Parseo del cuerpo firmado + validación estricta. Devuelve null (⇒ 204) si
   * el evento cae fuera de alcance. No lanza por payload malformado.
   */
  private parseAndValidate(rawBody: Buffer): ValidInbound | null {
    let payload: OpenWaWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as OpenWaWebhookPayload;
    } catch {
      return null;
    }
    if (!payload || typeof payload !== 'object') return null;

    // Evento exacto.
    if (payload.event !== 'message.received') return null;

    // Sesión: debe ser EXACTAMENTE la de Servi.
    if (typeof payload.sessionId !== 'string') return null;
    if (payload.sessionId !== this.config.sessionId) return null;

    const data = payload.data;
    if (!data || typeof data !== 'object') return null;

    // Nunca responder a mensajes propios.
    if (data.fromMe !== false) return null;

    // messageId real (no vacío).
    const messageId = typeof data.id === 'string' ? data.id.trim() : '';
    if (!messageId) return null;

    // Texto no vacío.
    const body = typeof data.body === 'string' ? data.body : '';
    const text = body.trim();
    if (!text) return null;

    // chatId + sender válidos e INDIVIDUALES (rechazar grupos).
    const chatId = typeof data.chatId === 'string' ? data.chatId.trim() : '';
    const sender = typeof data.from === 'string' ? data.from.trim() : '';
    if (!chatId || !sender) return null;
    if (data.isGroup === true) return null;
    // Sólo chats individuales de WhatsApp (`@c.us`). Grupos (`@g.us`) y otros
    // canales (broadcast/newsletter/lid) quedan fuera de alcance.
    if (!chatId.endsWith('@c.us')) return null;

    return {
      sessionId: payload.sessionId,
      messageId,
      chatId,
      sender,
      text: text.slice(0, MAX_TEXT_LENGTH),
    };
  }

  /**
   * Semántica at-most-once: marca SEND_STARTED ANTES de llamar a OpenWA. Si la
   * llamada sale pero el estado final falla, NO se reintenta (F4 manejará DLQ).
   */
  private async sendAndRecord(
    sessionId: string,
    inboundId: number,
    baseUrl: string,
    chatId: string,
    reply: string,
  ): Promise<WebhookOutcome> {
    await this.prisma.whatsappInboundMessage.update({
      where: { id: inboundId },
      data: { status: 'SEND_STARTED' },
    });

    try {
      await this.openwa.sendText(baseUrl, sessionId, chatId, reply);
    } catch (err) {
      const code =
        err instanceof OpenWaSendError ? err.code : 'SEND_UNKNOWN_ERROR';
      // Guardar SOLO el código seguro. Sin reintento automático.
      await this.safeUpdate(inboundId, { status: 'FAILED', errorCode: code });
      // Devolvemos 200: reintentar el webhook re-dispararía el mismo envío, y la
      // clave única ya bloquea un segundo intento. F4/DLQ maneja el reintento.
      return OK;
    }

    // Envío OK. Si este update falla, NO reintentamos el envío (at-most-once).
    await this.safeUpdate(inboundId, {
      status: 'SENT',
      processedAt: new Date(),
    });
    return OK;
  }

  private async markSuppressed(inboundId: number): Promise<void> {
    await this.safeUpdate(inboundId, {
      status: 'SUPPRESSED',
      processedAt: new Date(),
    });
  }

  private async recordOptOut(
    sessionId: string,
    messageIdHash: string,
    contactHash: string,
  ): Promise<WebhookOutcome> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const row = await tx.whatsappInboundMessage.create({
          data: { sessionId, messageIdHash, status: 'RECEIVED' },
          select: { id: true },
        });
        await this.upsertPreferenceWith(tx, sessionId, contactHash, {
          optOut: true,
        });
        await tx.whatsappInboundMessage.update({
          where: { id: row.id },
          data: { status: 'SUPPRESSED', processedAt: new Date() },
        });
      });
      return NO_EFFECT;
    } catch (err) {
      if (this.isUniqueViolation(err)) return NO_EFFECT;
      throw err;
    }
  }

  private async recordHandover(
    sessionId: string,
    messageIdHash: string,
    contactHash: string,
  ): Promise<{ inboundId: number; shouldSend: boolean } | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.whatsappInboundMessage.create({
          data: { sessionId, messageIdHash, status: 'RECEIVED' },
          select: { id: true },
        });
        const pref = await tx.whatsappContactPreference.findUnique({
          where: { sessionId_contactHash: { sessionId, contactHash } },
          select: { optedOutAt: true, humanHandoverAt: true },
        });
        if (pref?.optedOutAt || pref?.humanHandoverAt) {
          await tx.whatsappInboundMessage.update({
            where: { id: row.id },
            data: { status: 'SUPPRESSED', processedAt: new Date() },
          });
          return { inboundId: row.id, shouldSend: false };
        }
        await this.upsertPreferenceWith(tx, sessionId, contactHash, {
          handover: true,
        });
        await this.operations?.recordHandover(tx, sessionId, contactHash);
        return { inboundId: row.id, shouldSend: true };
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) return null;
      throw err;
    }
  }

  private async upsertPreferenceWith(
    prisma: Pick<PrismaService, 'whatsappContactPreference'>,
    sessionId: string,
    contactHash: string,
    opts: { optOut?: boolean; handover?: boolean },
  ): Promise<void> {
    const now = new Date();
    const patch: Record<string, Date> = {};
    if (opts.optOut) patch.optedOutAt = now;
    if (opts.handover) patch.humanHandoverAt = now;
    await prisma.whatsappContactPreference.upsert({
      where: { sessionId_contactHash: { sessionId, contactHash } },
      create: { sessionId, contactHash, ...patch },
      update: patch,
    });
  }

  /**
   * Update de estado que NUNCA lanza: un fallo al persistir el estado final no
   * debe provocar reintento del webhook (que reenviaría el mensaje).
   */
  private async safeUpdate(
    inboundId: number,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.whatsappInboundMessage.update({
        where: { id: inboundId },
        data,
      });
    } catch {
      this.logger.warn('No se pudo persistir el estado final del inbound');
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: unknown }).code === 'P2002'
    );
  }
}
