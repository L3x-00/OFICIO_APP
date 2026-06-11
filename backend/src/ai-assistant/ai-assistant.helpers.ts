import { createHash } from 'node:crypto';
import type {
  ProviderCardDto,
  PlatformStatsDto,
  TopProviderDto,
  PendingApprovalsDto,
} from './ai-data-access.service.js';
import type { AiIntent } from './ai-assistant.types.js';
import {
  AI_QUERY_STOPWORDS,
  FAQ_KEYWORDS,
  FINANCIAL_KEYWORDS,
  RESP_CACHE_PREFIX,
  SEARCH_KEYWORDS,
} from './ai-assistant.constants.js';

/**
 * Helpers PUROS del orquestador de "Ofi" — extraídos de
 * `ai-assistant.service.ts` (refactor de mantenibilidad, cero cambios
 * funcionales). Ninguna función toca estado, Redis ni la BD; el flujo de
 * guardrails/cuotas permanece intacto en el servicio.
 */

/**
 * Métricas administrativas que el router determinístico resuelve sin IA,
 * mapeadas 1:1 con las tools admin (`get_platform_stats`, etc.).
 */
export type AdminMetric =
  | 'platform_stats'
  | 'pending_approvals'
  | 'top_providers';

const STOPWORDS = new Set<string>(AI_QUERY_STOPWORDS);

// ── Clasificación / caché semántico ───────────────────────────

/**
 * Clasifica la intención por palabras clave para decidir la política de
 * caché. Prioridad: FINANCIAL (bypass) → SEARCH (5 min) → FAQ (24 h) →
 * other (no cachea).
 */
export function classifyIntent(message: string): AiIntent {
  const m = message.toLowerCase();
  const has = (kw: readonly string[]): boolean => kw.some((k) => m.includes(k));

  if (has(FINANCIAL_KEYWORDS)) return 'financial';
  if (has(SEARCH_KEYWORDS)) return 'search';
  if (has(FAQ_KEYWORDS)) return 'faq';
  return 'other';
}

/** Minúsculas + sin acentos + espacios colapsados (match robusto). */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Singulariza plurales del dominio (vocal+'s'): electricistas → electricista. */
export function singularize(t: string): string {
  return t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t;
}

/**
 * Forma canónica para el caché semántico: normaliza (minúsculas, sin
 * acentos), tokeniza, descarta stopwords de consulta, singulariza plurales
 * comunes y ordena los tokens. El orden de palabras y los plurales dejan de
 * importar → "busco un electricista" ≡ "electricistas".
 */
export function semanticCanonical(message: string): string {
  const tokens = normalizeText(message)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .map((t) => singularize(t))
    .filter((t) => t.length > 0);
  return Array.from(new Set(tokens)).sort().join(' ');
}

/**
 * Clave de caché SEMÁNTICA: prefijo + versión + rol + hash de la forma
 * CANÓNICA del mensaje. Consultas equivalentes ("electricista en Huancayo",
 * "electricistas en Huancayo", "busco un electricista en Huancayo") colapsan
 * a la misma clave → reutilizan la respuesta cacheada.
 */
export function respCacheKey(
  version: string,
  role: string,
  message: string,
): string {
  const canonical = semanticCanonical(message);
  const hash = createHash('sha1').update(canonical).digest('hex');
  return `${RESP_CACHE_PREFIX}${version}:${role}:${hash}`;
}

// ── Tools / proveedores ───────────────────────────────────────

/** Coerción segura de un arg desconocido a string no vacío. */
export function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * Si la tool ejecutada fue `search_providers`, acumula sus proveedores en
 * `sink` (para exponerlos al CLIENTE como tarjetas) y devuelve una copia
 * SIN datos de contacto para que la vea el MODELO — preservando la barrera
 * de privacidad de la Regla 2 (el modelo nunca recibe teléfonos). Para
 * cualquier otra tool, devuelve el resultado intacto.
 */
export function captureSearchProviders(
  name: string | undefined,
  result: Record<string, unknown>,
  sink: ProviderCardDto[],
): Record<string, unknown> {
  if (name !== 'search_providers') return result;
  const providers = result.providers;
  if (!Array.isArray(providers)) return result;

  sink.push(...(providers as ProviderCardDto[]));

  const modelSafe = (providers as ProviderCardDto[]).map((p) => {
    const clone: Partial<ProviderCardDto> = { ...p };
    delete clone.phone;
    delete clone.whatsapp;
    return clone;
  });
  return { providers: modelSafe };
}

/** Deduplica proveedores por id conservando el orden (ranking del query). */
export function dedupeProviders(list: ProviderCardDto[]): ProviderCardDto[] {
  const seen = new Set<number>();
  const out: ProviderCardDto[] = [];
  for (const p of list) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

// ── Router determinístico de métricas admin (sin IA) ──────────

/**
 * Clasifica el mensaje contra las métricas admin conocidas. Devuelve la
 * métrica si hay match claro, o null para delegar en la IA. El orden va de
 * lo más específico (ranking) a lo más general (KPIs).
 */
export function matchAdminMetric(message: string): AdminMetric | null {
  const m = normalizeText(message);
  if (m.length === 0) return null;
  const has = (...kw: string[]): boolean => kw.some((k) => m.includes(k));

  // 1) Ranking / movimiento de proveedores.
  if (
    (has('top', 'mejor', 'destacad', 'ranking') &&
      has('proveedor', 'negocio')) ||
    has(
      'mas movimiento',
      'mayor movimiento',
      'mas trafico',
      'mas activ',
      'mas visto',
      'mas contactad',
    )
  ) {
    return 'top_providers';
  }

  // 2) Colas de aprobación / moderación.
  if (
    has(
      'aprobacion',
      'por aprobar',
      'falta aprobar',
      'falta revisar',
      'falta verificar',
      'por verificar',
      'verificaciones pendientes',
      'moderar',
      'moderacion',
      'cola de',
      'en cola',
      'solicitudes pendientes',
      'validaciones pendientes',
    ) ||
    (has('pendiente') &&
      has('aprob', 'solicitud', 'verific', 'moder', 'cola', 'revisar', 'trust'))
  ) {
    return 'pending_approvals';
  }

  // 3) KPIs de plataforma (usuarios, proveedores, registros, ingresos).
  if (
    has(
      'cuantos usuario',
      'cuantas usuario',
      'cantidad de usuario',
      'numero de usuario',
      'total de usuario',
      'usuarios registrado',
      'cuantos proveedor',
      'cantidad de proveedor',
      'numero de proveedor',
      'total de proveedor',
      'proveedores activo',
      'proveedores aprobado',
      'proveedores registrado',
      'cuantos negocio',
      'cuantos registro',
      'registros nuevo',
      'nuevos registro',
      'crecimiento',
      'ingreso',
      'facturacion',
      'cuanto factur',
      'metricas',
      'estadisticas',
      'kpi',
      'estado de la plataforma',
      'estado general',
    ) ||
    m === 'usuarios' ||
    m === 'proveedores' ||
    m === 'proveedores activos' ||
    m === 'cantidad de usuarios' ||
    m === 'cantidad de proveedores'
  ) {
    return 'platform_stats';
  }

  return null;
}

/** OFICIO → 'Profesional', NEGOCIO → 'Negocio'. */
export function providerTypeLabel(type: string): string {
  return type === 'NEGOCIO' ? 'Negocio' : 'Profesional';
}

export function formatPlatformStats(s: PlatformStatsDto): string {
  const trend =
    s.newUsersThisWeek > s.newUsersLastWeek
      ? '📈 en alza'
      : s.newUsersThisWeek < s.newUsersLastWeek
        ? '📉 a la baja'
        : 'estable';
  const revenue = Number(s.monthlyRevenue).toFixed(2);
  return [
    '**📊 Estado de la plataforma** _(en tiempo real, sin IA)_',
    '',
    `- **Usuarios:** ${s.totalUsers} · hoy +${s.newUsersToday} · últimos 7 días +${s.newUsersThisWeek} (semana previa ${s.newUsersLastWeek}, ${trend})`,
    `- **Proveedores:** ${s.totalProviders} · ${s.approvedProviders} aprobados · ${s.pendingProviders} pendientes`,
    `- **Ingresos del mes:** S/ ${revenue}`,
  ].join('\n');
}

export function formatPendingApprovals(p: PendingApprovalsDto): string {
  if (p.totalProviders === 0 && p.totalTrustValidations === 0) {
    return '✅ **No hay nada pendiente.** Todas las aprobaciones y validaciones están al día.';
  }
  const lines = [
    '**🗂️ Aprobaciones pendientes** _(en tiempo real, sin IA)_',
    '',
    `- **Proveedores por verificar:** ${p.totalProviders}`,
    `- **Validaciones de confianza:** ${p.totalTrustValidations}`,
  ];
  if (p.providers.length > 0) {
    lines.push('', '_Proveedores más antiguos en cola:_');
    for (const it of p.providers) {
      lines.push(
        `- ${it.businessName} (${providerTypeLabel(it.type)}) — desde ${it.since}`,
      );
    }
  }
  return lines.join('\n');
}

export function formatTopProviders(list: TopProviderDto[]): string {
  if (list.length === 0) {
    return 'Aún no hay datos de movimiento de proveedores para rankear.';
  }
  const lines = [
    '**🏆 Proveedores con más movimiento** _(en tiempo real, sin IA)_',
    '',
  ];
  list.forEach((p, i) => {
    const mov = p.movement > 0 ? ` · ${p.movement} interacciones` : '';
    lines.push(
      `${i + 1}. **${p.businessName}** (${providerTypeLabel(p.type)}) — ⭐ ${p.averageRating.toFixed(1)} (${p.totalReviews} reseñas)${mov}`,
    );
  });
  return lines.join('\n');
}

// ── Detección de errores Gemini (fallback a OpenRouter) ───────

/**
 * true si el error de Gemini corresponde a saturación (503/UNAVAILABLE)
 * para responder con un mensaje específico en vez del genérico.
 */
export function isGeminiOverloaded(err: unknown): boolean {
  const e = err as { status?: unknown; code?: unknown };
  if (e?.status === 503 || e?.code === 503 || e?.status === 'UNAVAILABLE') {
    return true;
  }
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('high demand')
  );
}

/**
 * Decide si un fallo de Gemini es TRANSITORIO y, por tanto, candidato a
 * reintentar con OpenRouter. Cubre: quota/rate-limit (HTTP 429,
 * RESOURCE_EXHAUSTED), saturación (503/UNAVAILABLE/overloaded), timeout
 * (>15s → "Gemini timeout") y cortes de red (ECONNRESET/ETIMEDOUT/5xx).
 *
 * NO incluye errores de configuración/programación (4xx ≠ 429), que
 * reintentar no arreglaría.
 */
export function shouldFallback(err: unknown): boolean {
  if (isGeminiOverloaded(err)) return true;

  const e = err as { status?: unknown; code?: unknown };
  const status = e?.status ?? e?.code;
  if (status === 429 || status === 500 || status === 503) return true;
  if (
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'UNAVAILABLE' ||
    status === 'ECONNRESET' ||
    status === 'ETIMEDOUT'
  ) {
    return true;
  }

  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('rate-limit') ||
    msg.includes('ratelimit') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('socket hang up')
  );
}

// ── Tiempo ────────────────────────────────────────────────────

/** Segundos hasta la próxima medianoche de Perú (UTC-5). Mínimo 60. */
export function secondsUntilPeruMidnight(): number {
  const offsetMs = 5 * 60 * 60 * 1000; // UTC-5
  const nowPeru = Date.now() - offsetMs;
  const dayMs = 24 * 60 * 60 * 1000;
  const sinceMidnight = ((nowPeru % dayMs) + dayMs) % dayMs;
  const remainingMs = dayMs - sinceMidnight;
  return Math.max(60, Math.ceil(remainingMs / 1000));
}
