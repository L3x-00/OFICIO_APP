'use client';

import { useEffect, useMemo, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader2, User as UserIcon } from 'lucide-react';
import { api, type ChatMessage, type ChatRoomSummary } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { getUser } from '@/lib/auth';
import ChatRoomsList from '@/components/chat/chat-rooms-list';
import { useProfileTypeOptional } from '@/lib/profile-type-context';

/**
 * Vista de conversación con split-view tipo WhatsApp Web:
 *   • Mobile (< md): SOLO la conversación a pantalla completa. Botón
 *     "atrás" vuelve a /panel/mensajes (lista).
 *   • Desktop (≥ md): lista de salas a la izquierda + conversación a
 *     la derecha. Click en otra sala swap del param sin recargar.
 *
 * Backend intacto — mismo `/chat/rooms/:id/messages` + `POST /chat/messages`.
 * Socket `chat:new` se usa para append en tiempo real.
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
  const ctx = useProfileTypeOptional();
  const activeType = ctx?.activeType ?? null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [room, setRoom]         = useState<ChatRoomSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [text, setText]         = useState('');
  const [error, setError]       = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Carga inicial — mensajes + metadata del room (para mostrar nombre
  // y avatar del cliente en el header). Backend devuelve `createdAt desc`
  // así que invertimos para render cronológico.
  useEffect(() => {
    if (!Number.isFinite(roomId)) {
      setError('Sala inválida.');
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [page, rooms] = await Promise.all([
          api.getChatMessages(roomId, 1, 50),
          api.getChatRooms({ scope: 'provider', type: activeType ?? undefined }),
        ]);
        if (!alive) return;
        setMessages([...page.items].reverse());
        setRoom(rooms.find((r) => r.id === roomId) ?? null);
        api.markChatRoomRead(roomId).catch(() => {});
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message ?? 'No se pudo cargar la conversación.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [roomId, activeType]);

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

  // Autoscroll al fondo al llegar mensajes nuevos.
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
      setText(content);
    } finally {
      setSending(false);
    }
  }

  const groupedByDay = useMemo(() => groupByDay(messages), [messages]);
  const clientName = room
    ? `${room.client.firstName} ${room.client.lastName}`.trim() || 'Cliente'
    : 'Conversación';
  const clientInitial = room?.client.firstName?.charAt(0)?.toUpperCase() ?? '?';
  const clientAvatar = room?.client.avatarUrl ?? null;

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 md:-mx-8">
      {/* ── Sidebar de salas (solo desktop) ──────────────── */}
      <aside className="hidden md:flex w-80 lg:w-96 flex-shrink-0 border-r border-white/10 bg-dark-surface/40">
        <ChatRoomsList
          variant="sidebar"
          activeRoomId={roomId}
          onSelectRoom={(id) => router.push(`/panel/mensajes/${id}`)}
        />
      </aside>

      {/* ── Conversación ─────────────────────────────────── */}
      <section className="flex-1 flex flex-col min-w-0 bg-dark-surface/20">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-dark-surface/60 backdrop-blur">
          <button
            onClick={() => router.push('/panel/mensajes')}
            aria-label="Volver"
            className="md:hidden p-2 -ml-2 text-white/60 hover:text-white rounded-lg hover:bg-white/5"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-9 h-9 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {clientAvatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={clientAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold">
                {clientInitial}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-display font-semibold truncate text-sm sm:text-base">
              {clientName}
            </h1>
            <p className="text-white/40 text-[11px]">Conversación</p>
          </div>
        </header>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3"
        >
          {loading ? (
            <div className="flex justify-center pt-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : error ? (
            <div className="text-center pt-12 text-rose-300/80 text-sm">{error}</div>
          ) : messages.length === 0 ? (
            <EmptyConversation />
          ) : (
            groupedByDay.map(({ day, items }) => (
              <div key={day} className="space-y-1.5">
                <div className="text-center sticky top-0 z-10 pt-1 pb-1">
                  <span className="text-[10.5px] uppercase tracking-wider text-white/40 bg-dark-surface/80 backdrop-blur border border-white/5 px-2.5 py-0.5 rounded-full">
                    {day}
                  </span>
                </div>
                {items.map((m, idx) => {
                  const mine = m.senderId === myId;
                  // Avatar solo en el primer mensaje del run (mismo
                  // sender consecutivo) — ahorra ruido visual.
                  const showAvatar = !mine && (idx === 0 || items[idx - 1].senderId !== m.senderId);
                  return (
                    <MessageBubble
                      key={m.id}
                      msg={m}
                      mine={mine}
                      showAvatar={showAvatar}
                      avatarUrl={clientAvatar}
                      initial={clientInitial}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-end gap-2 p-3 border-t border-white/10 bg-dark-surface/60 backdrop-blur"
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
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="submit"
            disabled={sending || !text.trim()}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 hover:bg-primary-light transition-colors flex-shrink-0 shadow-glow-sm"
            aria-label="Enviar"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </motion.button>
        </form>
      </section>
    </div>
  );
}

function MessageBubble({
  msg,
  mine,
  showAvatar,
  avatarUrl,
  initial,
}: {
  msg: ChatMessage;
  mine: boolean;
  showAvatar: boolean;
  avatarUrl: string | null;
  initial: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar solo en mensajes ajenos y al inicio del run */}
      {!mine && (
        <div className={`w-7 h-7 rounded-full flex-shrink-0 overflow-hidden ${showAvatar ? '' : 'invisible'}`}>
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/70 text-[11px] font-bold">
              {initial}
            </div>
          )}
        </div>
      )}
      <div
        className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-snug ${
          mine
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-white/[0.08] text-white rounded-bl-sm'
        }`}
      >
        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
        <span className={`block text-[10px] mt-1 ${
          mine ? 'text-white/70 text-right' : 'text-white/40'
        }`}>
          {new Date(msg.createdAt).toLocaleTimeString('es-PE', {
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  );
}

function EmptyConversation() {
  return (
    <div className="text-center pt-16 px-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 mb-3">
        <UserIcon size={24} className="text-white/30" />
      </div>
      <p className="text-white/60 text-sm">Sé el primero en escribir.</p>
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
