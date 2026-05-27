'use client';

import { useRouter } from 'next/navigation';
import ChatRoomsList from '@/components/chat/chat-rooms-list';

/**
 * Bandeja del proveedor: lista de chats con clientes para el perfil
 * activo (`OFICIO` | `NEGOCIO`).
 *
 * En desktop el split-view (lista + conversación) vive en
 * `/panel/mensajes/[roomId]`. Esta ruta es la vista "solo lista" — se
 * usa cuando aún no hay sala seleccionada o en mobile.
 *
 * Toda la lógica (REST + socket `chat:new` + filtros por scope/type)
 * vive en `ChatRoomsList` para compartirla con la vista del room.
 */
export default function PanelMensajesPage() {
  const router = useRouter();
  return (
    <div className="-mx-4 sm:-mx-6 md:-mx-8 h-[calc(100vh-4rem)]">
      <ChatRoomsList
        variant="standalone"
        onSelectRoom={(roomId) => router.push(`/panel/mensajes/${roomId}`)}
      />
    </div>
  );
}
