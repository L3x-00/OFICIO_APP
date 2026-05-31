/**
 * INTEGRATION — Race condition de cuotas (Redis REAL, concurrencia real).
 *
 * Valida que el control de costos usa INCR atómico server-side: bajo N
 * requests concurrentes el contador termina EXACTO (sin pérdidas) y el
 * límite se respeta. Si esto corriera con el patrón previo `get`→`set`, los
 * incrementos se perderían y el límite se podría exceder.
 *
 * Requiere Redis real (docker-compose, `redis_pass_2025`) — el harness lo
 * configura en setup-env. NO mockeamos nada aquí: es el punto del test.
 *
 *   A) 50 concurrentes  → contador = 50 exacto.
 *   B) 100 concurrentes → contador = 100 exacto.
 *   C) límite 20        → requests 21+ rechazadas (exacto 20 permitidas).
 *   D) sin pérdidas     → los counts forman 1..N (biyección, sin gaps/dups).
 */
import { AiQuotaService } from '../../../src/ai-assistant/ai-quota.service.js';

const TTL = 60_000;
const HIGH = 1_000_000; // límite "infinito" para tests de conteo puro.

let n = 0;
const uniqKey = () => `ai:test:quota:${Date.now()}:${n++}`;

describe('Quota race — contadores atómicos Redis (integration, Redis real)', () => {
  let quota: AiQuotaService;

  beforeAll(async () => {
    quota = new AiQuotaService();
    await quota.onModuleInit();
    // Este test EXIGE Redis real; si no hay, debe fallar claro (no silencioso).
    expect(quota.available).toBe(true);
  });

  afterAll(async () => {
    await quota.onModuleDestroy();
  });

  it('A) 50 requests concurrentes → contador final = 50 exacto', async () => {
    const key = uniqKey();
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        quota.incrementWithLimit(key, HIGH, TTL),
      ),
    );

    expect(await quota.peek(key)).toBe(50);
    // Todas permitidas y los counts son exactamente 1..50 (biyección).
    expect(results.every((r) => r.allowed)).toBe(true);
    const counts = results.map((r) => r.count).sort((a, b) => a - b);
    expect(counts).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));

    await quota.reset(key);
  });

  it('B) 100 requests concurrentes → contador final = 100 exacto', async () => {
    const key = uniqKey();
    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        quota.incrementWithLimit(key, HIGH, TTL),
      ),
    );

    expect(await quota.peek(key)).toBe(100);
    // Sin duplicados → ningún incremento se perdió ni se solapó.
    const unique = new Set(results.map((r) => r.count));
    expect(unique.size).toBe(100);

    await quota.reset(key);
  });

  it('C) límite diario = 20 → requests 21+ son rechazadas (exacto 20 permitidas)', async () => {
    const key = uniqKey();
    const results = await Promise.all(
      Array.from({ length: 30 }, () => quota.incrementWithLimit(key, 20, TTL)),
    );

    const allowed = results.filter((r) => r.allowed);
    const rejected = results.filter((r) => !r.allowed);
    expect(allowed.length).toBe(20); // exactamente el límite llega a Gemini
    expect(rejected.length).toBe(10);

    // Los permitidos son EXACTAMENTE los counts 1..20 (el gate es monótono).
    const allowedCounts = allowed.map((r) => r.count).sort((a, b) => a - b);
    expect(allowedCounts).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    // Los rechazados son 21..30.
    const rejectedCounts = rejected.map((r) => r.count).sort((a, b) => a - b);
    expect(rejectedCounts).toEqual(Array.from({ length: 10 }, (_, i) => i + 21));

    await quota.reset(key);
  });

  it('D) nunca hay pérdidas de incremento → counts == 1..N sin gaps ni duplicados', async () => {
    const key = uniqKey();
    const N = 200;
    const results = await Promise.all(
      Array.from({ length: N }, () => quota.incrementWithLimit(key, N, TTL)),
    );

    const counts = results.map((r) => r.count).sort((a, b) => a - b);
    expect(new Set(counts).size).toBe(N); // todos distintos (sin pérdidas)
    expect(counts[0]).toBe(1); // sin gaps por abajo
    expect(counts[N - 1]).toBe(N); // sin gaps por arriba
    expect(await quota.peek(key)).toBe(N); // contador coincide con #requests

    await quota.reset(key);
  });
});
