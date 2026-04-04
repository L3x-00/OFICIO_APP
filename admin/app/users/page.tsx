import { UsersList } from '@/components/users-list';

export const dynamic = 'force-dynamic';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
        <p className="text-gray-400 text-sm mt-1">
          Visualiza, filtra y gestiona todos los usuarios de la plataforma
        </p>
      </div>
      <UsersList />
    </div>
  );
}
