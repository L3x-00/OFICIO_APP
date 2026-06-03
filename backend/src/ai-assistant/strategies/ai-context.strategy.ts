/**
 * Estrategias de Contexto de "Ofi" (patrón Strategy).
 *
 * Cada persona de la IA define su propia identidad + capacidades vía un
 * system prompt distinto. El servicio resuelve la persona REAL del request
 * (admin panel / invitado / cliente / proveedor) y delega la construcción
 * del prompt en la estrategia correspondiente.
 *
 * IMPORTANTE: la estrategia aporta SOLO la persona. Las reglas de seguridad
 * inquebrantables y el contexto de la Knowledge Base los compone el servicio
 * (AiAssistantService.systemPrompt) ALREDEDOR del prompt de la estrategia —
 * para que ninguna persona pueda perder esas garantías.
 */

/** Las 4 personas drásticamente diferentes del asistente. */
export enum AiPersonaType {
  ADMIN = 'ADMIN',
  GUEST = 'GUEST',
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
}

/**
 * Contrato común. `getSystemPrompt` recibe el `userId` (del JWT) para que
 * las estrategias dinámicas (p. ej. PROVIDER) puedan enriquecer el prompt
 * con datos del perfil. Debe ser best-effort: NUNCA lanzar — si falta un
 * dato, devolver un prompt válido igual.
 */
export interface AiContextStrategy {
  getSystemPrompt(userId: number): Promise<string>;
}
