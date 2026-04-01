'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

const BASE_URL = 'http://localhost:3000';

interface Props {
  provider: any;
  isOpen: boolean;    // Añadimos esta prop que espera el Hito 5.6
  onClose: () => void;
  onUpdated: () => void; // Cambiamos onSuccess por onUpdated
}

export function EditProviderModal({ provider, isOpen, onClose, onUpdated }: Props) {
  // Si no está abierto, no renderizamos nada
  if (!isOpen) return null;

  const [form, setForm] = useState({
    businessName: provider.businessName,
    phone: provider.phone,
    description: provider.description ?? '',
    address: provider.address ?? '',
    availability: provider.availability,
    isVisible: provider.isVisible,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Usamos la ruta de administración del backend
      const res = await fetch(`${BASE_URL}/providers/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) throw new Error('Error al actualizar el proveedor');
      
      onUpdated(); // Notifica al padre para refrescar la lista
      onClose();   // Cierra el modal
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-bg-card rounded-2xl border border-white/10 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">
            Editar: {provider.businessName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Nombre del servicio</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Teléfono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Dirección</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Disponibilidad</label>
              <select
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value })}
                className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
              >
                <option value="DISPONIBLE">Disponible</option>
                <option value="OCUPADO">Ocupado</option>
                <option value="CON_DEMORA">Con demora</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Visibilidad</label>
              <select
                value={String(form.isVisible)}
                onChange={(e) => setForm({ ...form, isVisible: e.target.value === 'true' })}
                className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
              >
                <option value="true">Visible</option>
                <option value="false">Oculto</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
            >
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}