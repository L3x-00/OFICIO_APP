/**
 * UNIT — tool-registry (buildActiveTools).
 *
 * Filtra tools por (rol ∩ kill-switch). `@google/genai` se mockea porque
 * las declaraciones usan `Type.OBJECT` a nivel de módulo (y el paquete es
 * ESM-only → no carga en el runner CJS sin mock).
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
import type { AiCaller } from '../../../src/ai-assistant/ai-assistant.types.js';

const allOn = { isToolEnabled: () => true };
const allOff = { isToolEnabled: () => false };

describe('tool-registry buildActiveTools (unit)', () => {
  it('Test 1: USUARIO + kill-switch OFF → incluye tools de usuario, omite las de provider', () => {
    const caller: AiCaller = { userId: 1, role: 'USUARIO' };
    const { tools, activeNames } = buildActiveTools(caller, allOn);

    expect(tools).toBeDefined();
    // Comunes + de cuenta (USUARIO):
    expect(activeNames.has('search_providers')).toBe(true);
    expect(activeNames.has('get_user_coins')).toBe(true);
    // Exclusivas de PROVEEDOR → omitidas para USUARIO:
    expect(activeNames.has('get_provider_stats')).toBe(false);
    expect(activeNames.has('get_subscription_status')).toBe(false);
  });

  it('Test 2: PROVEEDOR + kill-switch de search_providers ON → omite esa, incluye get_provider_stats', () => {
    const flags = { isToolEnabled: (name: string) => name !== 'search_providers' };
    const caller: AiCaller = { userId: 2, role: 'PROVEEDOR' };
    const { activeNames } = buildActiveTools(caller, flags);

    expect(activeNames.has('search_providers')).toBe(false); // matada por kill-switch
    expect(activeNames.has('get_provider_stats')).toBe(true); // provider, habilitada
    expect(activeNames.has('get_user_coins')).toBe(true); // de cuenta, PROVEEDOR sí
  });

  it('Test 3: todas las tools apagadas → tools undefined, activeNames vacío', () => {
    const caller: AiCaller = { userId: 1, role: 'ADMIN' };
    const { tools, activeNames } = buildActiveTools(caller, allOff);

    expect(tools).toBeUndefined();
    expect(activeNames.size).toBe(0);
  });
});
