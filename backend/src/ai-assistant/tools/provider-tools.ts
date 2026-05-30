import { Type } from '@google/genai';
import type { AiToolDef } from '../ai-assistant.types.js';

/**
 * Tools del PANEL del proveedor (Fase 3).
 *
 * Datos del perfil de proveedor del propio solicitante: estado de su
 * suscripción y métricas de su perfil. Igual que las user-tools, el
 * userId lo inyecta el orquestador desde el JWT (no viaja en args).
 *
 * Solo para rol PROVEEDOR.
 */

const PROVIDER_ROLES = ['PROVEEDOR'] as const;

export const PROVIDER_TOOLS: AiToolDef[] = [
  {
    roles: PROVIDER_ROLES,
    declaration: {
      name: 'get_subscription_status',
      description:
        'Devuelve el estado de la suscripción del proveedor actual ' +
        '(plan, estado y fecha de vencimiento). Úsala cuando pregunte por ' +
        'su plan o hasta cuándo está activo.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
  },
  {
    roles: PROVIDER_ROLES,
    declaration: {
      name: 'get_provider_stats',
      description:
        'Devuelve métricas del perfil del proveedor actual (rating ' +
        'promedio, total de reseñas, recomendaciones y vistas de perfil).',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
  },
];
