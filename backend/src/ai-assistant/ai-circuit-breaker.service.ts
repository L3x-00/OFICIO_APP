import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as Sentry from '@sentry/nestjs';
import { CircuitState } from './ai-assistant.types.js';
import {
  ANALYTICS_COUNTER_TTL_MS,
  CB_FAILURE_THRESHOLD,
  CB_OPEN_DURATION_MS,
  CB_FAILS_KEY,
  CB_OPENED_AT_KEY,
  CB_STATE_KEY,
  breakerOpensKey,
  peruDayKey,
} from './ai-assistant.constants.js';

/** Estado del breaker para el panel de observabilidad (Fase 8). */
export interface CircuitStatus {
  state: CircuitState;
  fails: number;
  openedAt: number | null;
  isOpen: boolean;
}

/**
 * Circuit Breaker para Gemini (regla 7).
 *
 * Estado en Redis para que funcione entre reinicios y entre instancias
 * del clúster (Render puede escalar a >1 worker). Lógica clásica de 3
 * estados:
 *
 *   CLOSED     → todo pasa. Cada fallo incrementa el contador.
 *   OPEN       → 5 fallos consecutivos → abierto 5 min. Todo se rechaza
 *                con error controlado (no se llama a Gemini → no se gasta).
 *   HALF_OPEN  → pasados los 5 min, deja pasar UNA petición de prueba.
 *                Si esa funciona → CLOSED. Si falla → OPEN otra vez.
 *
 * Resiliencia: si Redis cae, `canRequest()` devuelve `allowed: true`
 * (fail-open) — preferimos intentar Gemini a bloquear toda la IA por un
 * problema de cache. Los contadores simplemente no persisten.
 */
@Injectable()
export class AiCircuitBreakerService {
  private readonly logger = new Logger(AiCircuitBreakerService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * ¿Se permite llamar a Gemini ahora? Devuelve el estado resultante
   * para que el caller lo loguee. Transiciona OPEN→HALF_OPEN cuando
   * vence la ventana.
   */
  async canRequest(): Promise<{ allowed: boolean; state: CircuitState }> {
    try {
      const state =
        (await this.cache.get<CircuitState>(CB_STATE_KEY)) ??
        CircuitState.CLOSED;

      if (state !== CircuitState.OPEN) {
        return { allowed: true, state };
      }

      // OPEN: ¿venció la ventana de 5 min?
      const openedAt = (await this.cache.get<number>(CB_OPENED_AT_KEY)) ?? 0;
      const elapsed = Date.now() - openedAt;
      if (elapsed >= CB_OPEN_DURATION_MS) {
        // Pasamos a HALF_OPEN — dejamos pasar una petición de prueba.
        await this.cache.set(CB_STATE_KEY, CircuitState.HALF_OPEN);
        this.logger.warn('Circuit breaker → HALF_OPEN (probe permitido)');
        return { allowed: true, state: CircuitState.HALF_OPEN };
      }

      // Sigue abierto.
      return { allowed: false, state: CircuitState.OPEN };
    } catch (e) {
      // Redis no disponible → fail-open. No bloqueamos la IA por cache.
      this.logger.warn(
        `CB canRequest: Redis no disponible, fail-open — ${(e as Error)?.message ?? e}`,
      );
      return { allowed: true, state: CircuitState.CLOSED };
    }
  }

  /** Llamada exitosa a Gemini → resetea el breaker a CLOSED. */
  async recordSuccess(): Promise<void> {
    try {
      await Promise.all([
        this.cache.set(CB_STATE_KEY, CircuitState.CLOSED),
        this.cache.set(CB_FAILS_KEY, 0),
      ]);
    } catch {
      // Silencioso — un fallo al persistir el éxito no es crítico.
    }
  }

  /**
   * Llamada fallida a Gemini. Incrementa el contador; al llegar al
   * umbral abre el circuito y reporta a Sentry. En HALF_OPEN, cualquier
   * fallo re-abre inmediatamente.
   */
  async recordFailure(err?: unknown): Promise<void> {
    try {
      const state =
        (await this.cache.get<CircuitState>(CB_STATE_KEY)) ??
        CircuitState.CLOSED;

      // Un fallo durante el probe de HALF_OPEN re-abre de inmediato.
      if (state === CircuitState.HALF_OPEN) {
        await this.open(err, 'fallo durante HALF_OPEN probe');
        return;
      }

      const fails = ((await this.cache.get<number>(CB_FAILS_KEY)) ?? 0) + 1;
      await this.cache.set(CB_FAILS_KEY, fails);

      if (fails >= CB_FAILURE_THRESHOLD) {
        await this.open(err, `${fails} fallos consecutivos`);
      }
    } catch (e) {
      this.logger.warn(
        `CB recordFailure: Redis no disponible — ${(e as Error)?.message ?? e}`,
      );
    }
  }

  /** Abre el circuito + reporta a Sentry. */
  private async open(err: unknown, reason: string): Promise<void> {
    await Promise.all([
      this.cache.set(CB_STATE_KEY, CircuitState.OPEN),
      this.cache.set(CB_OPENED_AT_KEY, Date.now()),
    ]);
    await this.bumpOpensCounter();
    this.logger.error(`Circuit breaker → OPEN (${reason})`);
    Sentry.captureMessage(`[AI] Circuit breaker OPEN: ${reason}`, {
      level: 'error',
      extra: {
        reason,
        error:
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : JSON.stringify(err ?? null),
      },
    });
  }

  /** Incrementa el contador diario de aperturas (observabilidad, Fase 8). */
  private async bumpOpensCounter(): Promise<void> {
    try {
      const key = breakerOpensKey(peruDayKey());
      const current = (await this.cache.get<number>(key)) ?? 0;
      await this.cache.set(key, current + 1, ANALYTICS_COUNTER_TTL_MS);
    } catch {
      // Métrica best-effort — nunca afecta la lógica del breaker.
    }
  }

  /**
   * Estado actual del breaker para el panel admin (Fase 8). Read-only;
   * fail-safe a CLOSED si Redis no responde.
   */
  async getStatus(): Promise<CircuitStatus> {
    try {
      const [state, fails, openedAt] = await Promise.all([
        this.cache.get<CircuitState>(CB_STATE_KEY),
        this.cache.get<number>(CB_FAILS_KEY),
        this.cache.get<number>(CB_OPENED_AT_KEY),
      ]);
      const s = state ?? CircuitState.CLOSED;
      return {
        state: s,
        fails: fails ?? 0,
        openedAt: openedAt ?? null,
        isOpen: s === CircuitState.OPEN,
      };
    } catch {
      return {
        state: CircuitState.CLOSED,
        fails: 0,
        openedAt: null,
        isOpen: false,
      };
    }
  }
}
