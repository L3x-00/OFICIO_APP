/**
 * Constantes centrales de "Ofi" — el asistente IA de Servi.
 *
 * Todo valor mágico vive acá para auditoría y tuning sin cazar
 * literales por el código. El módulo es 100% aislado: si algo de esto
 * falla o se desactiva, el resto de Servi sigue operando.
 */

/** Modelo Gemini. Flash = barato + rápido, suficiente para asistente. */
export const AI_MODEL = 'gemini-2.5-flash';

/** Versión del system prompt — permite A/B y rollback vía env. */
export const DEFAULT_PROMPT_VERSION = 'v1';

/**
 * Versión activa del system prompt por defecto (regla 8). La env
 * `AI_PROMPT_VERSION` la sobrescribe en runtime vía AiFeatureFlagService;
 * esta constante es el fallback canónico cuando la env no está seteada.
 */
export const AI_PROMPT_VERSION = 'v1';

// ── Knowledge base (Fase 2) ─────────────────────────────────
/** Clave Redis del contexto de knowledge cacheado. */
export const KNOWLEDGE_CACHE_KEY = 'ai:knowledge:context';
/** TTL del cache de knowledge: 5 minutos (en ms — cache-manager v5+). */
export const KNOWLEDGE_CACHE_TTL_MS = 5 * 60 * 1000;

// ── Caché de respuestas + retención (Fase 4) ────────────────
/** Prefijo Redis de respuestas cacheadas del asistente. */
export const RESP_CACHE_PREFIX = 'ai:resp:';
/** TTL caché de respuestas FAQ (estables): 24 h. */
export const CACHE_TTL_FAQ_MS = 24 * 60 * 60 * 1000;
/** TTL caché de respuestas de búsqueda (volátiles): 5 min. */
export const CACHE_TTL_SEARCH_MS = 5 * 60 * 1000;
/** Días de retención de conversaciones IA antes de purgar (política). */
export const RETENTION_DAYS = 7;

/**
 * Clasificador de intención por palabras clave (Fase 4 — caché inteligente).
 *
 * Orden de prioridad al clasificar: FINANCIAL → SEARCH → FAQ → other.
 * Las consultas FINANCIERAS hacen BYPASS de la caché (siempre frescas);
 * FAQ cachea 24 h; SEARCH cachea 5 min; el resto no se cachea.
 */
export const FINANCIAL_KEYWORDS: readonly string[] = [
  'moneda',
  'saldo',
  'pago',
  'pagar',
  'pague',
  'suscrip',
  'plan',
  'factura',
  'cobro',
  'cobr',
  'precio',
  'tarifa',
  'dinero',
  'yape',
  'reembolso',
  'deuda',
  'vence',
  'vencimiento',
  'renov',
];

export const SEARCH_KEYWORDS: readonly string[] = [
  'busca',
  'buscar',
  'encuentra',
  'encontrar',
  'cerca',
  'cercan',
  'recomien',
  'proveedor',
  'gasfit',
  'electric',
  'peluqu',
  'restaur',
  'donde hay',
  'dónde hay',
  'necesito un',
  'quiero un',
];

export const FAQ_KEYWORDS: readonly string[] = [
  'que es',
  'qué es',
  'como',
  'cómo',
  'para que',
  'para qué',
  'explica',
  'ayuda',
  'funciona',
  'sirve',
  'puedo',
  'requisito',
];

// ── Límites de generación ───────────────────────────────────
export const GEN_TEMPERATURE = 0.4;
export const GEN_MAX_OUTPUT_TOKENS = 1024;

// ── Historial (regla 6: límite dual) ────────────────────────
export const HISTORY_MAX_MESSAGES = 10;
export const HISTORY_MAX_CHARS = 6000;

// ── Timeouts (regla 4) ──────────────────────────────────────
/** Timeout duro de cada Tool. */
export const TOOL_TIMEOUT_MS = 3000;
/** Timeout de la llamada a Gemini (no debe colgar el request HTTP). */
export const GEMINI_TIMEOUT_MS = 15000;

// ── Anti-loop de tools (regla 5) ────────────────────────────
export const MAX_TOOL_ROUNDS = 3;
/**
 * Respuesta forzada cuando el anti-loop corta el ciclo de function-calling
 * (Gemini intentó llamar tools > MAX_TOOL_ROUNDS veces). Pide reformular.
 */
export const FORCED_REPHRASE_MESSAGE =
  'No logré resolver tu consulta con la información disponible. ¿Puedes ' +
  'reformularla de forma más simple o específica?';

// ── Límites diarios por rol (regla 4) ───────────────────────
export const DAILY_LIMIT_BY_ROLE: Record<string, number> = {
  USUARIO: 20,
  PROVEEDOR: 50,
  ADMIN: 200,
};
export const DAILY_LIMIT_FALLBACK = 20;
/**
 * Presupuesto GLOBAL diario por defecto (Fase 5). La env
 * `AI_MAX_DAILY_REQUESTS` lo sobreescribe en runtime. Al superarse se
 * bloquea a TODOS los usuarios NO-ADMIN (los ADMIN quedan exentos).
 */
export const DEFAULT_GLOBAL_DAILY_LIMIT = 10000;

// ── Circuit breaker (regla 7) ───────────────────────────────
export const CB_FAILURE_THRESHOLD = 5;
export const CB_OPEN_DURATION_MS = 5 * 60 * 1000; // 5 min

// ── Claves de Redis ─────────────────────────────────────────
export const REDIS_PREFIX = 'ai:';
export const CB_STATE_KEY = `${REDIS_PREFIX}cb:state`;
export const CB_FAILS_KEY = `${REDIS_PREFIX}cb:fails`;
export const CB_OPENED_AT_KEY = `${REDIS_PREFIX}cb:openedAt`;

/** Clave Redis del contador diario POR USUARIO (Fase 5): `ai:daily:{userId}`. */
export const userDailyKey = (userId: number): string =>
  `${REDIS_PREFIX}daily:${userId}`;

/** Clave Redis del contador GLOBAL diario (Fase 5): `ai:daily:global_count`. */
export const GLOBAL_DAILY_KEY = `${REDIS_PREFIX}daily:global_count`;

// ── Sanitizer (regla: riskScore > umbral bloquea) ───────────
export const RISK_BLOCK_THRESHOLD = 0.8;

/** Placeholder con que el guardrail reemplaza PII detectada. */
export const PII_PLACEHOLDER = '[DATO PRIVADO]';

// ── Observabilidad / Analítica (Fase 8) ─────────────────────
/** Prefijo de contadores de analítica en Redis. */
export const ANALYTICS_PREFIX = `${REDIS_PREFIX}analytics:`;

/** Día YYYY-MM-DD en horario de Perú (UTC-5) — clave de contadores diarios. */
export const peruDayKey = (date: Date = new Date()): string =>
  new Date(date.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Contador diario de errores de Gemini. */
export const geminiErrorsKey = (day: string): string =>
  `${ANALYTICS_PREFIX}gemini_errors:${day}`;

/** Contador diario de aperturas del circuit breaker. */
export const breakerOpensKey = (day: string): string =>
  `${ANALYTICS_PREFIX}cb_opens:${day}`;

/** TTL de los contadores de analítica (8 días: "hoy" exacto + histórico corto). */
export const ANALYTICS_COUNTER_TTL_MS = 8 * 24 * 60 * 60 * 1000;

/** Costo estimado por millón de tokens (USD). Override por env AI_COST_PER_MTOK_USD. */
export const EST_COST_PER_MTOK_USD = 0.5;
