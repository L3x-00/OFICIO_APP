'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Send, Loader2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, type ChatMessage } from '@/lib/api';

interface Props {
  providerId: number;
  clientId: number;
  businessName: string;
  onClose: () => void;
}

/** Refresco mientras el panel está abierto (el web no tiene socket propio). */
const POLL_MS = 8000;

/**
 * Hilo de chat embebido en la ficha pública.
 *
 * Vive acá y no en `/panel/mensajes` porque esa bandeja pertenece al panel
 * del PROVEEDOR: un cliente sin perfil de proveedor es expulsado a /cliente
 * por el gate del layout. Usa los mismos endpoints que el móvil
 * (`POST /chat/rooms` idempotente → mensajes de la sala).
 */
export default function ProfileChatPanel({ providerId, clientId, businessName, onClose }: Props) {
  const [roomId, setRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (id: number) => {
    const page = await api.getChatMessages(id, 1, 40);
    // El backend pagina del más reciente al más antiguo.
    setMessages([...page.items].reverse());
  }, []);

  // Abrir sala (idempotente) + primera carga
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const room = await api.createChatRoom(clientId, providerId);
        if (!alive) return;
        setRoomId(room.id);
        await loadMessages(room.id);
        void api.markChatRoomRead(room.id).catch(() => {});
      } catch {
        if (alive) setError('No se pudo abrir el chat. Intenta de nuevo.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [clientId, providerId, loadMessages]);

  // Refresco periódico mientras el panel sigue abierto
  useEffect(() => {
    if (roomId == null) return;
    const t = setInterval(() => {
      void loadMessages(roomId).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
  }, [roomId, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = async () => {
    const content = text.trim();
    if (!content || roomId == null || sending) return;
    setSending(true);
    try {
      const sent = await api.sendChatMessage({ chatRoomId: roomId, senderId: clientId, content });
      setMessages((prev) => [...prev, sent]);
      setText('');
    } catch {
      toast.error('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100000] flex justify-end bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.aside
          role="dialog"
          aria-label={`Chat con ${businessName}`}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md h-full flex flex-col bg-white dark:bg-dark-card border-l border-gray-200 dark:border-white/10 shadow-2xl"
        >
          <header className="flex items-center gap-3 px-5 h-16 border-b border-gray-200 dark:border-white/10 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageCircle size={17} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {businessName}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-white/45">Chat de Servi</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar chat"
              className="ml-auto w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <Loader2 className="animate-spin" size={22} />
              </div>
            ) : error ? (
              <p className="text-sm text-rose-500 text-center mt-8">{error}</p>
            ) : messages.length === 0 ? (
              <div className="text-center mt-10 px-4">
                <p className="text-sm font-medium text-gray-700 dark:text-white/80">
                  Escribe el primer mensaje
                </p>
                <p className="text-xs text-gray-500 dark:text-white/45 mt-1">
                  Cuéntale a {businessName} qué necesitas y cuándo.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.senderId === clientId;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                      mine
                        ? 'ml-auto bg-primary text-white rounded-br-md'
                        : 'mr-auto bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white/85 rounded-bl-md'
                    }`}
                  >
                    {m.content}
                  </motion.div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-gray-200 dark:border-white/10 p-3 flex items-end gap-2 shrink-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Escribe tu mensaje…"
              disabled={loading || !!error}
              className="flex-1 resize-none max-h-28 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-primary/40 transition-colors"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !text.trim() || loading || !!error}
              aria-label="Enviar mensaje"
              className="w-11 h-11 shrink-0 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all"
            >
              {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
