import { AdminTabs } from '@/components/admin-tabs';
import { ProvidersList } from '@/components/providers-list';
import { UsersList } from '@/components/users-list';

export const dynamic = 'force-dynamic';

/**
 * Vista unificada de gestión de cuentas en 3 tabs estrictos:
 *   • clients    → `role=USUARIO` (sin perfil de proveedor).
 *   • providers  → `role=PROVEEDOR` (tienen ≥1 perfil en `providers`).
 *   • dual       → `role=DUAL` (PROVEEDOR + perfil activo).
 *
 * Cada tab usa `UsersList` con `lockedRole` para que la tab sea la
 * única fuente del filtro (el dropdown se oculta). El tab "providers"
 * sigue mostrando `ProvidersList` (la tabla rica con suscripción,
 * categoría, etc.) — `UsersList` queda como vista secundaria si se
 * necesita ver más tarde.
 *
 * El query `?search=...` se reenvía al tab `providers` para mantener
 * compat con la búsqueda global del topbar.
 */
export default async function ManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const initialSearch = params.search ?? '';
  const initialPage   = params.page ? parseInt(params.page) : 1;

  const initialTab =
    params.tab === 'clients' || params.tab === 'dual'
      ? params.tab
      : 'providers';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Gestión de cuentas</h1>
        <p className="text-gray-400 text-sm mt-1">
          Tres vistas estrictas: clientes puros, proveedores y usuarios duales (ambos roles).
        </p>
      </div>

      <AdminTabs
        initial={initialTab}
        tabs={[
          {
            key: 'clients',
            label: 'Clientes',
            content: <UsersList initialRole="USUARIO" lockedRole />,
          },
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
            key: 'dual',
            label: 'Duales (ambos roles)',
            content: <UsersList initialRole="DUAL" lockedRole />,
          },
        ]}
      />
    </div>
  );
}
