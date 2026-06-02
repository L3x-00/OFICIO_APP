import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AiHistoryTurn } from './ai-assistant.types.js';
import {
  HISTORY_MAX_CHARS,
  HISTORY_MAX_MESSAGES,
} from './ai-assistant.constants.js';

/** Datos para persistir un mensaje (entrada de `saveMessage`). */
export interface SaveMessageInput {
  conversationId: number | null;
  role: 'user' | 'model';
  content: string;
  ip?: string;
  userAgent?: string;
  responseTimeMs?: number | null;
  tokensUsed?: number | null;
  flagged?: boolean;
  moderationPass?: boolean;
}

/**
 * Persistencia e historial de conversaciones de "Ofi" (Fase 4).
 *
 * 100% resiliente: cualquier fallo de BD se loguea y degrada en suave
 * (devuelve null / [] / no-op) — la IA nunca rompe el flujo de chat por
 * no poder escribir/leer el historial.
 */
@Injectable()
export class AiConversationService {
  private readonly logger = new Logger(AiConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reusa la conversación más reciente del usuario, o crea una nueva
   * guardando la versión de prompt activa (regla 8). Devuelve el id o
   * `null` si la BD no está disponible.
   */
  async getOrCreate(
    userId: number,
    promptVersion: string,
  ): Promise<number | null> {
    // userId SIEMPRE viene del JWT. Si no es un entero positivo válido, NO
    // intentamos insertar (evita el null-constraint visto en producción) y
    // degradamos a null: el chat sigue sin persistencia.
    if (!Number.isInteger(userId) || userId <= 0) {
      this.logger.warn(
        `getOrCreate: userId inválido (${userId}) — chat sin persistencia`,
      );
      Sentry.captureMessage(
        `AiConversation.getOrCreate userId inválido: ${userId}`,
        'warning',
      );
      return null;
    }
    // promptVersion NUNCA debe ir null/'' a la BD (columna NOT NULL).
    const version =
      typeof promptVersion === 'string' && promptVersion.trim()
        ? promptVersion
        : 'v1';

    try {
      const existing = await this.prisma.aiConversation.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (existing) return existing.id;

      const created = await this.prisma.aiConversation.create({
        data: { userId, promptVersion: version },
        select: { id: true },
      });
      return created.id;
    } catch (e) {
      this.logger.warn(
        `getOrCreate conversación falló: ${(e as Error)?.message ?? e}`,
      );
      Sentry.captureException(e, {
        tags: { module: 'ai-assistant', op: 'getOrCreate' },
        extra: { userId },
      });
      return null;
    }
  }

  /**
   * Recupera el historial reciente aplicando el LÍMITE DUAL (regla 6):
   * máx 10 mensajes Y máx 6000 caracteres acumulados, priorizando los más
   * recientes. Los mensajes antiguos que exceden el tope se omiten.
   *
   * Devuelve en orden cronológico (viejo → nuevo) listo para Gemini.
   */
  async recoverHistory(conversationId: number): Promise<AiHistoryTurn[]> {
    try {
      // Traemos los más recientes primero (DESC) y recortamos por chars.
      const rows = await this.prisma.aiMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_MAX_MESSAGES,
        select: { role: true, content: true },
      });

      const picked: AiHistoryTurn[] = [];
      let chars = 0;
      for (const r of rows) {
        if (picked.length >= HISTORY_MAX_MESSAGES) break;
        if (chars + r.content.length > HISTORY_MAX_CHARS) break;
        chars += r.content.length;
        picked.push({
          role: r.role === 'model' ? 'model' : 'user',
          text: r.content,
        });
      }
      return picked.reverse(); // a orden cronológico
    } catch (e) {
      this.logger.warn(`recoverHistory falló: ${(e as Error)?.message ?? e}`);
      return [];
    }
  }

  /**
   * Últimos `limit` mensajes del usuario (en cualquiera de sus conversaciones),
   * en orden cronológico, para sincronizar el chat entre dispositivos. Filtra
   * por la relación `conversation.userId`. Resiliente: [] si la BD falla.
   */
  async getRecentMessages(
    userId: number,
    limit = 20,
  ): Promise<Array<{ role: string; content: string; createdAt: Date }>> {
    try {
      const rows = await this.prisma.aiMessage.findMany({
        where: { conversation: { userId } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { role: true, content: true, createdAt: true },
      });
      return rows.reverse(); // cronológico (viejo → nuevo)
    } catch (e) {
      this.logger.warn(
        `getRecentMessages falló: ${(e as Error)?.message ?? e}`,
      );
      return [];
    }
  }

  /**
   * Persiste un mensaje con su metadata de observabilidad. No-op si no hay
   * conversación (BD caída). Nunca lanza.
   */
  async saveMessage(input: SaveMessageInput): Promise<void> {
    if (input.conversationId == null) return;
    try {
      await this.prisma.aiMessage.create({
        data: {
          conversationId: input.conversationId,
          role: input.role,
          content: input.content,
          ipAddress: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          responseTimeMs: input.responseTimeMs ?? null,
          tokensUsed: input.tokensUsed ?? null,
          flagged: input.flagged ?? false,
          moderationPass: input.moderationPass ?? true,
        },
      });
    } catch (e) {
      // BD caída (p.ej. Render): logueamos + Sentry y seguimos. La respuesta
      // de Gemini ya se devolvió al usuario; la persistencia es best-effort.
      this.logger.warn(`saveMessage falló: ${(e as Error)?.message ?? e}`);
      Sentry.captureException(e, {
        tags: { module: 'ai-assistant', op: 'saveMessage' },
      });
    }
  }
}
