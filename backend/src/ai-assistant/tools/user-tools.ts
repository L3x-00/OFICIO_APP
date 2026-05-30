import { Type } from '@google/genai';
import type { AiToolDef } from '../ai-assistant.types.js';

/**
 * Tools de CUENTA del usuario (Fase 3).
 *
 * Devuelven datos del propio solicitante (monedas, referidos). El userId
 * NUNCA viaja en los argumentos: el orquestador lo inyecta desde el JWT
 * (`AiCaller.userId`), de modo que Gemini no puede pedir datos de otra
 * persona (anti-IDOR). Por eso `parameters` va vacío.
 *
 * Disponibles para USUARIO y PROVEEDOR (ambos acumulan monedas y tienen
 * código de referido); no para ADMIN.
 */

const ACCOUNT_ROLES = ['USUARIO', 'PROVEEDOR'] as const;

export const USER_TOOLS: AiToolDef[] = [
  {
    roles: ACCOUNT_ROLES,
    declaration: {
      name: 'get_user_coins',
      description:
        'Devuelve el saldo de monedas Servi del usuario actual. ' +
        'Úsala cuando pregunte cuántas monedas tiene.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
  },
  {
    roles: ACCOUNT_ROLES,
    declaration: {
      name: 'get_referral_stats',
      description:
        'Devuelve las estadísticas de referidos del usuario actual ' +
        '(código, invitados totales e invitados exitosos).',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
  },
  {
    roles: ACCOUNT_ROLES,
    declaration: {
      name: 'get_my_context',
      description:
        'Devuelve el contexto propio del usuario actual para dar respuestas ' +
        'personalizadas. Si es proveedor: visitas, favoritos, rating, ' +
        'reseñas, fotos, ofertas activas, plan y sello de confianza. Si es ' +
        'cliente: monedas y favoritos. Úsala cuando pregunte por "mi perfil", ' +
        '"cómo voy" o pida consejos personalizados.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
  },
];
