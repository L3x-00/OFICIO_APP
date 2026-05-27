'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  RefreshCw,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { api, type ChatRoomSummary } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useProfileTypeOptional } from '@/lib/profile-type-context';
import { getUser } from '@/lib/auth';

interface Props {
  /** Sala activa actualmente abierta — recibe el highlight visual. */
  activeRoomId?: number;
  /** Click en una sala. En desktop swap el roomId; en mobile navega. */
  onSelectRoom: (roomId: number) => void;
  /** Cuando es true, el header pesa más (uso standalone como /mensajes).
   *  Cuando es false, vive en una columna lateral del chat (más compacto). */
  variant?: 'standalone' | 'sidebar';
}

/**
 * Lista de salas de chat del proveedor para el perfil activo.
 *
 * Componente compartido entre:
 *   • `/panel/mensajes`              — vista lista pura (mobile + desktop).
 *   • `/panel/mensajes/[roomId]`     — columna izquierda del split-view
 *     en desktop (≥ md).
 *
 * Realtime: se suscribe a `chat:new` y refresca la bandeja entera —
 * suficiente para mover salas al tope y actualizar previews/contadores.
 */
export default function ChatRoomsList({
  activeRoomId,
  onSelectRoom,
  variant = 'standalone',
}: Props) {
  const ctx = useProfileTypeOptional();
  const me = getUser();
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeType = ctx?.activeType ?? null;

  const load = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const handler = () => { load(); };
    socket.on('chat:new', handler);
    return () => { socket.off('chat:new', handler); };
  }, [load]);

  return (
    <div className="flex flex-col h-full">
      <header className={`flex items-center justify-between gap-3 px-4 ${
        variant === 'standalone' ? 'pt-6 pb-3' : 'py-3 border-b border-white/10'
      }`}>
        <div>
          <h2 className={`font-display font-bold text-white ${
            variant === 'standalone' ? 'text-2xl' : 'text-base'
          }`}>
            Mensajes
          </h2>
          {variant === 'standalone' && (
            <p className="text-white/60 text-sm mt-1">
              Conversaciones con tus clientes
              {activeType && (
                <span className="text-white/40"> · {activeType === 'NEGOCIO' ? 'Negocio' : 'Profesional'}</span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={load}
          aria-label="Actualizar"
          className="p-2 rounded-lg text-white/60 hover:text-white bg-white/[0.04] border border-white/10 hover:border-white/20 transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading && rooms.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-10 text-rose-300/80 text-sm">{error}</div>
        ) : rooms.length === 0 ? (
          <EmptyInbox />
        ) : (
          <ul className="space-y-1">
            {rooms.map((room) => (
              <RoomTile
                key={room.id}
                room={room}
                me={me?.id ?? -1}
                isActive={room.id === activeRoomId}
                onClick={() => onSelectRoom(room.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RoomTile({
  room,
  me,
  isActive,
  onClick,
}: {
  room: ChatRoomSummary;
  me: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const cover = room.provider.images?.[0]?.url ?? null;
  const last = room.lastMessage;
  const lastLabel = last
    ? (last.senderId === me ? `Tú: ${last.content}` : last.content)
    : 'Sin mensajes aún';
  const date = new Date(room.lastActivityAt);
  const time = date.toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.li
      whileHover={{ x: 2 }}
      onClick={onClick}
      className={`cursor-pointer rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors border ${
        isActive
          ? 'bg-primary/15 border-primary/30 shadow-glow-sm'
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06]'
      }`}
    >
      <div className="relative w-11 h-11 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden">
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <UserIcon size={18} className="text-white/40" />
        )}
        {room.unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold inline-flex items-center justify-center leading-none tabular-nums shadow-glow-sm">
            {room.unreadCount > 9 ? '9+' : room.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-white text-sm font-semibold truncate">
            {room.client.firstName} {room.client.lastName}
          </p>
          <span className="text-[10.5px] text-white/40 flex-shrink-0">
            {time}
          </span>
        </div>
        <p className={`text-[12.5px] truncate mt-0.5 ${
          room.unreadCount > 0 ? 'text-white/80 font-medium' : 'text-white/55'
        }`}>
          {lastLabel}
        </p>
      </div>
    </motion.li>
  );
}

function EmptyInbox() {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 mb-3">
        <MessageSquare size={24} className="text-white/40" />
      </div>
      <p className="text-white font-display font-semibold text-base">Sin mensajes aún</p>
      <p className="text-white/50 text-xs mt-1 max-w-xs mx-auto">
        Cuando un cliente te escriba, la conversación aparecerá aquí.
      </p>
    </div>
  );
}
