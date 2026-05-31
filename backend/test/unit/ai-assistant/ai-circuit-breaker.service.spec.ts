/**
 * UNIT — AiCircuitBreakerService (regla 7).
 *
 * Redis (CACHE_MANAGER) mockeado con un Map en memoria → las
 * transiciones de estado son deterministas. Sentry mockeado para no
 * disparar reportes reales. Tiempo controlado con fake timers para la
 * ventana de 5 min (OPEN → HALF_OPEN).
 *
 *   • 4 fallos        → CLOSED (permite request).
 *   • 5º fallo        → OPEN (bloquea la siguiente).
 *   • +5 min (mock)   → HALF_OPEN (permite 1 probe).
 */
jest.mock('@sentry/nestjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

import type { Cache } from 'cache-manager';
import { AiCircuitBreakerService } from '../../../src/ai-assistant/ai-circuit-breaker.service.js';
import { CircuitState } from '../../../src/ai-assistant/ai-assistant.types.js';
import { CB_OPEN_DURATION_MS } from '../../../src/ai-assistant/ai-assistant.constants.js';

/** Cache mock respaldado por un Map → get/set se comportan como Redis real. */
function makeCacheMock(): { cache: Cache; store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  const cache = {
    get: jest.fn((k: string) => Promise.resolve(store.get(k))),
    set: jest.fn((k: string, v: unknown) => {
      store.set(k, v);
      return Promise.resolve();
    }),
  } as unknown as Cache;
  return { cache, store };
}

describe('AiCircuitBreakerService (unit, Redis mockeado)', () => {
  let service: AiCircuitBreakerService;

  beforeEach(() => {
    service = new AiCircuitBreakerService(makeCacheMock().cache);
  });

  it('Test 1: 4 fallos consecutivos → sigue CLOSED y permite request', async () => {
    for (let i = 0; i < 4; i++) {
      await service.recordFailure(new Error('gemini fail'));
    }
    const r = await service.canRequest();
    expect(r.state).toBe(CircuitState.CLOSED);
    expect(r.allowed).toBe(true);
  });

  it('Test 2: 5º fallo → OPEN y bloquea la siguiente llamada', async () => {
    for (let i = 0; i < 5; i++) {
      await service.recordFailure(new Error('gemini fail'));
    }
    const r = await service.canRequest();
    expect(r.state).toBe(CircuitState.OPEN);
    expect(r.allowed).toBe(false);
  });

  it('Test 3: tras 5 minutos → HALF_OPEN y permite 1 probe', async () => {
    // T0 en ms (número), calculado ANTES de fakear timers para evitar el
    // problema de `setSystemTime(Date)` con el FakeDate global.
    const t0 = Date.UTC(2026, 0, 1);
    jest.useFakeTimers();
    try {
      jest.setSystemTime(t0);

      for (let i = 0; i < 5; i++) {
        await service.recordFailure(new Error('fail'));
      }
      // Recién abierto → bloquea.
      expect((await service.canRequest()).allowed).toBe(false);

      // Avanzar la ventana completa de 5 min + 1 ms.
      jest.setSystemTime(t0 + CB_OPEN_DURATION_MS + 1);

      const r = await service.canRequest();
      expect(r.state).toBe(CircuitState.HALF_OPEN);
      expect(r.allowed).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
