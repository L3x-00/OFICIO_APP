import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { AiContextStrategy } from './ai-context.strategy.js';

/**
 * Persona PROVIDER — usuario con perfil de proveedor. Asistente "empresarial"
 * enfocado en visibilidad, plan y métricas propias.
 *
 * El prompt es DINÁMICO: incluye el/los perfil(es) activo(s) del proveedor
 * (OFICIO/NEGOCIO) consultados en BD. La interfaz solo recibe `userId`, así
 * que el tipo de perfil se resuelve aquí. Best-effort: si la BD falla o no
 * hay perfil, devuelve un prompt válido genérico (NUNCA lanza).
 */
@Injectable()
export class ProviderStrategy implements AiContextStrategy {
  private readonly logger = new Logger(ProviderStrategy.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSystemPrompt(userId: number): Promise<string> {
    const profile = await this.resolveProfileLabel(userId);

    return [
      'Eres el asistente empresarial de este proveedor en Servi.',
      'Ayudas a mejorar su visibilidad en el listado, a entender su plan y sus',
      'beneficios, y a analizar sus estadísticas (vistas, clics de WhatsApp/llamada,',
      'reseñas, ranking).',
      `CONTEXTO ACTUAL: Perfil ${profile}. Tienes acceso total a sus métricas`,
      'mediante las herramientas disponibles (get_provider_stats, get_subscription_status).',
      'Da consejos accionables y concretos para crecer en la plataforma.',
      'Para datos de su negocio usa SIEMPRE las herramientas; nunca inventes cifras.',
    ].join('\n');
  }

  /**
   * Etiqueta del/los perfil(es) del proveedor: 'OFICIO', 'NEGOCIO',
   * 'OFICIO y NEGOCIO' o 'proveedor' como fallback. Un usuario puede tener
   * ambos tipos (@@unique([userId, type])).
   */
  private async resolveProfileLabel(userId: number): Promise<string> {
    try {
      const profiles = await this.prisma.provider.findMany({
        where: { userId },
        select: { type: true },
      });
      const types = profiles.map((p) => p.type);
      if (types.length === 0) return 'proveedor';
      if (types.includes('OFICIO') && types.includes('NEGOCIO')) {
        return 'OFICIO y NEGOCIO';
      }
      return types[0] === 'NEGOCIO' ? 'NEGOCIO' : 'OFICIO';
    } catch (e) {
      this.logger.warn(
        `resolveProfileLabel falló (fallback genérico): ${(e as Error)?.message ?? e}`,
      );
      return 'proveedor';
    }
  }
}
