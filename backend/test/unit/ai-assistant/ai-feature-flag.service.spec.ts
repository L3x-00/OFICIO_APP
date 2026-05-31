/**
 * UNIT — AiFeatureFlagService (kill-switch por tool, regla 8).
 *
 * ConfigService (env) mockeado. Verificamos que el kill-switch controla
 * qué tools se exponen, y la normalización del nombre de tool a env var.
 *
 *   • AI_TOOL_SEARCH_PROVIDERS_ENABLED=false → isToolEnabled = false.
 *   • =true  → isToolEnabled = true (valida normalización del nombre).
 *   • ausente → false (default seguro, opt-in explícito).
 */
import type { ConfigService } from '@nestjs/config';
import { AiFeatureFlagService } from '../../../src/ai-assistant/ai-feature-flag.service.js';

/** ConfigService mock: get(key) devuelve el valor del env simulado. */
function makeConfig(env: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
}

describe('AiFeatureFlagService (unit, ConfigService mockeado)', () => {
  it('Test 1: AI_TOOL_SEARCH_PROVIDERS_ENABLED=false → isToolEnabled("search_providers") = false', () => {
    const service = new AiFeatureFlagService(
      makeConfig({ AI_TOOL_SEARCH_PROVIDERS_ENABLED: 'false' }),
    );
    expect(service.isToolEnabled('search_providers')).toBe(false);
  });

  it('=true → habilita (normaliza search_providers → AI_TOOL_SEARCH_PROVIDERS_ENABLED)', () => {
    const service = new AiFeatureFlagService(
      makeConfig({ AI_TOOL_SEARCH_PROVIDERS_ENABLED: 'true' }),
    );
    expect(service.isToolEnabled('search_providers')).toBe(true);
  });

  it('env ausente → tool deshabilitada por default seguro (false)', () => {
    const service = new AiFeatureFlagService(makeConfig({}));
    expect(service.isToolEnabled('search_providers')).toBe(false);
  });
});
