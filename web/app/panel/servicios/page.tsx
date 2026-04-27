'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, ArrowUpRight } from 'lucide-react';
import { getUser } from '@/lib/auth';
import type { Provider } from '@/lib/types';

export default function PanelServiciosPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const user = getUser();
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
  const currentItems = 0; // Placeholder — el backend debe gestionar servicios/productos
  const isAtLimit = currentItems >= maxItems;

  const handleSave = () => {
    // Placeholder: llamar al endpoint de servicios cuando esté implementado en el backend
    toast.success('Servicio guardado (simulado)');
    setShowModal(false);
    setServiceName('');
    setServiceDesc('');
    setServicePrice('');
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          {isNegocio ? 'Productos' : 'Servicios'}
        </h1>
        <button
          onClick={() => setShowModal(true)}
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
            {currentItems}/{maxItems} {isNegocio ? 'productos' : 'servicios'}{' '}
            (Plan {plan})
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
              width: `${Math.min((currentItems / maxItems) * 100, 100)}%`,
            }}
          />
        </div>
        {isAtLimit && (
          <a
            href="/panel/ajustes"
            className="inline-flex items-center gap-1 text-primary text-sm mt-3 hover:underline"
          >
            Subir de plan <ArrowUpRight size={14} />
          </a>
        )}
      </div>

      {/* Lista vacía */}
      {currentItems === 0 && (
        <div className="bg-bg-card border border-white/5 rounded-card p-8 text-center">
          <p className="text-text-muted">
            Aún no has añadido {isNegocio ? 'productos' : 'servicios'}.
          </p>
        </div>
      )}

      {/* Modal añadir/editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-bg-card border border-white/5 rounded-card p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-text-primary mb-4">
              {editingId ? 'Editar' : 'Añadir'}{' '}
              {isNegocio ? 'producto' : 'servicio'}
            </h2>
            <div className="space-y-4">
              <InputField
                label="Nombre"
                value={serviceName}
                onChange={setServiceName}
              />
              <div>
                <label className="block text-text-secondary text-sm mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-bg-input border border-white/5 rounded-button p-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                />
              </div>
              {isNegocio && (
                <div>
                  <label className="block text-text-secondary text-sm mb-1.5">
                    Precio (S/.)
                  </label>
                  <input
                    type="number"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    className="w-full bg-bg-input border border-white/5 rounded-button px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="text-text-muted hover:text-text-secondary px-4 py-2 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-button text-sm font-medium transition-colors"
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
      <label className="block text-text-secondary text-sm mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-input border border-white/5 rounded-button px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors"
      />
    </div>
  );
}