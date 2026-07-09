'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { isAuthenticated, getUser } from '@/lib/auth';

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

interface AiHistoryResponse {
  messages: { role: string; content: string; createdAt?: string }[];
}

// FAQs de arranque. Para visitantes se responden localmente (el endpoint de
// IA exige sesión); para usuarios autenticados se envían al modelo real.
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: '¿Cómo encuentro un buen profesional?',
    a: 'Usa el buscador o explora por categorías. Cada proveedor pasa por validación de identidad y puedes guiarte por sus reseñas reales.',
  },
  {
    q: '¿Buscar un servicio tiene costo?',
    a: 'No. Buscar y contactar profesionales es totalmente gratis: comparas perfiles, reseñas y eliges el que mejor se adapte a tu presupuesto.',
  },
  {
    q: '¿Cómo me registro como profesional o negocio?',
    a: 'Descarga la app, completa tu perfil y sube tus documentos (DNI/RUC) para la verificación. Al aprobarse, podrás recibir clientes.',
  },
  {
    q: '¿Qué son las monedas de recompensa?',
    a: 'Es nuestro sistema de lealtad: ganas monedas invitando amigos con tu código de referido y las canjeas por descuentos o planes premium.',
  },
  // Feature OCULTA (2026-07): subastas — restaurar esta FAQ al reactivar.
  // {
  //   q: '¿Cómo funcionan las subastas de servicios?',
  //   a: 'Publicas tu necesidad y los proveedores de esa categoría te envían propuestas; tú revisas y eliges la ganadora.',
  // },
  {
    q: '¿Cómo contacto a un proveedor?',
    a: 'Desde su perfil puedes escribirle por chat, llamarlo o enviarle WhatsApp directamente — sin intermediarios ni comisiones.',
  },
];

/**
 * Widget de chat flotante con "Ofi" — disponible en TODA la web (FASE 4 #1).
 *
 * - Visitante (sin sesión): modo FAQ con respuestas locales + invitación a
 *   iniciar sesión para asistencia personalizada (el endpoint de IA exige JWT).
 * - Cliente / Proveedor (con sesión): chat real contra POST /ai-assistant/chat;
 *   carga el historial (GET /ai-assistant/history) al abrir. El backend deriva
 *   la persona (cliente vs proveedor) del JWT; enviamos `providerType` si hay un
 *   perfil activo para afinar la asistencia del panel.
 *
 * Montado en el root layout, por lo que su estado SOBREVIVE a la navegación
 * entre páginas (los layouts de Next App Router no se desmontan al navegar).
 */
export default function AiChatWidget() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Resolvemos sesión/rol tras el montaje (evita mismatch de hidratación con
  // localStorage). providerType se lee del mismo storage que usa el panel.
  const [authed, setAuthed] = useState(false);
  const [isProvider, setIsProvider] = useState(false);
  const [providerType, setProviderType] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
    const ok = isAuthenticated();
    setAuthed(ok);
    const user = getUser();
    setIsProvider(user?.role === 'PROVEEDOR');
    try {
      const t = localStorage.getItem('oficio_active_profile_type');
      if (t === 'OFICIO' || t === 'NEGOCIO') setProviderType(t);
    } catch {
      /* storage no disponible */
    }
  }, []);

  const greeting: ChatMsg = {
    role: 'ofi',
    local: true,
    text: !authed
      ? '¡Hola! 👋 Soy Ofi. Puedo responder tus preguntas frecuentes sobre Servi. Inicia sesión para una asistencia personalizada.'
      : isProvider
        ? '¡Hola! 👋 Soy Ofi, tu asistente de Servi. Te ayudo con tu panel, estadísticas, planes y a conseguir más clientes. ¿En qué te ayudo?'
        : '¡Hola! 👋 Soy Ofi, tu asistente de Servi. Te ayudo a encontrar servicios, entender cómo funciona la app y más. ¿En qué te ayudo?',
  };

  // Mensajes a mostrar: si la conversación está vacía, mostramos el saludo.
  const view = messages.length > 0 ? messages : [greeting];

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, open]);

  // Carga el historial del backend la primera vez que un usuario autenticado
  // abre el chat. Best-effort: si falla, se mantiene el saludo local.
  useEffect(() => {
    if (!open || !authed || historyLoaded) return;
    setHistoryLoaded(true);
    (async () => {
      try {
        const res = await apiFetch<AiHistoryResponse>('/ai-assistant/history');
        const hist = (res?.messages ?? [])
          .filter((m) => m.content?.trim())
          .map<ChatMsg>((m) => ({
            role: m.role === 'user' ? 'user' : 'ofi',
            text: m.content,
          }));
        if (hist.length > 0) setMessages(hist);
      } catch {
        /* historial opcional */
      }
    })();
  }, [open, authed, historyLoaded]);

  const sendToAi = useCallback(
    async (text: string) => {
      const history = messages
        .filter((m) => !m.local && !m.isError)
        .map((m) => ({ role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model', text: m.text }));

      setMessages((prev) => [...prev, { role: 'user', text }]);
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
    },
    [messages, providerType],
  );

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || loading || !authed) return;
    setInput('');
    void sendToAi(text);
  }, [input, loading, authed, sendToAi]);

  // Click en una FAQ: visitante → respuesta local; autenticado → al modelo.
  const askFaq = useCallback(
    (item: { q: string; a: string }) => {
      if (authed) {
        void sendToAi(item.q);
      } else {
        setMessages((prev) => [
          ...(prev.length ? prev : [greeting]),
          { role: 'user', text: item.q },
          { role: 'ofi', text: item.a, local: true },
        ]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authed, sendToAi],
  );

  if (!mounted) return null;

  const showStarters = messages.length === 0;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[88px] right-4 sm:right-6 z-[99998] flex flex-col w-[min(380px,calc(100vw-32px))] h-[min(560px,calc(100vh-150px))] glass-card rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
              <span className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-amber to-amber-dark flex items-center justify-center flex-shrink-0">
                <Image src="/images/ofi.png" alt="Ofi" width={36} height={36} className="object-cover" />
              </span>
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5">
              {view.map((m, i) => (
                <Bubble key={i} msg={m} />
              ))}
              {loading && <TypingBubble />}

              {/* FAQs como punto de partida */}
              {showStarters && (
                <div className="mt-1 flex flex-col gap-2">
                  <p className="text-[11px] text-white/40 px-1">Preguntas frecuentes</p>
                  {FAQ_ITEMS.map((item) => (
                    <button
                      key={item.q}
                      onClick={() => askFaq(item)}
                      className="text-left text-[12.5px] text-white/85 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-xl px-3 py-2 transition-colors"
                    >
                      {item.q}
                    </button>
                  ))}
                  {!authed && (
                    <p className="text-[11px] text-white/40 px-1 mt-1">
                      Para asistencia personalizada,{' '}
                      <Link href="/login" className="text-amber hover:underline">
                        inicia sesión
                      </Link>
                      .
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Input (solo autenticados; visitante usa las FAQ) */}
            <div className="flex items-center gap-2 px-3 py-3 border-t border-white/10 bg-white/[0.02]">
              <input
                type="text"
                value={input}
                disabled={!authed}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
                placeholder={authed ? 'Escribe tu mensaje…' : 'Inicia sesión para chatear'}
                className="flex-1 bg-white/[0.05] border border-white/10 rounded-full px-4 py-2.5 text-white text-[13px] placeholder:text-white/30 outline-none focus:border-amber/40 transition-colors disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim() || !authed}
                aria-label="Enviar"
                className="w-10 h-10 rounded-full bg-gradient-to-br from-amber to-amber-dark text-black flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-opacity"
              >
                <Send size={17} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB — esquina inferior derecha, por encima del botón de WhatsApp */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir asistente Ofi"
        className="fixed bottom-5 right-4 sm:right-6 z-[99998] w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-amber to-amber-dark text-black flex items-center justify-center shadow-[0_8px_24px_rgba(255,143,0,0.45)]"
      >
        {open ? (
          <X size={24} />
        ) : (
          <Image src="/images/ofi.png" alt="Ofi" width={56} height={56} className="object-cover" />
        )}
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
