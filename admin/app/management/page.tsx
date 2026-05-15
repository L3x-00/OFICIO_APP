import { AdminTabs } from '@/components/admin-tabs';
import { ProvidersList } from '@/components/providers-list';
import { UsersList } from '@/components/users-list';

export const dynamic = 'force-dynamic';

/**
 * Vista unificada de gestión de cuentas: Proveedores + Usuarios en tabs.
 * El query string `?search=...` se reenvía al primer tab (Proveedores)
 * para soportar la búsqueda global del topbar.
 */
export default async function ManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const initialSearch = params.search ?? '';
  const initialPage   = params.page ? parseInt(params.page) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Gestión de cuentas</h1>
        <p className="text-gray-400 text-sm mt-1">
          Proveedores y usuarios unificados — cambia entre pestañas sin perder el filtro.
        </p>
      </div>

      <AdminTabs
        initial={params.tab === 'users' ? 'users' : 'providers'}
        tabs={[
          {
            key: 'providers',
            label: 'Proveedores',
            content: (
              <ProvidersList
                initialPage={initialPage}
                initialSearch={initialSearch}
              />
            ),
          },
          {
            key: 'users',
            label: 'Usuarios',
            content: <UsersList />,
          },
        ]}
      />
    </div>
  );
}
