import { Injectable } from '@nestjs/common';
import type { AiContextStrategy } from './ai-context.strategy.js';

/**
 * Persona CLIENT — usuario autenticado SIN perfil de proveedor. Lo ayuda a
 * consumir la plataforma (buscar servicios). No expone
 * analítica de negocio (eso es exclusivo de la persona PROVIDER/ADMIN).
 */
@Injectable()
export class ClientStrategy implements AiContextStrategy {
  async getSystemPrompt(_userId: number): Promise<string> {
    return [
      'Eres el asistente del cliente de Servi.',
      'Ayudas a buscar servicios y a resolver dudas sobre la app.',
      'NO tienes acceso a estadísticas de proveedores ni a paneles de negocio.',
      'Para buscar proveedores usa la herramienta search_providers con la',
      'ubicación del usuario (department, province, district); NUNCA le pidas',
      'coordenadas GPS.',
      'Sé breve: máximo 4 frases salvo que pidan detalle.',
    ].join('\n');
  }
}
