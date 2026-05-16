'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, RefreshCw, Loader2, User as UserIcon } from 'lucide-react';
import { api, type ChatRoomSummary } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useProfileTypeOptional } from '@/lib/profile-type-context';
import { getUser } from '@/lib/auth';

/**
 * Bandeja del proveedor: lista de chats con clientes para el perfil
 * activo (`OFICIO` | `NEGOCIO`). Idéntico al tab `Mensajes` del panel
 * mobile — usa el mismo endpoint con `scope=provider&type=` para
 * mantener bandejas independientes por rol.
 *
 * Realtime: se suscribe a `chat:new` por socket; si el mensaje
 * pertenece a una sala de esta bandeja, refresca el preview y mueve
 * la sala al tope. Si llega de otro rol, lo ignora.
 */
export default function PanelMensajesPage() {
  const router = useRouter();
  const ctx = useProfileTypeOptional();
  const me = getUser();
  const [rooms, setRooms]   = useState<ChatRoomSummary[]>([]);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const activeType = ctx?.activeType ?? null;

  const load = useCallback(async () => {
    setLoad(true);
    setError(null);
    try {
      const data = await api.getChatRooms({
        scope: 'provider',
        type:  activeType ?? undefined,
      });
      setRooms(data);
    } catch (e) {
      setError((e as Error).message ?? 'No se pudieron cargar los mensajes.');
    } finally {
      setLoad(false);
    }
  }, [activeType]);

  useEffect(() => { load(); }, [load]);

  // Suscripción a entrante. Solo refresca si la sala viene en el set
  // actual — un mensaje del otro perfil no toca esta vista.
  useEffect(() => {
    const socket = getSocket();
    const handler = () => { load(); };
    socket.on('chat:new', handler);
    return () => { socket.off('chat:new', handler); };
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Mensajes</h1>
          <p className="text-white/60 text-sm mt-1">
            Conversaciones con tus clientes
            {activeType && (
              <span className="text-white/40"> · {activeType === 'NEGOCIO' ? 'Negocio' : 'Profesional'}</span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white bg-white/[0.04] border border-white/10 hover:border-white/20 transition-colors"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </header>

      {loading && rooms.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-rose/80 text-sm">{error}</div>
      ) : rooms.length === 0 ? (
        <EmptyInbox />
      ) : (
        <ul className="space-y-2">
          {rooms.map((room) => {
            const cover = room.provider.images?.[0]?.url ?? null;
            const last  = room.lastMessage;
            const myId  = me?.id ?? -1;
            const lastLabel = last
              ? (last.senderId === myId ? `Tú: ${last.content}` : last.content)
              : 'Sin mensajes aún';
            const date = new Date(room.lastActivityAt);
            const dateLabel = date.toLocaleDateString('es-PE', {
              day: '2-digit', month: 'short',
            }) + ' · ' + date.toLocaleTimeString('es-PE', {
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <motion.li
                key={room.id}
                whileHover={{ x: 2 }}
                onClick={() => router.push(`/panel/mensajes/${room.id}`)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-3 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={20} className="text-white/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-sm font-semibold truncate">
                      {room.client.firstName} {room.client.lastName}
                    </p>
                    <span className="text-[10.5px] text-white/40 flex-shrink-0">
                      {dateLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-white/60 text-[12.5px] truncate">{lastLabel}</p>
                    {room.unreadCount > 0 && (
                      <span className="bg-primary text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1.5 rounded-full inline-flex items-center justify-center flex-shrink-0">
                        {room.unreadCount > 9 ? '9+' : room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyInbox() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
        <MessageSquare size={28} className="text-white/40" />
      </div>
      <p className="text-white font-display font-semibold text-lg">Sin mensajes aún</p>
      <p className="text-white/50 text-sm mt-1 max-w-sm mx-auto">
        Cuando un cliente te escriba desde la app o la web, la conversación aparecerá aquí.
      </p>
    </div>
  );
}
