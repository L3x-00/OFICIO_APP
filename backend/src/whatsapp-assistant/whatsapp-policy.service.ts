import { Injectable } from '@nestjs/common';
import {
  HUMAN_HANDOVER_REPLY,
  OUT_OF_SCOPE_REPLY,
  SERVI_FAQ,
} from './whatsapp-faq.js';

/** Decisión determinista de F1 (sin IA). */
export type PolicyDecision =
  | { kind: 'opt_out' } // STOP/DETENER: persistir baja, NO enviar.
  | { kind: 'handover'; reply: string } // HUMANO: pausar bot + 1 confirmación.
  | { kind: 'faq'; reply: string } // Respuesta pública de Servi.
  | { kind: 'reject'; reply: string }; // Fuera de alcance: rechazo corto.

// Frases que disparan opt-out. Se comparan sobre el texto normalizado.
const OPT_OUT_PATTERNS = [
  /\bstop\b/,
  /\bdetener\b/,
  /\bcancelar suscripcion whatsapp\b/,
  /\b(no quiero recibir|quiero dejar de recibir) mensajes\b/,
  /\b(dame|quiero darme) de baja\b/,
];

// Frases que piden un humano.
const HANDOVER_TOKENS = [
  'humano',
  'asesor',
  'persona',
  'agente',
  'hablar con alguien',
];

// Rango de marcas diacríticas combinantes (acentos) a eliminar tras NFD.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Normaliza texto para comparación determinista: minúsculas, sin acentos,
 * espacios colapsados. NO se registra ni se persiste (solo vive en memoria).
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function includesToken(normalized: string, tokens: readonly string[]): boolean {
  return tokens.some((t) => normalized.includes(t));
}

function isOptOutRequest(normalized: string): boolean {
  return OPT_OUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Política F1: 100% determinista, sin IA, sin AiAssistantService, sin consultar
 * usuario/proveedor/cuenta. Solo FAQ pública de Servi + opt-out + derivación.
 */
@Injectable()
export class WhatsappPolicyService {
  decide(text: string): PolicyDecision {
    const normalized = normalizeText(text);

    // 1. Opt-out tiene prioridad sobre todo lo demás.
    if (isOptOutRequest(normalized)) {
      return { kind: 'opt_out' };
    }

    // 2. Derivación a humano.
    if (includesToken(normalized, HANDOVER_TOKENS)) {
      return { kind: 'handover', reply: HUMAN_HANDOVER_REPLY };
    }

    // 3. FAQ pública de Servi (primera coincidencia gana).
    for (const entry of SERVI_FAQ) {
      if (includesToken(normalized, entry.keywords)) {
        return { kind: 'faq', reply: entry.answer };
      }
    }

    // 4. Fuera de alcance de Servi: rechazo corto.
    return { kind: 'reject', reply: OUT_OF_SCOPE_REPLY };
  }
}
