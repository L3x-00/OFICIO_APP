import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Señales de un turno para actualizar la memoria del cliente. */
export interface TurnSignals {
  intent?: string;
  /** Rubros buscados en el turno (args de search_providers). */
  categories?: string[];
  /** Proveedores surgidos en el turno. */
  providerIds?: number[];
}

/**
 * Memoria persistente de "Ofi" (por usuario y por proveedor).
 *
 * Objetivo: CONTINUIDAD + AHORRO de tokens. Mantiene un resumen PEQUEÑO y
 * acotado (no transcripciones) que se inyecta compacto en el system prompt
 * para que la IA no repregunte ubicación/rubros ni llame tools de más.
 *
 * 100% best-effort: cualquier fallo se loguea y degrada a vacío/no-op — la
 * memoria NUNCA rompe el flujo del chat. Reutiliza datos ya existentes
 * (User.department/province/district, Favorite) en lugar de duplicarlos.
 */
@Injectable()
export class AiMemoryService {
  private readonly logger = new Logger(AiMemoryService.name);

  private static readonly MAX_CATEGORIES = 5;
  private static readonly MAX_PROVIDERS = 8;

  constructor(private readonly prisma: PrismaService) {}

  // ── Lectura → bloques para el system prompt ───────────────────

  /**
   * Bloque compacto de memoria del CLIENTE. Combina la ubicación habitual y
   * los favoritos (datos YA existentes) con los rubros buscados (memoria IA).
   * Devuelve '' si no hay nada útil o si falla.
   */
  async getUserMemoryBlock(userId: number): Promise<string> {
    if (!Number.isInteger(userId) || userId <= 0) return '';
    try {
      const [user, mem, favCount] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { province: true, district: true },
        }),
        this.prisma.aiUserMemory.findUnique({ where: { userId } }),
        this.prisma.favorite.count({ where: { userId } }),
      ]);

      const lines: string[] = [];
      const loc = [user?.district, user?.province]
        .map((x) => x?.trim())
        .filter((x): x is string => !!x && x.length > 0);
      if (loc.length > 0)
        lines.push(`- Ubicación habitual: ${loc.join(', ')}.`);
      if (mem?.searchCategories.length) {
        lines.push(
          `- Rubros que suele buscar: ${mem.searchCategories.join(', ')}.`,
        );
      }
      if (favCount > 0) {
        lines.push(`- Tiene ${favCount} proveedor(es) en favoritos.`);
      }
      if (lines.length === 0) return '';
      return [
        'MEMORIA DEL USUARIO (personaliza con esto; NO la menciones literalmente ni pidas datos que ya están aquí):',
        ...lines,
      ].join('\n');
    } catch (e) {
      this.logger.warn(
        `getUserMemoryBlock falló: ${(e as Error)?.message ?? e}`,
      );
      return '';
    }
  }

  /** Bloque compacto de memoria del PROVEEDOR (rubros + métricas). '' si falla. */
  async getProviderMemoryBlock(userId: number): Promise<string> {
    if (!Number.isInteger(userId) || userId <= 0) return '';
    try {
      const provider = await this.prisma.provider.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!provider) return '';
      const mem = await this.prisma.aiProviderMemory.findUnique({
        where: { providerId: provider.id },
      });
      if (!mem) return '';

      const lines: string[] = [];
      if (mem.mainCategories.length) {
        lines.push(`- Rubros principales: ${mem.mainCategories.join(', ')}.`);
      }
      const m = mem.metricsSnapshot as Record<string, unknown> | null;
      if (m) {
        const parts: string[] = [];
        if (typeof m.rating === 'number') parts.push(`⭐ ${m.rating}`);
        if (typeof m.reviews === 'number') parts.push(`${m.reviews} reseñas`);
        if (typeof m.plan === 'string') parts.push(`plan ${m.plan}`);
        if (parts.length)
          lines.push(`- Métricas recientes: ${parts.join(' · ')}.`);
      }
      if (lines.length === 0) return '';
      return [
        'MEMORIA DEL PROVEEDOR (personaliza con esto; NO la menciones literalmente):',
        ...lines,
      ].join('\n');
    } catch (e) {
      this.logger.warn(
        `getProviderMemoryBlock falló: ${(e as Error)?.message ?? e}`,
      );
      return '';
    }
  }

  // ── Escritura → actualización tras un turno ───────────────────

  /**
   * Actualiza la memoria del cliente con las señales del turno (fusión
   * acotada: dedup + caps, más reciente primero). Best-effort: no lanza.
   */
  async recordTurn(userId: number, signals: TurnSignals): Promise<void> {
    if (!Number.isInteger(userId) || userId <= 0) return;
    const hasSignal =
      (signals.categories?.length ?? 0) > 0 ||
      (signals.providerIds?.length ?? 0) > 0 ||
      signals.intent != null;
    if (!hasSignal) return;
    try {
      const existing = await this.prisma.aiUserMemory.findUnique({
        where: { userId },
      });
      const searchCategories = this.mergeCappedStr(
        signals.categories ?? [],
        existing?.searchCategories ?? [],
        AiMemoryService.MAX_CATEGORIES,
      );
      const recentProviderIds = this.mergeCappedNum(
        signals.providerIds ?? [],
        existing?.recentProviderIds ?? [],
        AiMemoryService.MAX_PROVIDERS,
      );
      const data = {
        searchCategories,
        recentProviderIds,
        lastIntent: signals.intent ?? existing?.lastIntent ?? null,
      };
      await this.prisma.aiUserMemory.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
    } catch (e) {
      this.logger.warn(`recordTurn falló: ${(e as Error)?.message ?? e}`);
    }
  }

  /**
   * Refresca la memoria del proveedor desde su perfil (rubros principales +
   * snapshot de métricas). Best-effort: no lanza.
   */
  async refreshProviderMemory(userId: number): Promise<void> {
    if (!Number.isInteger(userId) || userId <= 0) return;
    try {
      const provider = await this.prisma.provider.findFirst({
        where: { userId },
        select: {
          id: true,
          averageRating: true,
          totalReviews: true,
          subscription: { select: { plan: true } },
          providerCategories: {
            select: { category: { select: { name: true } } },
            orderBy: { isPrimary: 'desc' },
            take: AiMemoryService.MAX_CATEGORIES,
          },
        },
      });
      if (!provider) return;
      const mainCategories = provider.providerCategories.map(
        (pc) => pc.category.name,
      );
      const metricsSnapshot = {
        rating: provider.averageRating,
        reviews: provider.totalReviews,
        plan: provider.subscription?.plan ?? 'GRATIS',
      };
      await this.prisma.aiProviderMemory.upsert({
        where: { providerId: provider.id },
        create: { providerId: provider.id, mainCategories, metricsSnapshot },
        update: { mainCategories, metricsSnapshot },
      });
    } catch (e) {
      this.logger.warn(
        `refreshProviderMemory falló: ${(e as Error)?.message ?? e}`,
      );
    }
  }

  // ── Helpers de fusión acotada (dedup + cap, más reciente primero) ──

  private mergeCappedStr(
    fresh: string[],
    existing: string[],
    cap: number,
  ): string[] {
    const merged = [...fresh.map((s) => s.trim()).filter(Boolean), ...existing];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of merged) {
      const k = x.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(x);
      if (out.length >= cap) break;
    }
    return out;
  }

  private mergeCappedNum(
    fresh: number[],
    existing: number[],
    cap: number,
  ): number[] {
    const merged = [...fresh, ...existing];
    const seen = new Set<number>();
    const out: number[] = [];
    for (const x of merged) {
      if (seen.has(x)) continue;
      seen.add(x);
      out.push(x);
      if (out.length >= cap) break;
    }
    return out;
  }
}
