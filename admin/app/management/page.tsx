import { ManagementHeader } from '@/components/management/management-header';
import { ManagementTabs } from '@/components/management/management-tabs';

export const dynamic = 'force-dynamic';

/**
 * Página de Gestión — primer módulo migrado al sistema de design de
 * Servi Admin (shadcn-style: Tabs + Card + Button + Badge).
 *
 * Hot-swap pattern: el contenido de cada tab sigue usando los
 * componentes existentes (`ProvidersList`, `UsersList`) ENVUELTOS en
 * los nuevos primitives. Si querés revertir a la versión anterior,
 * basta con cambiar este file a importar los componentes directo.
 */
export default async function ManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab =
    params.tab === 'clients' || params.tab === 'dual' ? params.tab : 'providers';

  return (
    <div className="space-y-6">
      <ManagementHeader />
      <ManagementTabs
        initialTab={initialTab}
        initialSearch={params.search ?? ''}
        initialPage={params.page ? parseInt(params.page, 10) : 1}
      />
    </div>
  );
}
