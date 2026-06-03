import type { Tool } from '@google/genai';
import type { AiToolDef } from '../ai-assistant.types.js';
import { AiPersonaType } from '../strategies/ai-context.strategy.js';
import { COMMON_TOOLS } from './common-tools.js';
import { USER_TOOLS } from './user-tools.js';
import { PROVIDER_TOOLS } from './provider-tools.js';
import { ADMIN_TOOLS } from './admin-tools.js';

/**
 * Registro central de Tools de "Ofi" (Fase 3).
 *
 * Agrega las declaraciones de los tres segmentos y las EXPONE a Gemini de
 * forma dinámica aplicando DOS filtros (defensa en profundidad):
 *
 *   1. Rol del solicitante  — `AiToolDef.roles` (anti-IDOR de catálogo).
 *   2. Feature-flag / kill-switch por env — `isToolEnabled(name)`
 *      (regla 8). Si una tool está apagada, NO se envía en ese request.
 *
 * Es 100% declarativo: NO importa Prisma ni el SDK como runtime más allá
 * del tipo `Tool`. La ejecución vive en el orquestador + data-access.
 */

/** Contrato mínimo del feature-flag (evita acoplar el tipo del servicio). */
export interface ToolFlagSource {
  isToolEnabled(toolName: string): boolean;
}

/** Todas las tools registradas, en un solo arreglo. */
export const ALL_TOOLS: readonly AiToolDef[] = [
  ...COMMON_TOOLS,
  ...USER_TOOLS,
  ...PROVIDER_TOOLS,
  ...ADMIN_TOOLS,
];

/**
 * Allowlist de tools POR PERSONA — fuente de verdad de qué ve cada rol.
 * Separa los catálogos para que un cliente no pueda pedir estadísticas ni un
 * admin buscar servicios. GUEST no recibe ninguna (solo respuestas
 * predefinidas).
 */
const TOOLS_BY_PERSONA: Record<AiPersonaType, readonly string[]> = {
  [AiPersonaType.GUEST]: [],
  [AiPersonaType.CLIENT]: [
    'search_providers',
    'search_categories',
    'get_user_coins',
    'explain_feature',
  ],
  [AiPersonaType.PROVIDER]: [
    'get_provider_stats',
    'get_my_context',
    'get_subscription_status',
    'recommend_actions',
  ],
  [AiPersonaType.ADMIN]: [
    'get_platform_stats',
    'get_top_providers',
    'get_pending_approvals',
  ],
};

/** Nombre declarado de una tool (asume `name` presente en la declaración). */
const toolName = (t: AiToolDef): string => t.declaration.name ?? '';

/**
 * Construye el set de tools ACTIVAS para este request, aplicando DOS filtros
 * (defensa en profundidad):
 *
 *   1. PERSONA del solicitante — allowlist `TOOLS_BY_PERSONA` (separación de
 *      catálogos: cliente ≠ proveedor ≠ admin; invitado sin tools).
 *   2. Feature-flag / kill-switch por env — `isToolEnabled(name)` (regla 8).
 *
 * @returns `tools` listo para `config.tools` (o `undefined` si no hay
 *   ninguna activa — así no se manda function-calling en vano) y
 *   `activeNames` para validar las llamadas que devuelva el modelo.
 */
export function buildActiveTools(
  persona: AiPersonaType,
  flags: ToolFlagSource,
): { tools: Tool[] | undefined; activeNames: Set<string> } {
  const allowed = new Set(TOOLS_BY_PERSONA[persona] ?? []);

  const active = ALL_TOOLS.filter((t) => {
    const name = toolName(t);
    if (name.length === 0) return false;
    if (!allowed.has(name)) return false;
    return flags.isToolEnabled(name);
  });

  const activeNames = new Set(active.map(toolName));
  if (active.length === 0) {
    return { tools: undefined, activeNames };
  }
  return {
    tools: [{ functionDeclarations: active.map((t) => t.declaration) }],
    activeNames,
  };
}
