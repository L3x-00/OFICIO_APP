/**
 * UNIT — tool-registry (buildActiveTools).
 *
 * Filtra tools por (PERSONA ∩ kill-switch). Separa catálogos: invitado sin
 * tools, cliente solo búsqueda/monedas, proveedor solo negocio, admin solo
 * herramientas de plataforma. `@google/genai` se mockea porque las
 * declaraciones usan `Type.OBJECT` a nivel de módulo (ESM-only).
 */
jest.mock('@google/genai', () => ({
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
  },
}));

import { buildActiveTools } from '../../../src/ai-assistant/tools/tool-registry.js';
import { AiPersonaType } from '../../../src/ai-assistant/strategies/ai-context.strategy.js';

const allOn = { isToolEnabled: () => true };
const allOff = { isToolEnabled: () => false };

describe('tool-registry buildActiveTools (unit, por persona)', () => {
  it('GUEST → sin tools (tools undefined, activeNames vacío)', () => {
    const { tools, activeNames } = buildActiveTools(AiPersonaType.GUEST, allOn);
    expect(tools).toBeUndefined();
    expect(activeNames.size).toBe(0);
  });

  it('CLIENT → solo búsqueda + monedas; NO tools de negocio ni admin', () => {
    const { tools, activeNames } = buildActiveTools(
      AiPersonaType.CLIENT,
      allOn,
    );
    expect(tools).toBeDefined();
    expect(activeNames.has('search_providers')).toBe(true);
    expect(activeNames.has('search_categories')).toBe(true);
    expect(activeNames.has('get_user_coins')).toBe(true);
    expect(activeNames.has('explain_feature')).toBe(true);
    // No negocio:
    expect(activeNames.has('get_provider_stats')).toBe(false);
    expect(activeNames.has('get_subscription_status')).toBe(false);
    expect(activeNames.has('get_my_context')).toBe(false);
    // No admin:
    expect(activeNames.has('get_platform_stats')).toBe(false);
  });

  it('PROVIDER → solo tools de negocio; NO búsqueda de servicios ni monedas', () => {
    const { activeNames } = buildActiveTools(AiPersonaType.PROVIDER, allOn);
    expect(activeNames.has('get_provider_stats')).toBe(true);
    expect(activeNames.has('get_my_context')).toBe(true);
    expect(activeNames.has('get_subscription_status')).toBe(true);
    expect(activeNames.has('recommend_actions')).toBe(true);
    // No cliente:
    expect(activeNames.has('search_providers')).toBe(false);
    expect(activeNames.has('get_user_coins')).toBe(false);
    // No admin:
    expect(activeNames.has('get_pending_approvals')).toBe(false);
  });

  it('ADMIN → solo tools de plataforma; NO búsqueda ni stats de proveedor', () => {
    const { activeNames } = buildActiveTools(AiPersonaType.ADMIN, allOn);
    expect(activeNames.has('get_platform_stats')).toBe(true);
    expect(activeNames.has('get_top_providers')).toBe(true);
    expect(activeNames.has('get_pending_approvals')).toBe(true);
    // No cliente / proveedor:
    expect(activeNames.has('search_providers')).toBe(false);
    expect(activeNames.has('get_provider_stats')).toBe(false);
  });

  it('kill-switch OFF (cualquier persona) → tools undefined, activeNames vacío', () => {
    const { tools, activeNames } = buildActiveTools(
      AiPersonaType.CLIENT,
      allOff,
    );
    expect(tools).toBeUndefined();
    expect(activeNames.size).toBe(0);
  });

  it('kill-switch selectivo: CLIENT con search_providers OFF → omite esa, deja get_user_coins', () => {
    const flags = { isToolEnabled: (n: string) => n !== 'search_providers' };
    const { activeNames } = buildActiveTools(AiPersonaType.CLIENT, flags);
    expect(activeNames.has('search_providers')).toBe(false); // matada por kill-switch
    expect(activeNames.has('get_user_coins')).toBe(true); // sigue activa
  });
});
