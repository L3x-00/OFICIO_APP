'use client';

import { GraceProvider } from '@/lib/api';
import { StatusBadge } from './status-badge';
import { formatDate } from '@/lib/utils';
import { Phone, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Props {
  providers: GraceProvider[];
}

export function GraceProvidersTable({ providers }: Props) {
  if (providers.length === 0) {
    return (
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-12 text-center">
        <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-gray-600" size={32} />
        </div>
        <p className="text-gray-500 font-medium">No hay proveedores en periodo de gracia</p>
        <p className="text-gray-600 text-sm mt-1">Todos los servicios están al día con sus suscripciones.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Proveedor</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Categoría / Localidad</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Vence el</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Estado</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Verif.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {providers.map((sub) => {
              // Lógica de color de fila basada en urgencia
              const isCritico = sub.daysLeft <= 3;
              
              return (
                <tr
                  key={sub.id}
                  className={`transition-colors ${
                    isCritico 
                      ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]' 
                      : sub.isUrgent 
                        ? 'bg-orange-500/[0.03] hover:bg-orange-500/[0.06]' 
                        : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-sm">
                        {sub.provider.businessName}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="p-1 bg-white/5 rounded">
                          <Phone size={10} className="text-blue-400" />
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                          {sub.provider.phone}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full w-fit">
                        {sub.provider.category.name}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        {sub.provider.locality.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-300 font-medium">
                    {formatDate(sub.endDate)}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center items-center gap-2">
                      {isCritico && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                      <StatusBadge
                        label={`${sub.daysLeft} días`}
                        variant={
                          sub.daysLeft <= 3 ? 'danger' : sub.daysLeft <= 7 ? 'warning' : 'success'
                        }
                      />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      {sub.provider.isVerified ? (
                        <div className="bg-green-500/10 p-1 rounded-full">
                          <CheckCircle size={16} className="text-green-500" />
                        </div>
                      ) : (
                        <div className="bg-white/5 p-1 rounded-full">
                          <XCircle size={16} className="text-gray-600" />
                        </div>
                      )}
                    </div>
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