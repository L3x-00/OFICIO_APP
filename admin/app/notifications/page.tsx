import { NotificationsList } from '@/components/notifications-list';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Historial de Notificaciones</h1>
        <p className="text-gray-400 text-sm mt-1">
          Notificaciones enviadas a proveedores sobre su estado de verificación
        </p>
      </div>
      <NotificationsList />
    </div>
  );
}
