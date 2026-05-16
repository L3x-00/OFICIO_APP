'use client';

import { useEffect, useMemo, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { api, type ChatMessage } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { getUser } from '@/lib/auth';

/**
 * Pantalla de conversación entre proveedor y cliente. Mismo backend que
 * el mobile (`/chat/rooms/:id/messages` + `POST /chat/messages`).
 *
 * Socket: escucha `chat:new` y filtra por roomId. Marca leído al abrir
 * vía `PATCH /chat/rooms/:id/read`.
 *
 * Next 15.5: `params` es Promise — se resuelve con `use()` para no
 * convertir el componente en async (necesario para useState/effects).
 */
export default function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId: roomIdStr } = use(params);
  const roomId = parseInt(roomIdStr, 10);
  const router = useRouter();
  const me = getUser();
  const myId = me?.id ?? -1;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoad]      = useState(true);
  const [sending, setSending]   = useState(false);
  const [text, setText]         = useState('');
  const [error, setError]       = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Carga inicial — backend devuelve `createdAt desc`; invertimos para
  // render cronológico ascendente.
  useEffect(() => {
    if (!Number.isFinite(roomId)) {
      setError('Sala inválida.');
      setLoad(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const page = await api.getChatMessages(roomId, 1, 50);
        if (!alive) return;
        setMessages([...page.items].reverse());
        api.markChatRoomRead(roomId).catch(() => {});
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message ?? 'No se pudo cargar la conversación.');
      } finally {
        if (alive) setLoad(false);
      }
    })();
    return () => { alive = false; };
  }, [roomId]);

  // Realtime: cualquier `chat:new` cuya sala coincida se appendea.
  useEffect(() => {
    const socket = getSocket();
    const handler = (payload: unknown) => {
      const msg = payload as ChatMessage;
      if (!msg || msg.chatRoomId !== roomId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      api.markChatRoomRead(roomId).catch(() => {});
    };
    socket.on('chat:new', handler);
    return () => { socket.off('chat:new', handler); };
  }, [roomId]);

  // Autoscroll al fondo cuando llegan nuevos mensajes.
  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  async function send() {
    const content = text.trim();
    if (!content || sending || myId < 0) return;
    setSending(true);
    setText('');
    try {
      const msg = await api.sendChatMessage({
        chatRoomId: roomId,
        senderId:   myId,
        content,
      });
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    } catch (e) {
      setError((e as Error).message ?? 'No se pudo enviar el mensaje.');
      setText(content); // restaura el draft si falló
    } finally {
      setSending(false);
    }
  }

  const groupedByDay = useMemo(() => groupByDay(messages), [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] -m-4 sm:-m-6 md:m-0">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-dark-surface/60 backdrop-blur">
        <button
          onClick={() => router.push('/panel/mensajes')}
          aria-label="Volver"
          className="p-2 -ml-2 text-white/60 hover:text-white rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-display font-semibold truncate">Conversación</h1>
        </div>
      </header>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {loading ? (
          <div className="flex justify-center pt-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : error ? (
          <div className="text-center pt-12 text-rose/80 text-sm">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-center pt-12 text-white/40 text-sm">
            Sé el primero en escribir.
          </div>
        ) : (
          groupedByDay.map(({ day, items }) => (
            <div key={day} className="space-y-1.5">
              <div className="text-center">
                <span className="text-[10.5px] uppercase tracking-wider text-white/30 bg-white/5 px-2.5 py-0.5 rounded-full">
                  {day}
                </span>
              </div>
              {items.map((m) => {
                const mine = m.senderId === myId;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-snug ${
                      mine
                        ? 'ml-auto bg-primary text-white rounded-br-sm'
                        : 'mr-auto bg-white/8 text-white rounded-bl-sm'
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap">{m.content}</p>
                    <span className={`block text-[10px] mt-1 ${
                      mine ? 'text-white/70 text-right' : 'text-white/40'
                    }`}>
                      {new Date(m.createdAt).toLocaleTimeString('es-PE', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-end gap-2 p-3 border-t border-white/10 bg-dark-surface/60 backdrop-blur safe-bottom"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escribe un mensaje…"
          rows={1}
          className="flex-1 resize-none bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60 max-h-32"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary-light transition-colors flex-shrink-0"
          aria-label="Enviar"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

/** Agrupa por día calendario para insertar separadores tipo "Hoy", "Ayer", fecha. */
function groupByDay(messages: ChatMessage[]): Array<{ day: string; items: ChatMessage[] }> {
  const groups = new Map<string, ChatMessage[]>();
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const key = d.toDateString();
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400_000).toDateString();
  return Array.from(groups.entries()).map(([key, items]) => {
    let day: string;
    if (key === today)         day = 'Hoy';
    else if (key === yesterday) day = 'Ayer';
    else day = new Date(key).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    return { day, items };
  });
}
