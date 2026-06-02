import { Type } from '@google/genai';
import type { AiToolDef } from '../ai-assistant.types.js';

/**
 * Tools COMUNES a todos los roles (Fase 3).
 *
 * Consultas de catálogo público de Servi: buscar proveedores, categorías
 * y ofertas, explicar una función de la plataforma o sugerir acciones.
 * Ninguna expone PII ni toca datos privados de un usuario concreto —
 * por eso están disponibles para USUARIO, PROVEEDOR y ADMIN.
 *
 * Solo se DECLARAN aquí (contrato hacia Gemini). La ejecución real vive
 * en `AiDataAccessService` con `select` estricto + timeout (reglas 2-4).
 */

const ALL_ROLES = ['USUARIO', 'PROVEEDOR', 'ADMIN'] as const;

export const COMMON_TOOLS: AiToolDef[] = [
  {
    roles: ALL_ROLES,
    declaration: {
      name: 'search_providers',
      description:
        'Busca proveedores (profesionales o negocios) verificados en Servi. ' +
        'Úsala cuando el usuario quiere encontrar quién presta un servicio. ' +
        'Filtra por la ubicación del usuario (department, province, district). ' +
        'NO pidas coordenadas GPS.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description:
              "Rubro o especialidad a buscar, p.ej. 'gasfitero', 'peluquería', 'restaurante'.",
          },
          department: {
            type: Type.STRING,
            description: "Departamento del usuario, p.ej. 'Junín' (opcional).",
          },
          province: {
            type: Type.STRING,
            description: "Provincia del usuario, p.ej. 'Huancayo' (opcional).",
          },
          district: {
            type: Type.STRING,
            description: "Distrito del usuario, p.ej. 'El Tambo' (opcional).",
          },
        },
      },
    },
  },
  {
    roles: ALL_ROLES,
    declaration: {
      name: 'search_categories',
      description:
        'Lista las categorías/rubros de servicios disponibles en Servi. ' +
        'Úsala si el usuario pregunta qué tipos de servicios existen.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: 'Texto para filtrar categorías por nombre (opcional).',
          },
        },
      },
    },
  },
  {
    roles: ALL_ROLES,
    declaration: {
      name: 'search_offers',
      description:
        'Busca ofertas/promociones activas publicadas por proveedores en Servi. ' +
        'Úsala cuando el usuario pregunta por descuentos o promociones vigentes.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description: 'Rubro para filtrar las ofertas (opcional).',
          },
        },
      },
    },
  },
  {
    roles: ALL_ROLES,
    declaration: {
      name: 'explain_feature',
      description:
        'Obtiene la explicación oficial de una función o concepto de Servi ' +
        '(planes, reseñas, monedas, referidos, verificación, etc.) desde la ' +
        'base de conocimiento. Úsala antes de inventar cómo funciona algo.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          feature: {
            type: Type.STRING,
            description:
              "Tema a explicar, p.ej. 'planes', 'reseñas', 'monedas', 'referidos'.",
          },
        },
        required: ['feature'],
      },
    },
  },
  {
    roles: ALL_ROLES,
    declaration: {
      name: 'recommend_actions',
      description:
        'Sugiere próximas acciones útiles para el usuario dentro de Servi ' +
        'según su rol. Úsala si el usuario pregunta "¿qué puedo hacer ahora?".',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
  },
];
