import { ProvidersList } from '../../components/providers-list';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Proveedores</h1>
          <p className="text-gray-400 text-sm mt-1">
            Crea, edita y gestiona todos los proveedores de la plataforma
          </p>
        </div>
      </div>

      {/* Componente cliente con CRUD completo */}
      <ProvidersList
        initialPage={params.page ? parseInt(params.page) : 1}
        initialSearch={params.search ?? ''}
      />
    </div>
  );
}