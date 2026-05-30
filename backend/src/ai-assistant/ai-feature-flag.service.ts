import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiUserRole } from './ai-assistant.types.js';

/**
 * Feature flags + Kill-Switch de "Ofi" (regla 8).
 *
 * Todo se lee de variables de entorno → se puede apagar la IA entera,
 * un segmento de usuarios o una tool individual SIN redeploy (Render
 * permite editar env vars y reinicia el servicio). Defaults
 * conservadores: si una flag no está seteada, se asume el valor más
 * seguro documentado en cada método.
 *
 * Convención de env:
 *   AI_ENABLED=true|false                  (master switch)
 *   AI_ENABLED_FOR_ADMINS=true|false
 *   AI_ENABLED_FOR_PROVIDERS=true|false
 *   AI_ENABLED_FOR_USERS=true|false
 *   AI_TOOL_<NOMBRE>_ENABLED=true|false    (kill-switch por tool)
 *   AI_PROMPT_VERSION=v1|v2|...            (versionado de prompt)
 */
@Injectable()
export class AiFeatureFlagService {
  private readonly logger = new Logger(AiFeatureFlagService.name);

  constructor(private readonly config: ConfigService) {}

  /** Lee un env booleano con default explícito. */
  private bool(key: string, fallback: boolean): boolean {
    const raw = this.config.get<string>(key);
    if (raw === undefined || raw === null || raw === '') return fallback;
    return raw.toLowerCase() === 'true' || raw === '1';
  }

  /** Master switch — si false, la IA está completamente apagada. */
  isGloballyEnabled(): boolean {
    return this.bool('AI_ENABLED', false);
  }

  /**
   * ¿Está habilitada la IA para este rol? Combina el master switch con
   * el flag por segmento. Default por segmento: false (opt-in explícito).
   */
  isEnabledForRole(role: AiUserRole): boolean {
    if (!this.isGloballyEnabled()) return false;
    switch (role) {
      case 'ADMIN':
        return this.bool('AI_ENABLED_FOR_ADMINS', false);
      case 'PROVEEDOR':
        return this.bool('AI_ENABLED_FOR_PROVIDERS', false);
      case 'USUARIO':
        return this.bool('AI_ENABLED_FOR_USERS', false);
      default:
        return false;
    }
  }

  /**
   * Kill-switch por tool (regla 3 del prompt de fase / regla 8). Convierte
   * `search_providers` → `AI_TOOL_SEARCH_PROVIDERS_ENABLED`.
   *
   * Default: false. Una tool solo corre si está EXPLÍCITAMENTE habilitada
   * — postura defensiva para gasto/seguridad. Si la env falta, la tool
   * queda apagada y el orquestador lo ignora silenciosamente.
   */
  isToolEnabled(toolName: string): boolean {
    const normalized = toolName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_');
    const key = `AI_TOOL_${normalized}_ENABLED`;
    const enabled = this.bool(key, false);
    if (!enabled) {
      this.logger.debug(`Tool "${toolName}" deshabilitada (env ${key})`);
    }
    return enabled;
  }

  /** Versión del system prompt activo. */
  promptVersion(): string {
    return this.config.get<string>('AI_PROMPT_VERSION') || 'v1';
  }
}
