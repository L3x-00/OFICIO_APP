import { Injectable, Logger } from '@nestjs/common';
import type { SanitizeResult } from './ai-assistant.types.js';
import { RISK_BLOCK_THRESHOLD } from './ai-assistant.constants.js';

/**
 * PRE-FILTRO heurístico (sanitizer).
 *
 * Antes de gastar un token en Gemini, puntuamos el mensaje del usuario
 * contra patrones conocidos de abuso: prompt-injection, jailbreak,
 * extracción de system prompt, intentos de salida de scope. Cada patrón
 * suma a un `riskScore` (0..1). Si supera el umbral → `flagged=true` y el
 * orquestador corta el flujo sin llamar al modelo.
 *
 * NO es un WAF perfecto — es una primera barrera barata y determinista.
 * El POST-filtro (guardrails) cubre lo que se escape.
 */
@Injectable()
export class AiSanitizerService {
  private readonly logger = new Logger(AiSanitizerService.name);

  /**
   * Patrones de riesgo con su peso. Mantener en español + inglés porque
   * los ataques suelen venir en inglés copiados de internet.
   */
  private static readonly RISK_PATTERNS: Array<{
    re: RegExp;
    weight: number;
    label: string;
  }> = [
    // Prompt-injection clásico.
    {
      re: /\bignore (all |the )?(previous|prior|above) (instructions|prompts?)\b/i,
      weight: 0.6,
      label: 'ignore-previous',
    },
    {
      re: /\bignora (todas )?(las )?(instrucciones|indicaciones) (previas|anteriores)\b/i,
      weight: 0.6,
      label: 'ignora-previas',
    },
    {
      re: /\bdisregard (all|the|your) (rules|instructions|guidelines)\b/i,
      weight: 0.6,
      label: 'disregard-rules',
    },
    // Extracción del system prompt.
    {
      re: /\b(reveal|show|print|repeat|dump) (me )?(your |the )?(system )?(prompt|instructions)\b/i,
      weight: 0.55,
      label: 'leak-prompt',
    },
    {
      re: /\b(cu[aá]l|mu[eé]strame|imprime|repite|dame|entr[eé]game|comparte|revela|ens[eé][nñ]ame|env[ií]ame).{0,20}(system\s*prompt|prompt de(l)? sistema|instrucciones de(l)? sistema)\b/i,
      weight: 0.55,
      label: 'leak-prompt-es',
    },
    // Jailbreak / persona override.
    {
      re: /\b(act|behave|pretend|roleplay) as (an?|the)?\s*(DAN|jailbreak|unfiltered|developer mode|root|admin)\b/i,
      weight: 0.6,
      label: 'jailbreak-persona',
    },
    {
      re: /\bmodo (desarrollador|sin (filtros|restricciones)|dios)\b/i,
      weight: 0.55,
      label: 'modo-dev',
    },
    { re: /\bdo anything now\b/i, weight: 0.6, label: 'DAN' },
    // Intentos de cambiar las reglas / desactivar guardrails.
    {
      re: /\b(forget|olvida) (your|tus) (rules|guardrails|reglas|l[ií]mites)\b/i,
      weight: 0.5,
      label: 'forget-rules',
    },
    { re: /\byou are no longer\b/i, weight: 0.4, label: 'you-are-no-longer' },
    // Inyección de delimitadores de rol.
    {
      re: /<\|?(system|assistant|user)\|?>|\[\/?(INST|SYS)\]/i,
      weight: 0.5,
      label: 'role-tokens',
    },
    // Pedido explícito de datos sensibles de terceros.
    {
      re: /\b(d[ae]me|env[ií]ame|lista).{0,30}(dni|ruc|tel[eé]fonos?|correos?|contrase[nñ]as?)\b/i,
      weight: 0.45,
      label: 'pii-harvest',
    },
  ];

  sanitize(rawInput: string): SanitizeResult {
    const cleaned = this.normalize(rawInput);
    const reasons: string[] = [];
    let score = 0;

    for (const { re, weight, label } of AiSanitizerService.RISK_PATTERNS) {
      if (re.test(cleaned)) {
        score += weight;
        reasons.push(label);
      }
    }

    // Señales adicionales suaves (acumulativas, no determinantes).
    if (cleaned.length > 1500) {
      score += 0.1;
      reasons.push('very-long');
    }
    // Densidad alta de caracteres de control/markup → posible payload.
    const symbolRatio = this.symbolRatio(cleaned);
    if (symbolRatio > 0.35) {
      score += 0.15;
      reasons.push('high-symbol-ratio');
    }

    const riskScore = Math.min(1, score);
    const flagged = riskScore > RISK_BLOCK_THRESHOLD;

    if (flagged) {
      this.logger.warn(
        `Input bloqueado por sanitizer (score=${riskScore.toFixed(2)}): ${reasons.join(', ')}`,
      );
    }

    return { cleaned, riskScore, flagged, reasons };
  }

  /** Trim + colapsa espacios/saltos repetidos. */
  private normalize(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
  }

  /** Proporción de caracteres no alfanuméricos/espacio. */
  private symbolRatio(s: string): number {
    if (s.length === 0) return 0;
    const symbols = s.replace(/[\p{L}\p{N}\s]/gu, '').length;
    return symbols / s.length;
  }
}
