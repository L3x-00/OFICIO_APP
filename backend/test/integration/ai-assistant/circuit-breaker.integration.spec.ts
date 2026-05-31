/**
 * INTEGRATION — Circuit Breaker end-to-end con AiAssistantService.
 *
 * Breaker REAL (estado en cache in-memory, "mock de Redis"). Gemini y
 * Sentry mockeados (ESM `unstable_mockModule` + import dinámico). Sin DB:
 * conversación/data/knowledge mockeados — el foco es la coordinación
 * service↔breaker ante fallos de Gemini. NO se modifica lógica productiva.
 *
 *   1. 5 fallos → OPEN (+ evento Sentry).
 *   2. OPEN → bloquea (Gemini NO invocado, respuesta controlada).
 *   3. OPEN + 5min → HALF_OPEN (permite probe).
 *   4. HALF_OPEN + éxito → CLOSED, failCount 0.
 *   5. HALF_OPEN + fallo → OPEN.
 */
import { CircuitState } from '../../../src/ai-assistant/ai-assistant.types.js';
import {
  CB_STATE_KEY,
  CB_OPENED_AT_KEY,
  CB_FAILS_KEY,
  CB_OPEN_DURATION_MS,
} from '../../../src/ai-assistant/ai-assistant.constants.js';

// ── Mocks de Gemini + Sentry (antes del import dinámico) ───────────
const mockGenerateContent = jest.fn();
const sentryCapture = jest.fn();

(jest as any).unstable_mockModule('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  FunctionCallingConfigMode: { AUTO: 'AUTO' },
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
  },
}));
(jest as any).unstable_mockModule('@sentry/nestjs', () => ({
  captureMessage: sentryCapture,
  captureException: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
let AiAssistantService: any;
let AiCircuitBreakerService: any;
let AiSanitizerService: any;
let AiGuardrailsService: any;

const CALLER = { userId: 1, role: 'USUARIO' as const, providerType: null };

describe('Circuit Breaker e2e con AiAssistantService (integration)', () => {
  beforeAll(async () => {
    ({ AiAssistantService } = await import(
      '../../../src/ai-assistant/ai-assistant.service.js'
    ));
    ({ AiCircuitBreakerService } = await import(
      '../../../src/ai-assistant/ai-circuit-breaker.service.js'
    ));
    ({ AiSanitizerService } = await import(
      '../../../src/ai-assistant/ai-sanitizer.service.js'
    ));
    ({ AiGuardrailsService } = await import(
      '../../../src/ai-assistant/ai-guardrails.service.js'
    ));
  });

  beforeEach(() => {
    mockGenerateContent.mockReset();
    sentryCapture.mockReset();
  });

  /** Breaker REAL + cache Map; conversación/data/knowledge mockeados. */
  function build() {
    const store = new Map<string, unknown>();
    const cache = {
      get: async (k: string) => store.get(k),
      set: async (k: string, v: unknown) => {
        store.set(k, v);
      },
      del: async (k: string) => {
        store.delete(k);
      },
    };
    const config = {
      get: (k: string) => (k === 'GEMINI_API_KEY' ? 'test-key' : undefined),
    };
    const flags = {
      promptVersion: () => 'v1',
      isToolEnabled: () => false, // sin tools → Gemini se llama 1 vez por chat
      isEnabledForRole: () => true,
    };
    const knowledge = { getKnowledgeContext: async () => '' };
    const conversations = {
      getOrCreate: async () => 1,
      recoverHistory: async () => [],
      saveMessage: async () => {},
    };
    const data = {};

    const breaker = new AiCircuitBreakerService(cache as any);
    const service = new AiAssistantService(
      config as any,
      flags as any,
      breaker,
      new AiSanitizerService(),
      new AiGuardrailsService(),
      knowledge as any,
      data as any,
      conversations as any,
      cache as any,
    );
    return { service, breaker, store, cache };
  }

  it('Case 1: 5 fallos consecutivos de Gemini → OPEN + evento Sentry', async () => {
    const { service, breaker } = build();
    mockGenerateContent.mockRejectedValue(new Error('gemini down'));

    for (let i = 0; i < 5; i++) {
      await service.chat(CALLER, 'hola');
    }

    const status = await breaker.getStatus();
    expect(status.state).toBe(CircuitState.OPEN);
    expect(status.isOpen).toBe(true);
    expect(mockGenerateContent).toHaveBeenCalledTimes(5);
    expect(sentryCapture).toHaveBeenCalled(); // evento de apertura registrado
  });

  it('Case 2: breaker OPEN → bloquea, Gemini NO invocado, respuesta controlada', async () => {
    const { service, breaker, store } = build();
    store.set(CB_STATE_KEY, CircuitState.OPEN);
    store.set(CB_OPENED_AT_KEY, Date.now()); // recién abierto (no expirado)
    const canReqSpy = jest.spyOn(breaker, 'canRequest');
    mockGenerateContent.mockResolvedValue({
      text: 'no debería llegar',
      functionCalls: undefined,
      usageMetadata: { totalTokenCount: 1 },
    });

    const result = await service.chat(CALLER, 'hola');

    expect(canReqSpy).toHaveBeenCalled(); // se consultó el breaker
    expect(mockGenerateContent).not.toHaveBeenCalled(); // Gemini NO invocado
    expect(result.meta.blocked).toBe(true);
    expect(result.meta.reason).toBe('circuit'); // respuesta controlada
  });

  it('Case 3: OPEN + 5 min transcurridos → HALF_OPEN y permite probe', async () => {
    const { breaker, store } = build();
    store.set(CB_STATE_KEY, CircuitState.OPEN);
    store.set(CB_OPENED_AT_KEY, Date.now() - CB_OPEN_DURATION_MS - 1); // expirado

    const r = await breaker.canRequest();

    expect(r.state).toBe(CircuitState.HALF_OPEN);
    expect(r.allowed).toBe(true);
    // La transición se persistió → la próxima ya no re-evalúa la ventana.
    expect(store.get(CB_STATE_KEY)).toBe(CircuitState.HALF_OPEN);
  });

  it('Case 4: HALF_OPEN + probe exitoso → CLOSED y failCount 0', async () => {
    const { service, breaker, store } = build();
    store.set(CB_STATE_KEY, CircuitState.HALF_OPEN);
    store.set(CB_FAILS_KEY, 4);
    mockGenerateContent.mockResolvedValue({
      text: 'respuesta ok',
      functionCalls: undefined,
      usageMetadata: { totalTokenCount: 3 },
    });

    const result = await service.chat(CALLER, 'hola');
    const status = await breaker.getStatus();

    expect(result.meta.blocked).toBe(false);
    expect(status.state).toBe(CircuitState.CLOSED);
    expect(status.fails).toBe(0);
  });

  it('Case 5: HALF_OPEN + probe falla → OPEN (recaída)', async () => {
    const { service, breaker, store } = build();
    store.set(CB_STATE_KEY, CircuitState.HALF_OPEN);
    mockGenerateContent.mockRejectedValue(new Error('still down'));

    await service.chat(CALLER, 'hola');
    const status = await breaker.getStatus();

    expect(status.state).toBe(CircuitState.OPEN);
  });
});
