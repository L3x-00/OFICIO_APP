'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { askAssistant } from '@/lib/api';

// ── Modelo de mensaje local ────────────────────────────────
type Role = 'user' | 'ofi';
interface ChatMsg {
  role: Role;
  text: string;
  /** Local (saludo/errores): no viaja como historial. */
  local?: boolean;
  isError?: boolean;
}

const GREETING: ChatMsg = {
  role: 'ofi',
  local: true,
  text:
    '¡Hola! 👋 Soy Ofi, el asistente de Servi. Puedo ayudarte con dudas ' +
    'sobre la plataforma, métricas y más. ¿En qué te ayudo?',
};

const BRAND_GRADIENT = 'linear-gradient(135deg, #3B82F6, #6366F1)';

/**
 * Widget de chat flotante con "Ofi" para el panel admin.
 *
 * Estilo Intercom: FAB fijo abajo-derecha (z-50) que despliega un panel
 * de conversación. Usa las CSS variables del admin (`--surface-*`,
 * `--text-*`, `--border-default`) para integrarse con el dark mode.
 */
export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll al fondo cuando cambian mensajes o el estado de carga.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  // Enfoca el input al abrir.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const history = messages
      .filter((m) => !m.local && !m.isError)
      .map((m) => ({ role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model', text: m.text }));

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await askAssistant(text, history);
      setMessages((prev) => [...prev, { role: 'ofi', text: res.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ocurrió un error. Intenta de nuevo.';
      setMessages((prev) => [...prev, { role: 'ofi', text: msg, local: true, isError: true }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <>
      {/* Panel de chat */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '88px',
            right: '20px',
            width: 'min(380px, calc(100vw - 32px))',
            height: 'min(560px, calc(100vh - 140px))',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderBottom: '1px solid var(--border-default)',
              background: 'var(--surface-2, var(--surface-1))',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: BRAND_GRADIENT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <Bot size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Ofi
              </div>
              <div style={{ fontSize: '11px', color: loading ? '#22c55e' : 'var(--text-tertiary)' }}>
                {loading ? 'escribiendo…' : 'Asistente de Servi'}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'var(--surface-3)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Mensajes */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: 'var(--surface-0)',
            }}
          >
            {messages.map((m, i) => (
              <Bubble key={i} msg={m} />
            ))}
            {loading && <TypingBubble />}
          </div>

          {/* Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderTop: '1px solid var(--border-default)',
              background: 'var(--surface-1)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              placeholder="Escribe tu mensaje…"
              style={{
                flex: 1,
                background: 'var(--surface-3)',
                border: '1px solid var(--border-default)',
                borderRadius: '20px',
                padding: '9px 14px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: BRAND_GRADIENT,
                border: 'none',
                color: '#fff',
                cursor: loading || !input.trim() ? 'default' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir asistente Ofi"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: BRAND_GRADIENT,
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        {open ? <X size={24} /> : <Bot size={26} />}
      </button>
    </>
  );
}

// ── Burbuja de mensaje ─────────────────────────────────────
function Bubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '82%',
          padding: '9px 13px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          fontSize: '13px',
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          background: isUser
            ? BRAND_GRADIENT
            : msg.isError
              ? 'rgba(239,68,68,0.12)'
              : 'var(--surface-3)',
          color: isUser ? '#fff' : msg.isError ? '#fca5a5' : 'var(--text-primary)',
          border: msg.isError ? '1px solid rgba(239,68,68,0.4)' : 'none',
        }}
      >
        {msg.text}
      </div>
    </div>
  );
}

// ── Indicador "escribiendo…" ───────────────────────────────
function TypingBubble() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 350);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div
        style={{
          padding: '11px 16px',
          borderRadius: '14px 14px 14px 4px',
          background: 'var(--surface-3)',
          display: 'flex',
          gap: '5px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--text-tertiary)',
              opacity: step === i ? 1 : 0.35,
              transition: 'opacity 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
