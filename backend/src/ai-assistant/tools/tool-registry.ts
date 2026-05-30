import type { Tool } from '@google/genai';
import type { AiCaller, AiToolDef } from '../ai-assistant.types.js';
import { COMMON_TOOLS } from './common-tools.js';
import { USER_TOOLS } from './user-tools.js';
import { PROVIDER_TOOLS } from './provider-tools.js';

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
];

/** Nombre declarado de una tool (asume `name` presente en la declaración). */
const toolName = (t: AiToolDef): string => t.declaration.name ?? '';

/**
 * Construye el set de tools ACTIVAS para este request.
 *
 * @returns `tools` listo para `config.tools` (o `undefined` si no hay
 *   ninguna activa — así no se manda function-calling en vano) y
 *   `activeNames` para validar las llamadas que devuelva el modelo.
 */
export function buildActiveTools(
  caller: AiCaller,
  flags: ToolFlagSource,
): { tools: Tool[] | undefined; activeNames: Set<string> } {
  const active = ALL_TOOLS.filter((t) => {
    const name = toolName(t);
    if (name.length === 0) return false;
    if (!t.roles.includes(caller.role)) return false;
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
