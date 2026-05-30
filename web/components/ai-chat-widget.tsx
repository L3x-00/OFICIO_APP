'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { useProfileTypeOptional } from '@/lib/profile-type-context';

type Role = 'user' | 'ofi';
interface ChatMsg {
  role: Role;
  text: string;
  local?: boolean;
  isError?: boolean;
}

interface AiChatResponse {
  reply: string;
  meta: { promptVersion: string; blocked: boolean; reason?: string; cached?: boolean };
}

const GREETING: ChatMsg = {
  role: 'ofi',
  local: true,
  text:
    '¡Hola! 👋 Soy Ofi, tu asistente de Servi. Puedo ayudarte con tu perfil, ' +
    'estadísticas, planes y cómo conseguir más clientes. ¿En qué te ayudo?',
};

/**
 * Widget de chat flotante con "Ofi" para el panel del proveedor (web).
 *
 * Estilo Intercom: FAB ámbar fijo (z-50) que despliega un panel glass
 * consistente con el tema dark premium. Solo se renderiza si hay sesión
 * (se integra dentro de /panel, que ya exige autenticación).
 */
export default function AiChatWidget() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const profileCtx = useProfileTypeOptional();
  const providerType = profileCtx?.activeType ?? undefined;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

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
      const res = await apiFetch<AiChatResponse>('/ai-assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          ...(history.length ? { history } : {}),
          ...(providerType ? { providerType } : {}),
        }),
      });
      setMessages((prev) => [...prev, { role: 'ofi', text: res.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ocurrió un error. Intenta de nuevo.';
      setMessages((prev) => [...prev, { role: 'ofi', text: msg, local: true, isError: true }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, providerType]);

  // Evita hydration mismatch (localStorage) y oculta si no hay sesión.
  if (!mounted || !isAuthenticated()) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[92px] right-5 z-50 flex flex-col w-[min(380px,calc(100vw-32px))] h-[min(560px,calc(100vh-150px))] glass-card rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber to-amber-dark flex items-center justify-center text-black flex-shrink-0">
                <Bot size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[14px] leading-tight">Ofi</p>
                <p className={`text-[11px] leading-tight ${loading ? 'text-emerald-400' : 'text-white/40'}`}>
                  {loading ? 'escribiendo…' : 'Asistente de Servi'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Mensajes */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5"
            >
              {messages.map((m, i) => (
                <Bubble key={i} msg={m} />
              ))}
              {loading && <TypingBubble />}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-3 border-t border-white/10 bg-white/[0.02]">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
                placeholder="Escribe tu mensaje…"
                className="flex-1 bg-white/[0.05] border border-white/10 rounded-full px-4 py-2.5 text-white text-[13px] placeholder:text-white/30 outline-none focus:border-amber/40 transition-colors"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label="Enviar"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-amber to-amber-dark text-black flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-opacity"
              >
                <Send size={17} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir asistente Ofi"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-amber to-amber-dark text-black flex items-center justify-center shadow-[0_8px_24px_rgba(255,143,0,0.45)]"
      >
        {open ? <X size={24} /> : <Bot size={26} />}
      </motion.button>
    </>
  );
}

function Bubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-white rounded-[14px_14px_4px_14px]'
            : msg.isError
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40 rounded-[14px_14px_14px_4px]'
              : 'bg-white/[0.06] text-white/90 rounded-[14px_14px_14px_4px]'
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}

function TypingBubble() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 350);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex justify-start">
      <div className="px-4 py-3 rounded-[14px_14px_14px_4px] bg-white/[0.06] flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/60 transition-opacity duration-200"
            style={{ opacity: step === i ? 1 : 0.35 }}
          />
        ))}
      </div>
    </div>
  );
}
