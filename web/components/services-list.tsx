'use client';

import { motion } from 'framer-motion';
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-white">
          {isNegocio ? 'Productos' : 'Servicios'}
        </h2>
        <button
          onClick={onAdd}
          disabled={isAtLimit}
          className="btn btn-primary btn-sm press-effect disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Añadir
        </button>
      </div>

      {/* Indicador de límite */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/60 text-sm">
            {currentCount}/{maxItems} {isNegocio ? 'productos' : 'servicios'} <span className="text-white/30">(Plan {plan})</span>
          </span>
          {isAtLimit && (
            <span className="text-primary-light text-xs font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-light animate-pulse-soft" />
              Límite alcanzado
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((currentCount / maxItems) * 100, 100)}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="h-full bg-gradient-primary rounded-full shadow-glow-sm" 
          />
        </div>
        {isAtLimit && (
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-1.5 text-primary-light text-sm mt-4 hover:text-white transition-colors group"
          >
            Subir de plan <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        )}
      </div>

      {/* Lista de servicios */}
      {items.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center">
          <p className="text-white/40 text-sm">
            Aún no has añadido {isNegocio ? 'productos' : 'servicios'}.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="glass glass-hover rounded-xl p-4 flex items-center justify-between cursor-default"
            >
              <div>
                <p className="text-white font-medium text-sm">
                  {item.name}
                </p>
                {item.description && (
                  <p className="text-white/40 text-xs mt-1">
                    {item.description}
                  </p>
                )}
              </div>
              {isNegocio && item.price != null && (
                <span className="text-primary-light font-bold text-sm bg-primary/10 px-3 py-1 rounded-lg">
                  S/. {item.price.toFixed(2)}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}