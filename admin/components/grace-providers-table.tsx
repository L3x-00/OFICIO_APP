import { GraceProvider } from '@/lib/api';
import { StatusBadge } from './status-badge';
import { formatDate } from '@/lib/utils';
import { Phone, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  providers: GraceProvider[];
}

export function GraceProvidersTable({ providers }: Props) {
  if (providers.length === 0) {
    return (
      <div className="bg-bg-card rounded-2xl border border-white/5 p-12 text-center">
        <p className="text-gray-500">No hay proveedores en periodo de gracia</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-2xl border border-white/5 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Proveedor
            </th>
            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Categoría
            </th>
            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Localidad
            </th>
            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Vence
            </th>
            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Días restantes
            </th>
            <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Verificado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {providers.map((sub) => (
            <tr
              key={sub.id}
              className={
                sub.isUrgent
                  ? 'bg-orange-500/5 hover:bg-orange-500/8'
                  : 'hover:bg-white/2'
              }
            >
              <td className="p-4">
                <div>
                  <p className="font-semibold text-white text-sm">
                    {sub.provider.businessName}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Phone size={11} className="text-gray-500" />
                    <span className="text-xs text-gray-500">
                      {sub.provider.phone}
                    </span>
                  </div>
                </div>
              </td>
              <td className="p-4">
                <span className="text-sm text-gray-300">
                  {sub.provider.category.name}
                </span>
              </td>
              <td className="p-4">
                <span className="text-sm text-gray-300">
                  {sub.provider.locality.name}
                </span>
              </td>
              <td className="p-4">
                <span className="text-sm text-gray-300">
                  {formatDate(sub.endDate)}
                </span>
              </td>
              <td className="p-4">
                <StatusBadge
                  label={`${sub.daysLeft} días`}
                  variant={
                    sub.daysLeft <= 3
                      ? 'danger'
                      : sub.daysLeft <= 7
                      ? 'warning'
                      : 'success'
                  }
                />
              </td>
              <td className="p-4">
                {sub.provider.isVerified ? (
                  <CheckCircle size={18} className="text-green-400" />
                ) : (
                  <XCircle size={18} className="text-gray-600" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}