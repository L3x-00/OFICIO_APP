import { Type } from '@google/genai';
import type { AiToolDef } from '../ai-assistant.types.js';

/**
 * Tools del PANEL ADMINISTRATIVO (persona ADMIN).
 *
 * "Poder total" de lectura: métricas globales de la plataforma, ranking de
 * proveedores y colas de aprobación. NO incluyen búsqueda de servicios ni
 * herramientas de cuenta — un admin analiza/modera, no consume la app.
 *
 * Solo se DECLARAN aquí. La ejecución vive en `AiDataAccessService`
 * (`*Safe` con `select` estricto + timeout). Ningún arg viaja en la
 * llamada: son consultas agregadas de plataforma.
 */

const ADMIN_ONLY = ['ADMIN'] as const;

export const ADMIN_TOOLS: AiToolDef[] = [
  {
    roles: ADMIN_ONLY,
    declaration: {
      name: 'get_platform_stats',
      description:
        'Devuelve métricas globales de la plataforma Servi: usuarios nuevos ' +
        'de hoy, proveedores pendientes de aprobación e ingresos del mes ' +
        'en curso. Úsala cuando el admin pida el estado general o KPIs.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
  },
  {
    roles: ADMIN_ONLY,
    declaration: {
      name: 'get_top_providers',
      description:
        'Devuelve el ranking de proveedores con más MOVIMIENTO/actividad en ' +
        'la plataforma (vistas y clics de contacto), con su calificación y ' +
        'reseñas. Úsala cuando el admin pregunte qué proveedor tiene más ' +
        'movimiento, tráfico, actividad o cuáles son los destacados.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
  },
  {
    roles: ADMIN_ONLY,
    declaration: {
      name: 'get_pending_approvals',
      description:
        'Devuelve las colas de aprobación pendientes: proveedores en estado ' +
        'PENDIENTE de verificación y solicitudes de validación de confianza ' +
        '(trust) sin revisar. Úsala cuando el admin pregunte qué tiene por ' +
        'aprobar o moderar.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
  },
];
