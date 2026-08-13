import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  KNOWLEDGE_CACHE_KEY,
  KNOWLEDGE_CACHE_TTL_MS,
} from './ai-assistant.constants.js';

/** Entrada de knowledge ya aplanada para el prompt (sin metadata interna). */
interface KnowledgeEntryDto {
  topic: string;
  content: unknown;
}

/** Límites del bloque dinámico: acotan costo y exposición ante datos anómalos. */
export const MAX_KNOWLEDGE_ENTRIES = 30;
export const MAX_KNOWLEDGE_CONTEXT_CHARS = 12_000;
const MAX_KNOWLEDGE_TOPIC_CHARS = 120;

/**
 * Knowledge Base dinámica de "Ofi" (Fase 2).
 *
 * Lee SOLO las entries `isActive: true` con `select` explícito (regla 2:
 * nunca entidad completa) y las cachea en Redis 5 min. El system prompt
 * se arma con `getKnowledgeContext()` — texto plano listo para inyectar.
 *
 * Resiliencia: si Redis o la BD fallan, devuelve string vacío → el
 * asistente sigue respondiendo con su prompt base sin tumbar el flujo.
 */
@Injectable()
export class AiKnowledgeService {
  private readonly logger = new Logger(AiKnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Bloque de contexto (texto) para el system prompt. Cacheado 5 min.
   * Formato: cada topic como sección "## topic\n<json>".
   */
  async getKnowledgeContext(): Promise<string> {
    // 1. Cache hit.
    try {
      const cached = await this.cache.get<string>(KNOWLEDGE_CACHE_KEY);
      if (typeof cached === 'string') return cached;
    } catch {
      // Redis caído → seguimos a BD.
    }

    // 2. Leer entries activas (select estricto — regla 2).
    let entries: KnowledgeEntryDto[] = [];
    try {
      entries = await this.prisma.aiKnowledgeEntry.findMany({
        where: { isActive: true },
        select: { topic: true, content: true },
        orderBy: { topic: 'asc' },
        take: MAX_KNOWLEDGE_ENTRIES,
      });
    } catch (e) {
      this.logger.warn(`Knowledge fetch falló: ${(e as Error)?.message ?? e}`);
      return '';
    }

    const context = this.format(entries);

    // 3. Cachear 5 min (best-effort).
    try {
      await this.cache.set(
        KNOWLEDGE_CACHE_KEY,
        context,
        KNOWLEDGE_CACHE_TTL_MS,
      );
    } catch {
      // Silencioso.
    }
    return context;
  }

  /** Invalida el cache (llamar tras editar la KB desde el admin). */
  async invalidate(): Promise<void> {
    try {
      await this.cache.del(KNOWLEDGE_CACHE_KEY);
    } catch {
      // Silencioso.
    }
  }

  /** Serializa entries a texto compacto y acotado para el prompt. */
  private format(entries: KnowledgeEntryDto[]): string {
    if (entries.length === 0) return '';

    const parts: string[] = [];
    let remaining = MAX_KNOWLEDGE_CONTEXT_CHARS;

    for (const entry of entries.slice(0, MAX_KNOWLEDGE_ENTRIES)) {
      const topic = entry.topic
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_KNOWLEDGE_TOPIC_CHARS);
      const serialized =
        typeof entry.content === 'string'
          ? entry.content
          : JSON.stringify(entry.content);
      const body = (serialized ?? '').replace(/\0/g, '').trim();
      if (!topic || !body || remaining <= 0) continue;

      const prefix = `Tema: ${topic}\nDatos: `;
      const available = remaining - prefix.length;
      if (available <= 0) break;

      const content = body.slice(0, available);
      parts.push(`${prefix}${content}`);
      remaining -= prefix.length + content.length + 2;
    }

    return parts.join('\n\n');
  }
}
