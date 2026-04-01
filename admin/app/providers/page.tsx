import { getProviders } from '@/lib/api';
import { StatusBadge } from '@/components/status-badge';
import { CheckCircle, XCircle, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page) : 1;
  const search = params.search;

  const result = await getProviders(page, search);

  const availabilityLabel: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
    DISPONIBLE: { label: 'Disponible', variant: 'success' },
    OCUPADO:    { label: 'Ocupado',    variant: 'danger'  },
    CON_DEMORA: { label: 'Con demora', variant: 'warning' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Proveedores</h1>
          <p className="text-gray-400 text-sm mt-1">
            {result.total} proveedores registrados
          </p>
        </div>
      </div>

      {/* Buscador */}
      <form method="GET" action="/providers">
        <input
          name="search"
          defaultValue={search}
          placeholder="Buscar por nombre..."
          className="w-full max-w-md bg-bg-card border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50"
        />
      </form>

      {/* Tabla */}
      <div className="bg-bg-card rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {['Proveedor', 'Categoría', 'Localidad', 'Calificación', 'Disponibilidad', 'Verificado', 'Visible'].map((h) => (
                <th key={h} className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {result.data.map((provider) => {
              const avail = availabilityLabel[provider.availability] ?? {
                label: provider.availability,
                variant: 'muted' as const,
              };

              return (
                <tr key={provider.id} className="hover:bg-white/2">
                  <td className="p-4">
                    <p className="font-medium text-white text-sm">
                      {provider.businessName}
                    </p>
                    <p className="text-xs text-gray-500">{provider.phone}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-300">
                    {provider.category.name}
                  </td>
                  <td className="p-4 text-sm text-gray-300">
                    {provider.locality.name}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Star size={13} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-sm text-white">
                        {provider.averageRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({provider.totalReviews})
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge label={avail.label} variant={avail.variant} />
                  </td>
                  <td className="p-4">
                    {provider.isVerified
                      ? <CheckCircle size={18} className="text-green-400" />
                      : <XCircle size={18} className="text-gray-600" />
                    }
                  </td>
                  <td className="p-4">
                    {provider.isVisible
                      ? <CheckCircle size={18} className="text-green-400" />
                      : <XCircle size={18} className="text-red-400" />
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}