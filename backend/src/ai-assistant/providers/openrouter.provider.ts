import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Tool } from '@google/genai';
import type { AiHistoryTurn } from '../ai-assistant.types.js';
import {
  FORCED_REPHRASE_MESSAGE,
  GEN_MAX_OUTPUT_TOKENS,
  GEN_TEMPERATURE,
  MAX_TOOL_ROUNDS,
  OPENROUTER_BASE_URL,
  OPENROUTER_TIMEOUT_MS,
} from '../ai-assistant.constants.js';

/** Una tool call que el modelo pide ejecutar (forma neutral al proveedor). */
export interface OpenRouterToolCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Callback que EJECUTA una tool. La inyecta el orquestador para reutilizar
 * EXACTAMENTE el mismo `executeTool` (permisos, anti-IDOR, data-access,
 * timeouts) que usa Gemini — el proveedor nunca toca Prisma ni el registry.
 */
export type OpenRouterRunTool = (
  call: OpenRouterToolCall,
) => Promise<Record<string, unknown>>;

/** Entrada de `generate` — mismo material que arma `callGemini`. */
export interface OpenRouterGenerateParams {
  systemInstruction: string;
  history: AiHistoryTurn[];
  userMessage: string;
  /** Tools en formato Gemini (`buildActiveTools`); se convierten a OpenAI. */
  tools: Tool[] | undefined;
  runTool: OpenRouterRunTool;
}

export interface OpenRouterResult {
  reply: string;
  tokensUsed: number | null;
  /** Modelo que finalmente respondió (DeepSeek o Qwen). */
  model: string;
}

// ── Tipos OpenAI-compatibles (subset que usamos) ───────────────
interface OpenAiFunctionDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
interface OpenAiTool {
  type: 'function';
  function: OpenAiFunctionDef;
}
interface OpenAiToolCall {
  id: string;
  type?: string;
  function: { name: string; arguments: string };
}
interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}
interface OpenRouterCompletion {
  choices?: Array<{ message?: OpenAiMessage }>;
  usage?: { total_tokens?: number };
  error?: { message?: string; code?: string | number };
}

/**
 * Proveedor de FALLBACK basado en OpenRouter (API OpenAI-compatible).
 *
 * Se invoca SOLO cuando Gemini (proveedor principal) falla por causas
 * transitorias. Replica el ciclo de function-calling de `callGemini` con la
 * MISMA semántica (anti-loop `MAX_TOOL_ROUNDS`, ejecución de tools vía el
 * `runTool` del orquestador), traduciendo de/hacia el formato OpenAI.
 *
 * Doble fallback INTERNO de modelos (regla del usuario):
 *   OPENROUTER_MODEL (DeepSeek)  →  OPENROUTER_FALLBACK_MODEL (Qwen)  →  error.
 *
 * 100% desacoplado: no importa Prisma, ni el tool-registry, ni las personas;
 * recibe ya resueltos el system prompt, el historial y las tools.
 */
@Injectable()
export class OpenRouterProvider {
  private readonly logger = new Logger(OpenRouterProvider.name);

  constructor(private readonly config: ConfigService) {}

  /** API key efectiva (trim) o undefined si no está configurada. */
  private apiKey(): string | undefined {
    const k = this.config.get<string>('OPENROUTER_API_KEY')?.trim();
    return k && k.length > 0 ? k : undefined;
  }

  /**
   * Cadena de modelos a intentar, en orden: principal (DeepSeek) y luego el
   * de fallback (Qwen) si difiere. Vacía si no hay ninguno configurado.
   */
  private modelChain(): string[] {
    const primary = this.config.get<string>('OPENROUTER_MODEL')?.trim();
    const fallback = this.config
      .get<string>('OPENROUTER_FALLBACK_MODEL')
      ?.trim();
    const chain: string[] = [];
    if (primary) chain.push(primary);
    if (fallback && fallback !== primary) chain.push(fallback);
    return chain;
  }

  /** True si hay API key Y al menos un modelo → el fallback es utilizable. */
  isConfigured(): boolean {
    return !!this.apiKey() && this.modelChain().length > 0;
  }

  /**
   * Genera la respuesta corriendo el ciclo de function-calling sobre la
   * cadena de modelos. Devuelve el primer modelo que responde; si TODOS
   * fallan, relanza el último error (el orquestador degrada a su error
   * habitual). Lanza también si no está configurado.
   */
  async generate(params: OpenRouterGenerateParams): Promise<OpenRouterResult> {
    const apiKey = this.apiKey();
    if (!apiKey) throw new Error('OpenRouter no configurado (sin API key)');

    const tools = this.toOpenAiTools(params.tools);
    const baseMessages = this.buildMessages(params);
    const models = this.modelChain();
    if (models.length === 0) {
      throw new Error('OpenRouter no configurado (sin modelos)');
    }

    let lastErr: unknown;
    for (const model of models) {
      try {
        return await this.runConversation(
          apiKey,
          model,
          baseMessages,
          tools,
          params.runTool,
        );
      } catch (e) {
        lastErr = e;
        this.logger.warn(
          `[AI-FALLBACK] OpenRouter modelo ${model} falló: ${
            (e as Error)?.message ?? e
          }`,
        );
      }
    }
    if (lastErr instanceof Error) {
      throw lastErr;
    }

    throw new Error(
      `OpenRouter: todos los modelos fallaron. Motivo: ${String(lastErr)}`,
    );
  }

  // ── Ciclo de function-calling (espejo de callGemini) ──────────

  private async runConversation(
    apiKey: string,
    model: string,
    baseMessages: OpenAiMessage[],
    tools: OpenAiTool[] | undefined,
    runTool: OpenRouterRunTool,
  ): Promise<OpenRouterResult> {
    // Copia mutable por modelo: si DeepSeek falla a mitad, Qwen arranca limpio.
    const messages: OpenAiMessage[] = baseMessages.map((m) => ({ ...m }));
    let rounds = 0;
    let tokensUsed = 0;

    for (;;) {
      const data = await this.postCompletion(apiKey, model, messages, tools);
      tokensUsed += data.usage?.total_tokens ?? 0;

      const msg = data.choices?.[0]?.message;
      if (!msg) {
        throw new Error('OpenRouter: respuesta sin choices/message');
      }

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        const text = (msg.content ?? '').trim();
        if (!text) throw new Error('OpenRouter devolvió respuesta vacía');
        return { reply: text, tokensUsed, model };
      }

      // [AI-AUDIT] tools que el modelo de fallback decidió invocar.
      this.logger.log(
        `[AI-FALLBACK] OpenRouter(${model}) pidió tools: [${toolCalls
          .map((c) => c.function?.name ?? '(sin nombre)')
          .join(', ')}]`,
      );

      rounds += 1;
      if (rounds > MAX_TOOL_ROUNDS) {
        this.logger.warn(
          `Anti-loop OpenRouter: ${rounds} rondas de tools — se fuerza texto`,
        );
        return { reply: FORCED_REPHRASE_MESSAGE, tokensUsed, model };
      }

      // 1) Turno del asistente con sus tool_calls (debe preceder a los
      //    resultados para que el modelo empareje cada llamada por id).
      messages.push({
        role: 'assistant',
        content: msg.content ?? null,
        tool_calls: toolCalls,
      });

      // 2) Ejecuta cada tool con el MISMO executeTool del orquestador y
      //    adjunta su resultado como mensaje role:'tool'.
      for (const tc of toolCalls) {
        const name = tc.function?.name ?? '';
        const args = this.parseArgs(tc.function?.arguments);
        const result = await runTool({ name, args });
        this.logger.log(
          `[AI-FALLBACK] tool ${name || '(sin nombre)'} → ${JSON.stringify(
            result,
          ).slice(0, 400)}`,
        );
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }
  }

  /** POST al endpoint de OpenRouter con timeout duro (AbortController). */
  private async postCompletion(
    apiKey: string,
    model: string,
    messages: OpenAiMessage[],
    tools: OpenAiTool[] | undefined,
  ): Promise<OpenRouterCompletion> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

    try {
      const res = await fetch(OPENROUTER_BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // Headers de ranking recomendados por OpenRouter (opcionales).
          'HTTP-Referer': 'https://oficioapp.org.pe',
          'X-Title': 'Servi - Ofi Assistant',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: GEN_TEMPERATURE,
          max_tokens: GEN_MAX_OUTPUT_TOKENS,
          ...(tools ? { tools, tool_choice: 'auto' } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new Error(
          `OpenRouter HTTP ${res.status}: ${body.slice(0, 200)}`,
        ) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }

      const data = (await res.json()) as OpenRouterCompletion;
      // OpenRouter puede responder 200 con un objeto `error` embebido.
      if (data.error) {
        throw new Error(
          `OpenRouter error: ${data.error.message ?? 'desconocido'}`,
        );
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Conversión de formatos Gemini → OpenAI ────────────────────

  /** Mensajes OpenAI: system + historial + mensaje actual del usuario. */
  private buildMessages(params: OpenRouterGenerateParams): OpenAiMessage[] {
    const messages: OpenAiMessage[] = [
      { role: 'system', content: params.systemInstruction },
    ];
    for (const turn of params.history) {
      messages.push({
        role: turn.role === 'model' ? 'assistant' : 'user',
        content: turn.text,
      });
    }
    messages.push({ role: 'user', content: params.userMessage });
    return messages;
  }

  /**
   * Convierte las tools de Gemini (`[{ functionDeclarations: [...] }]`) al
   * formato de tools de OpenAI (`[{ type:'function', function:{...} }]`),
   * bajando a minúsculas los `type` del JSON-Schema (Gemini usa 'OBJECT'/
   * 'STRING'; OpenAI exige 'object'/'string').
   */
  private toOpenAiTools(tools: Tool[] | undefined): OpenAiTool[] | undefined {
    if (!tools || tools.length === 0) return undefined;
    const out: OpenAiTool[] = [];
    for (const t of tools) {
      for (const decl of t.functionDeclarations ?? []) {
        if (!decl.name) continue;
        out.push({
          type: 'function',
          function: {
            name: decl.name,
            description: decl.description ?? '',
            parameters: decl.parameters
              ? (this.toJsonSchema(decl.parameters) as Record<string, unknown>)
              : { type: 'object', properties: {} },
          },
        });
      }
    }
    return out.length > 0 ? out : undefined;
  }

  /** Baja a minúsculas `type` y recursa en `properties`/`items`. */
  private toJsonSchema(schema: unknown): unknown {
    if (schema == null || typeof schema !== 'object') return schema;
    if (Array.isArray(schema)) return schema.map((s) => this.toJsonSchema(s));

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
      if (k === 'type' && typeof v === 'string') {
        out.type = v.toLowerCase();
      } else if (k === 'properties' && v && typeof v === 'object') {
        const props: Record<string, unknown> = {};
        for (const [pk, pv] of Object.entries(v as Record<string, unknown>)) {
          props[pk] = this.toJsonSchema(pv);
        }
        out.properties = props;
      } else if (k === 'items') {
        out.items = this.toJsonSchema(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  /** Parsea los `arguments` (string JSON) de una tool call a objeto. */
  private parseArgs(raw: string | undefined): Record<string, unknown> {
    if (!raw || !raw.trim()) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}
