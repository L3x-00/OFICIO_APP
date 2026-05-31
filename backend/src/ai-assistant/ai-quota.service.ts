import {
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { redisStore } from 'cache-manager-redis-yet';

/** Subconjunto del cliente node-redis que usamos (evita acoplar tipos). */
interface RedisLike {
  incr(key: string): Promise<number>;
  pExpire(key: string, ms: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
  del(keys: string | string[]): Promise<number>;
  quit(): Promise<unknown>;
}

/**
 * Contadores de cuota ATÓMICOS sobre Redis (Fase de endurecimiento).
 *
 * Vive APARTE del `CACHE_MANAGER` de Nest a propósito:
 *
 *   1. El control de costos necesita atomicidad real. El patrón previo
 *      `get` → `set(+1)` NO es atómico: bajo concurrencia varias requests
 *      leen el mismo valor y todas pasan → se pierde el límite (overspend).
 *      Aquí cada consumo es un único `INCR` atómico server-side de Redis +
 *      `PEXPIRE` en el primer incremento (ventana diaria de Perú).
 *
 *   2. Conexión DEDICADA (node-redis vía cache-manager-redis-yet, ya en el
 *      stack — sin dependencia nueva). Es independiente del store del
 *      CacheModule, por lo que las cuotas quedan en un Redis real y
 *      compartido aunque el cache general use otro backend.
 *
 * Resiliente: si Redis no está disponible, FAIL-OPEN (allowed) — preferimos
 * servir a bloquear, igual que la lógica de cuotas previa.
 */
@Injectable()
export class AiQuotaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiQuotaService.name);
  private client: RedisLike | null = null;

  async onModuleInit(): Promise<void> {
    try {
      const store = await redisStore({
        socket: {
          host: process.env.REDIS_HOST,
          port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
          tls: process.env.REDIS_TLS === 'true',
        },
        password: process.env.REDIS_PASSWORD || undefined,
      });
      this.client = store.client as unknown as RedisLike;
      this.logger.log('AiQuotaService: contadores atómicos en Redis listos.');
    } catch (e) {
      this.client = null;
      this.logger.error(
        `AiQuotaService sin Redis (fail-open): ${(e as Error)?.message ?? e}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client?.quit();
    } catch {
      // cierre best-effort
    }
  }

  /** ¿Hay store atómico real disponible? (diagnóstico / tests). */
  get available(): boolean {
    return this.client != null;
  }

  /**
   * Incrementa el contador ATÓMICAMENTE y decide contra el límite.
   *
   * Patrón INCR-then-check: garantiza como máximo `limit` consumos exitosos
   * sin race. El TTL se fija SOLO en el primer incremento (count === 1) para
   * que la ventana arranque con la primera consulta del día. FAIL-OPEN si
   * Redis no responde.
   */
  async incrementWithLimit(
    key: string,
    limit: number,
    ttlMs: number,
  ): Promise<{ allowed: boolean; count: number }> {
    if (!this.client) return { allowed: true, count: 0 };
    try {
      const count = await this.client.incr(key);
      if (count === 1 && ttlMs > 0) {
        await this.client.pExpire(key, ttlMs);
      }
      return { allowed: count <= limit, count };
    } catch (e) {
      this.logger.warn(
        `incrementWithLimit fail-open (${key}): ${(e as Error)?.message ?? e}`,
      );
      return { allowed: true, count: 0 };
    }
  }

  /** Lectura read-only del contador (pre-check del controller / analítica). */
  async peek(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      const raw = await this.client.get(key);
      const n = raw != null ? Number.parseInt(raw, 10) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  /** Borra contadores (utilidad de limpieza / tests). Best-effort. */
  async reset(...keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) return;
    try {
      await this.client.del(keys);
    } catch {
      // best-effort
    }
  }
}
