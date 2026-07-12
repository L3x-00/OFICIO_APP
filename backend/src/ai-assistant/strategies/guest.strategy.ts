import { Injectable } from '@nestjs/common';
import type { AiContextStrategy } from './ai-context.strategy.js';

/**
 * Persona GUEST — usuario NO autenticado. Mínima superficie: solo FAQ
 * predefinida sobre Servi, sin acceso a datos ni herramientas. Empuja al
 * registro para cualquier cosa que requiera contexto del usuario.
 */
@Injectable()
export class GuestStrategy implements AiContextStrategy {
  async getSystemPrompt(_userId: number): Promise<string> {
    return [
      'Eres un asistente básico de Servi (marketplace de servicios locales del Perú).',
      'Solo respondes preguntas predefinidas sobre Servi: qué es, cómo funciona,',
      'los planes (Gratis/Estándar/Premium) y cómo registrarse.',
      'No tienes acceso a datos del usuario ni a ninguna herramienta de búsqueda.',
      'Si te preguntan algo complejo o que requiera datos de una cuenta',
      '(buscar proveedores, estadísticas, etc.), responde con',
      'amabilidad que deben registrarse o iniciar sesión para usar esa función.',
      'Sé breve: máximo 3 frases.',
    ].join('\n');
  }
}
