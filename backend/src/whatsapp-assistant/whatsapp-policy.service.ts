import { Injectable } from '@nestjs/common';
import {
  GREETING_REPLY,
  HUMAN_HANDOVER_REPLY,
  OUT_OF_SCOPE_REPLY,
  SERVI_FAQ,
} from './whatsapp-faq.js';

/** Decisión determinista de F1 (sin IA). */
export type PolicyDecision =
  | { kind: 'opt_out' } // STOP/DETENER: persistir baja, NO enviar.
  | { kind: 'handover'; reply: string } // HUMANO: pausar bot + 1 confirmación.
  | { kind: 'link'; code: string } // F3: consume OTP efímero de vínculo.
  | { kind: 'faq'; reply: string; aiEligible: boolean } // Respuesta pública de Servi.
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
const HANDOVER_PATTERNS = [
  /\bhumano\b/,
  /\basesor(?:a)?\b/,
  /\bagente\b/,
  /\bhablar con (?:alguien|una persona)\b/,
  /\buna persona\b/,
  /^persona$/,
];

// Solo saludos completos. "Hola, necesito un gasfitero" sigue la FAQ de
// búsqueda y puede usar F2 si ese switch se activa.
const GREETING_ONLY =
  /^(?:hola|holi|buenas?|buen dia|buenos dias|buenas tardes|buenas noches|que tal|saludos|alo)(?: servi)?[!¡,.?]*$/;

// Diez símbolos base32 sin caracteres ambiguos = 50 bits. El texto debe ser
// EXACTAMENTE `VINCULAR <código>`; nada más entra al flujo de escritura F3.
const LINK_COMMAND = /^vincular[ \t]+([a-hjkmnp-z2-9]{10})$/i;

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

function linkCodeFrom(text: string): string | null {
  const match = text.trim().match(LINK_COMMAND);
  return match ? match[1].toUpperCase() : null;
}

function includesToken(normalized: string, tokens: readonly string[]): boolean {
  return tokens.some((t) => normalized.includes(t));
}

function isOptOutRequest(normalized: string): boolean {
  return OPT_OUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isHandoverRequest(normalized: string): boolean {
  return HANDOVER_PATTERNS.some((pattern) => pattern.test(normalized));
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
    if (isHandoverRequest(normalized)) {
      return { kind: 'handover', reply: HUMAN_HANDOVER_REPLY };
    }

    // 3. Vínculo F3. STOP/HUMANO ya ganaron; solo el comando exacto puede
    // consumir un challenge. El código nunca se persiste ni se loguea aquí.
    const code = linkCodeFrom(text);
    if (code) return { kind: 'link', code };

    // 4. FAQ pública de Servi (primera coincidencia gana).
    for (const entry of SERVI_FAQ) {
      if (includesToken(normalized, entry.keywords)) {
        return {
          kind: 'faq',
          reply: entry.answer,
          aiEligible: entry.aiEligible !== false,
        };
      }
    }

    if (GREETING_ONLY.test(normalized)) {
      return { kind: 'faq', reply: GREETING_REPLY, aiEligible: false };
    }

    // 5. Fuera de alcance de Servi: rechazo corto.
    return { kind: 'reject', reply: OUT_OF_SCOPE_REPLY };
  }
}
