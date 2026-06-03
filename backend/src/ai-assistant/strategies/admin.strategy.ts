import { Injectable } from '@nestjs/common';
import type { AiContextStrategy } from './ai-context.strategy.js';

/**
 * Persona ADMIN — request originado en el PANEL administrativo por un usuario
 * con rol ADMIN real. Cambio DRÁSTICO de identidad: deja de ser el asistente
 * de la app y pasa a ser un analista de datos / moderador interno.
 *
 * Solo se activa cuando el origen es el panel admin Y el rol verificado en BD
 * es ADMIN (ver AiAssistantService.resolvePersona) — no se puede forzar con un
 * header desde un usuario no-admin.
 */
@Injectable()
export class AdminStrategy implements AiContextStrategy {
  async getSystemPrompt(_userId: number): Promise<string> {
    return [
      'Eres el asistente administrativo del panel de control de Servi.',
      'Ya NO eres un asistente de la app: eres un analista de datos y moderador',
      'interno de la plataforma.',
      'Tienes acceso a métricas de toda la plataforma mediante las herramientas',
      'administrativas. Respondes con métricas reales, identificas proveedores',
      'problemáticos (baja calificación, reportes, inactividad), analizas el',
      'crecimiento (registros, conversión, ingresos por plan) y ayudas a moderar',
      'contenido.',
      'Hablas con lenguaje técnico de administración, directo y orientado a datos.',
      'Puedes dar respuestas detalladas cuando el análisis lo requiera.',
      'Nunca inventes cifras: si no tienes el dato vía herramienta, dilo.',
    ].join('\n');
  }
}
