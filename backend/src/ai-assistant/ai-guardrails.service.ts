import { Injectable, Logger } from '@nestjs/common';
import type { GuardrailResult } from './ai-assistant.types.js';
import { PII_PLACEHOLDER } from './ai-assistant.constants.js';

/**
 * POST-FILTRO (guardrails) sobre la respuesta del modelo.
 *
 * 1. Redacta PII que Gemini pudiera haber filtrado pese a los DTOs
 *    estrictos: DNI peruano (8 díg), RUC (11 díg), celulares (9 díg /
 *    +51), emails y UUIDs. Reemplaza por `[DATO PRIVADO]`.
 * 2. Capa de moderación de toxicidad: si la respuesta contiene insultos
 *    / lenguaje agresivo, la sustituye por un mensaje neutro.
 *
 * Determinista y barato — corre siempre, después de Gemini, antes de
 * devolver al cliente.
 */
@Injectable()
export class AiGuardrailsService {
  private readonly logger = new Logger(AiGuardrailsService.name);

  // ── PII (orden importa: RUC antes que DNI para no romper el de 11) ──
  private static readonly PII_PATTERNS: Array<{ re: RegExp; label: string }> = [
    // Email.
    { re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, label: 'email' },
    // UUID v1-v5.
    {
      re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      label: 'uuid',
    },
    // RUC peruano: 11 dígitos empezando en 10/15/16/17/20.
    { re: /\b(?:10|15|16|17|20)\d{9}\b/g, label: 'ruc' },
    // Celular Perú: +51 9XXXXXXXX o 9XXXXXXXX (9 dígitos).
    { re: /(?:\+?51\s?)?\b9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g, label: 'phone' },
    // DNI peruano: exactamente 8 dígitos aislados.
    { re: /\b\d{8}\b/g, label: 'dni' },
  ];

  // ── Toxicidad (lista mínima; ampliable) ─────────────────────
  private static readonly TOXIC_PATTERNS: RegExp[] = [
    /\b(idiota|imb[eé]cil|est[uú]pid[oa]s?|pendej[oa]s?|mierda|car[aá]jo|put[oa]s?|maric[oó]n)\b/i,
    /\b(fuck|shit|asshole|bitch|bastard)\b/i,
  ];

  private static readonly TOXIC_FALLBACK =
    'Prefiero mantener un tono respetuoso. ¿Puedo ayudarte con algo sobre Servi?';

  apply(modelText: string): GuardrailResult {
    const toxic = this.isToxic(modelText);
    if (toxic) {
      this.logger.warn('Respuesta del modelo marcada como tóxica — sustituida');
      return {
        safe: AiGuardrailsService.TOXIC_FALLBACK,
        redacted: false,
        toxic: true,
      };
    }

    const { redactedText, redacted } = this.redactPii(modelText);
    return { safe: redactedText, redacted, toxic: false };
  }

  private redactPii(text: string): { redactedText: string; redacted: boolean } {
    let out = text;
    let redacted = false;
    for (const { re } of AiGuardrailsService.PII_PATTERNS) {
      if (re.test(out)) {
        redacted = true;
        // re tiene flag global → reset lastIndex y reemplazo todo.
        out = out.replace(new RegExp(re.source, re.flags), PII_PLACEHOLDER);
      }
    }
    return { redactedText: out, redacted };
  }

  private isToxic(text: string): boolean {
    return AiGuardrailsService.TOXIC_PATTERNS.some((re) => re.test(text));
  }
}
