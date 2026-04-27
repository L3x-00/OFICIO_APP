'use client';

import { Plus, ArrowUpRight } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description?: string;
  price?: number;
}

interface Props {
  items: Service[];
  isNegocio: boolean;
  plan: string;
  maxItems: number;
  onAdd: () => void;
  onUpgrade: () => void;
}

export default function ServicesList({
  items,
  isNegocio,
  plan,
  maxItems,
  onAdd,
  onUpgrade,
}: Props) {
  const currentCount = items.length;
  const isAtLimit = currentCount >= maxItems;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">
          {isNegocio ? 'Productos' : 'Servicios'}
        </h2>
        <button
          onClick={onAdd}
          disabled={isAtLimit}
          className="bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-button text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Añadir
        </button>
      </div>

      {/* Indicador de límite */}
      <div className="bg-bg-card border border-white/5 rounded-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-secondary text-sm">
            {currentCount}/{maxItems} {isNegocio ? 'productos' : 'servicios'} (Plan {plan})
          </span>
          {isAtLimit && (
            <span className="text-primary text-xs font-medium">
              Límite alcanzado
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-bg-input rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{
              width: `${Math.min((currentCount / maxItems) * 100, 100)}%`,
            }}
          />
        </div>
        {isAtLimit && (
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-1 text-primary text-sm mt-3 hover:underline"
          >
            Subir de plan <ArrowUpRight size={14} />
          </button>
        )}
      </div>

      {/* Lista de servicios */}
      {items.length === 0 ? (
        <div className="bg-bg-card border border-white/5 rounded-card p-8 text-center">
          <p className="text-text-muted">
            Aún no has añadido {isNegocio ? 'productos' : 'servicios'}.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-bg-card border border-white/5 rounded-card p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-text-primary font-medium text-sm">
                  {item.name}
                </p>
                {item.description && (
                  <p className="text-text-muted text-xs mt-1">
                    {item.description}
                  </p>
                )}
              </div>
              {isNegocio && item.price != null && (
                <span className="text-primary font-bold text-sm">
                  S/. {item.price.toFixed(2)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}