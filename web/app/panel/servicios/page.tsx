'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, ArrowUpRight, Package, X } from 'lucide-react';
import type { Provider } from '@/lib/types';

export default function PanelServiciosPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const isNegocio = provider?.type === 'NEGOCIO';

  useEffect(() => {
    async function load() {
      try {
        const prov = await api.getMyProfile();
        setProvider(prov);
      } catch {
        toast.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const plan = provider?.subscription?.plan || 'GRATIS';
  const maxItems = plan === 'PREMIUM' ? Infinity : plan === 'ESTANDAR' ? 6 : 3;
  const currentItems = 0;
  const isAtLimit = currentItems >= maxItems;
  const progressPct = maxItems === Infinity ? 0 : Math.min((currentItems / maxItems) * 100, 100);

  const handleSave = () => {
    toast.success('Servicio guardado (simulado)');
    setShowModal(false);
    setServiceName('');
    setServiceDesc('');
    setServicePrice('');
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-9 w-48 rounded" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-4xl">
      <div data-reveal className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary">
            {isNegocio ? 'Productos' : 'Servicios'}
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Gestiona los {isNegocio ? 'productos' : 'servicios'} de tu perfil.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={isAtLimit}
          className="btn-primary press-effect px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Añadir
        </button>
      </div>

      {/* Indicador de límite */}
      <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-text-primary text-sm font-semibold">
              {currentItems}/{maxItems === Infinity ? '∞' : maxItems}
            </span>
            <span className="text-text-muted text-sm ml-1.5">
              {isNegocio ? 'productos' : 'servicios'} en plan{' '}
              <span className="text-primary font-semibold">{plan}</span>
            </span>
          </div>
          {isAtLimit && (
            <span className="text-amber text-xs font-bold uppercase tracking-wider px-2 py-1 bg-amber/10 rounded-full">
              Límite alcanzado
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-bg-input rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-smooth ${
              progressPct >= 100 ? 'bg-amber' : progressPct >= 80 ? 'bg-yellow-400' : 'bg-gradient-primary'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {isAtLimit && (
          <a
            href="/panel/ajustes"
            className="inline-flex items-center gap-1 text-primary text-sm mt-3 font-semibold hover:text-primary-light transition-colors group"
          >
            Subir de plan
            <ArrowUpRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        )}
      </div>

      {/* Empty state */}
      {currentItems === 0 && (
        <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center animate-float-slow">
            <Package size={36} className="text-primary/60" />
          </div>
          <h3 className="text-text-primary font-semibold text-lg mb-2">
            Aún no has añadido {isNegocio ? 'productos' : 'servicios'}
          </h3>
          <p className="text-text-muted text-sm max-w-sm mx-auto mb-6">
            Añade tu primer {isNegocio ? 'producto' : 'servicio'} para que los clientes vean
            todo lo que ofreces.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary press-effect px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Añadir {isNegocio ? 'producto' : 'servicio'}
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-md animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-text-primary">
                {editingId ? 'Editar' : 'Añadir'} {isNegocio ? 'producto' : 'servicio'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <InputField label="Nombre" value={serviceName} onChange={setServiceName} />
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
                  Descripción
                </label>
                <textarea
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-bg-input border border-white/8 rounded-xl p-3 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.12)] transition-all resize-none"
                  placeholder="Describe brevemente lo que ofreces..."
                />
              </div>
              {isNegocio && (
                <div>
                  <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
                    Precio
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">
                      S/.
                    </span>
                    <input
                      type="number"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      className="w-full bg-bg-input border border-white/8 rounded-xl pl-12 pr-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.12)] transition-all"
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="text-text-muted hover:text-text-secondary px-4 py-2 text-sm transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary press-effect px-6 py-2 rounded-xl text-sm font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-text-secondary text-xs font-medium mb-2 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-input border border-white/8 rounded-xl px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.12)] transition-all"
      />
    </div>
  );
}
