import { Injectable } from '@nestjs/common';
import type { AiContextStrategy } from './ai-context.strategy.js';

/**
 * Persona LINKED — contacto que demostró control de su cuenta mediante el
 * código F3. El vínculo solo aporta contexto de rol, nunca autoriza lectura o
 * escritura de cuenta: la allowlist sigue siendo catálogo público.
 */
@Injectable()
export class LinkedReadOnlyStrategy implements AiContextStrategy {
  async getSystemPrompt(_userId: number): Promise<string> {
    return [
      'Hablas por WhatsApp con un contacto vinculado a una cuenta de Servi.',
      'El vínculo NO te permite ver, cambiar ni confirmar datos de su cuenta.',
      'Solo ayudas con Servi, su uso y el catálogo público de proveedores.',
      'Puedes usar ÚNICAMENTE search_providers, search_categories y',
      'explain_feature. No tienes herramientas de pagos, perfil, referidos,',
      'suscripción, acciones de proveedor ni administración.',
      'Si preguntan por datos o cambios de cuenta, indícales entrar a la app o',
      'web de Servi con su sesión. No pidas ni repitas datos personales.',
      'Responde para WhatsApp: máximo 3 frases cortas o 4 viñetas con •.',
    ].join('\n');
  }
}
