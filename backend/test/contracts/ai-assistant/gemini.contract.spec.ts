/**
 * CONTRACT TEST — @google/genai contra Gemini REAL.
 *
 * Los 68 tests de IA mockean el SDK: si Google cambia el shape de la
 * respuesta, los mocks siguen verdes y producción se rompe. Este test es el
 * único que llama al SDK real y verifica el CONTRATO del que depende
 * AiAssistantService:
 *
 *   • response.text                       → string
 *   • response.functionCalls              → FunctionCall[] (o ausente)
 *   • response.functionCalls[].name/args  → string / object
 *   • response.usageMetadata.totalTokenCount → number
 *
 * NO corre en CI. Solo se ejecuta con RUN_GEMINI_CONTRACT_TESTS=true.
 * Si falta GEMINI_API_KEY → skip automático (no rompe nada).
 *
 * Detección de drift: compara el SHAPE (solo tipos, nunca valores —
 * el contenido de Gemini es no-determinista) contra un snapshot. Si Google
 * cambia text / functionCalls / usageMetadata, el test FALLA de inmediato.
 * Regenerar baseline (tras validar el cambio): UPDATE_GEMINI_SNAPSHOT=true.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  GoogleGenAI,
  FunctionCallingConfigMode,
  Type,
  type GenerateContentResponse,
  type Tool,
} from '@google/genai';
import { AI_MODEL } from '../../../src/ai-assistant/ai-assistant.constants.js';

/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

const RUN = process.env.RUN_GEMINI_CONTRACT_TESTS === 'true';
const API_KEY = process.env.GEMINI_API_KEY;
const SNAPSHOT_PATH = resolve(
  process.cwd(),
  'test/contracts/fixtures/gemini-response.snapshot.json',
);

// ── Gate: fuera de CI; skip si no hay condiciones ───────────────
if (!RUN) {
  console.warn(
    '[gemini.contract] INACTIVO. Set RUN_GEMINI_CONTRACT_TESTS=true para ejecutar contra Gemini real.',
  );
} else if (!API_KEY) {
  console.warn(
    '[gemini.contract] RUN_GEMINI_CONTRACT_TESTS=true pero falta GEMINI_API_KEY → SKIP automático.',
  );
}
const suite = RUN && API_KEY ? describe : describe.skip;

// ── Helpers de SHAPE (tipos, no valores) ────────────────────────
const typeOf = (v: unknown): string =>
  Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;

/** Normaliza el contenedor de functionCalls: undefined o [] → 'none'. */
const fcContainer = (resp: any): string => {
  const c = resp?.functionCalls;
  if (c === undefined || c === null) return 'none';
  if (Array.isArray(c)) return c.length > 0 ? 'array' : 'none';
  return typeof c;
};

function contractShape(
  textResp: GenerateContentResponse,
  fcResp: GenerateContentResponse,
): Record<string, unknown> {
  const call0 = (fcResp as any).functionCalls?.[0];
  return {
    sdk: '@google/genai',
    model: AI_MODEL,
    textCall: {
      text: typeOf((textResp as any).text),
      functionCalls: fcContainer(textResp),
      usageMetadata: {
        promptTokenCount: typeOf(textResp.usageMetadata?.promptTokenCount),
        candidatesTokenCount: typeOf(
          textResp.usageMetadata?.candidatesTokenCount,
        ),
        totalTokenCount: typeOf(textResp.usageMetadata?.totalTokenCount),
      },
    },
    functionCall: {
      functionCalls: fcContainer(fcResp),
      call0: call0
        ? { name: typeOf(call0.name), args: typeOf(call0.args) }
        : null,
      usageMetadata: {
        totalTokenCount: typeOf(fcResp.usageMetadata?.totalTokenCount),
      },
    },
  };
}

const stripMeta = (o: any): Record<string, unknown> => {
  const { _meta, ...rest } = o ?? {};
  return rest;
};

function sdkVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'node_modules/@google/genai/package.json'),
        'utf8',
      ),
    );
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

suite('Gemini SDK contract (real @google/genai)', () => {
  let textResp: GenerateContentResponse;
  let fcResp: GenerateContentResponse;
  let shape: Record<string, unknown>;

  beforeAll(async () => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // 1. Llamada de TEXTO puro (sin tools).
    //    gemini-2.5-flash es un modelo "thinking": consume tokens de salida
    //    en razonamiento interno antes del texto. Con un maxOutputTokens muy
    //    bajo el presupuesto se agota en thinking y `.text` viene vacío
    //    (finishReason MAX_TOKENS). Damos holgura para obtener respuesta real.
    textResp = await ai.models.generateContent({
      model: AI_MODEL,
      contents: 'Responde únicamente con la palabra: OK',
      config: { temperature: 0, maxOutputTokens: 512 },
    });

    // 2. Llamada con FUNCTION CALLING forzado (mode ANY) para garantizar
    //    que el contenedor functionCalls venga poblado.
    const tool: Tool = {
      functionDeclarations: [
        {
          name: 'get_weather',
          description: 'Obtiene el clima actual de una ciudad',
          parameters: {
            type: Type.OBJECT,
            properties: {
              city: { type: Type.STRING, description: 'Ciudad' },
            },
            required: ['city'],
          },
        },
      ],
    };
    fcResp = await ai.models.generateContent({
      model: AI_MODEL,
      contents: '¿Qué clima hace en Huancayo? Usa la herramienta get_weather.',
      config: {
        temperature: 0,
        tools: [tool],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
        },
      },
    });

    shape = contractShape(textResp, fcResp);
  }, 60_000);

  // ── Aserciones duras del contrato (fallan al instante si cambia) ──

  it('text: response.text es string no vacío', () => {
    expect(typeof (textResp as any).text).toBe('string');
    expect(((textResp as any).text as string).length).toBeGreaterThan(0);
  });

  it('text: usageMetadata expone prompt/candidates/totalTokenCount como number', () => {
    expect(typeof textResp.usageMetadata?.totalTokenCount).toBe('number');
    expect(typeof textResp.usageMetadata?.promptTokenCount).toBe('number');
    expect(typeof textResp.usageMetadata?.candidatesTokenCount).toBe('number');
  });

  it('text: functionCalls ausente/vacío en una respuesta de texto', () => {
    expect(fcContainer(textResp)).toBe('none');
  });

  it('function-call: response.functionCalls es array con { name, args }', () => {
    const calls = (fcResp as any).functionCalls ?? [];
    expect(Array.isArray(calls)).toBe(true);
    expect(calls.length).toBeGreaterThan(0);
    const c = calls[0];
    expect(typeof c.name).toBe('string');
    expect(c.name).toBe('get_weather');
    expect(typeof c.args).toBe('object');
    expect(c.args).not.toBeNull();
  });

  it('function-call: usageMetadata.totalTokenCount es number', () => {
    expect(typeof fcResp.usageMetadata?.totalTokenCount).toBe('number');
  });

  // ── Detección automática de drift de shape ──────────────────────

  it('snapshot: el shape del SDK coincide con el baseline (drift detection)', () => {
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    const regen = process.env.UPDATE_GEMINI_SNAPSHOT === 'true';
    const bootstrap = !existsSync(SNAPSHOT_PATH);

    if (regen || bootstrap) {
      const withMeta = {
        _meta: {
          note: 'Baseline de contrato (solo tipos). Regenerar con UPDATE_GEMINI_SNAPSHOT=true.',
          sdkVersion: sdkVersion(),
          capturedAt: new Date().toISOString(),
        },
        ...shape,
      };
      writeFileSync(SNAPSHOT_PATH, JSON.stringify(withMeta, null, 2) + '\n');
      console.warn(
        `[gemini.contract] snapshot ${regen ? 'REGENERADO' : 'CREADO'}: ${SNAPSHOT_PATH}`,
      );
      return; // bootstrap/regeneración no compara
    }

    const saved = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
    // Si esto falla: Google cambió el shape (text/functionCalls/usageMetadata).
    // Revisar el diff; ajustar producción si el cambio es real y luego
    // regenerar el baseline con UPDATE_GEMINI_SNAPSHOT=true.
    expect(shape).toEqual(stripMeta(saved));
  });

  // ── Telemetría para el reporte (informativo, no asercional) ──────

  it('reporte: vuelca el shape observado completo (informativo)', () => {
    console.log(
      '[gemini.contract] SDK version:',
      sdkVersion(),
      '| model:',
      AI_MODEL,
    );
    console.log(
      '[gemini.contract] textCall.usageMetadata keys:',
      Object.keys((textResp.usageMetadata as any) ?? {}).sort().join(', '),
    );
    console.log(
      '[gemini.contract] contract shape:',
      JSON.stringify(shape, null, 2),
    );
    expect(shape).toBeDefined();
  });
});
