/**
 * Tipos compartidos del módulo IA. Sin dependencias de Prisma ni de
 * entidades de dominio — mantiene el módulo desacoplable.
 */
import type { FunctionDeclaration } from '@google/genai';

/** Rol del usuario que consulta (espejo de UserRole, como string). */
export type AiUserRole = 'USUARIO' | 'PROVEEDOR' | 'ADMIN';

/**
 * Definición declarativa de una Tool de Gemini (Fase 3).
 *
 * `declaration` es el FunctionDeclaration que se envía al modelo;
 * `roles` restringe a qué roles se le OFRECE la tool (defensa en
 * profundidad: además del feature-flag/kill-switch por env). El registry
 * cruza ambos filtros antes de exponer cada tool en el request.
 */
export interface AiToolDef {
  declaration: FunctionDeclaration;
  roles: readonly AiUserRole[];
}

/** Contexto mínimo del autor de la consulta — derivado SIEMPRE del JWT. */
export interface AiCaller {
  userId: number;
  role: AiUserRole;
  /** Perfil de proveedor activo si aplica (OFICIO|NEGOCIO). */
  providerType?: 'OFICIO' | 'NEGOCIO' | null;
}

/** Un turno del historial de conversación que enviamos a Gemini. */
export interface AiHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

/** Estados del circuit breaker (regla 7). */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/** Resultado del pre-filtro heurístico (sanitizer). */
export interface SanitizeResult {
  /** Texto saneado (trim, colapso de espacios). */
  cleaned: string;
  /** 0..1 — probabilidad de intento malicioso (prompt-injection, etc.). */
  riskScore: number;
  /** True cuando supera el umbral y se debe bloquear. */
  flagged: boolean;
  /** Motivos detectados (para logging/Sentry). */
  reasons: string[];
}

/** Resultado del post-filtro (guardrails). */
export interface GuardrailResult {
  /** Texto final entregable al cliente (PII redactada). */
  safe: string;
  /** True si se redactó al menos un dato sensible. */
  redacted: boolean;
  /** True si se detectó toxicidad y el texto fue sustituido. */
  toxic: boolean;
}

/** Respuesta pública del endpoint /ai-assistant/chat. */
export interface AiChatResult {
  reply: string;
  /** Metadata no sensible para el cliente (debug/UX). */
  meta: {
    promptVersion: string;
    blocked: boolean;
    /** Motivo cuando blocked=true: 'sanitizer'|'circuit'|'quota'|'flag'. */
    reason?: string;
    /** True si la respuesta salió de la caché (Fase 4). */
    cached?: boolean;
  };
}

/** Contexto del request HTTP para auditar el mensaje (Fase 4). */
export interface AiRequestMeta {
  ip?: string;
  userAgent?: string;
}

/** Intención detectada para la política de caché (Fase 4). */
export type AiIntent = 'financial' | 'search' | 'faq' | 'other';
