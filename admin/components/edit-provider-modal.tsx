'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { updateProvider, updateProviderSubscription } from '@/lib/api';

interface Props {
  provider: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const PLAN_OPTIONS = [
  { value: 'GRATIS',   label: '🆓 Gratis',    description: 'Período de gracia' },
  { value: 'BASICO',   label: '📦 Básico',     description: 'S/ 15/mes' },
  { value: 'ESTANDAR', label: '✅ Estándar',   description: 'S/ 29/mes' },
  { value: 'PREMIUM',  label: '⭐ Premium',    description: 'S/ 59/mes' },
];

export function EditProviderModal({ provider, isOpen, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    businessName: '',
    phone: '',
    description: '',
    address: '',
    availability: '',
    isVisible: true,
  });

  const [selectedPlan, setSelectedPlan] = useState('GRATIS');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Sincronizar el formulario cuando el proveedor cambia o el modal se abre
  useEffect(() => {
    if (provider) {
      setForm({
        businessName: provider.businessName || '',
        phone: provider.phone || '',
        description: provider.description || '',
        address: provider.address || '',
        availability: provider.availability || 'DISPONIBLE',
        isVisible: provider.isVisible ?? true,
      });
      setSelectedPlan(provider.subscription?.plan ?? 'GRATIS');
    }
  }, [provider, isOpen]);

  if (!isOpen || !provider) return null;

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Actualizar datos básicos del proveedor
      await updateProvider(provider.id, form);

      // Actualizar plan si cambió
      const currentPlan = provider.subscription?.plan ?? 'GRATIS';
      if (selectedPlan !== currentPlan) {
        await updateProviderSubscription(provider.id, selectedPlan);
      }

      onUpdated();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error al actualizar el proveedor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <h2 className="text-lg font-bold text-white">
            Editar: {provider.businessName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Nombre del servicio</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Teléfono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Dirección</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Disponibilidad</label>
              <select
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
              >
                <option value="DISPONIBLE">🟢 Disponible</option>
                <option value="OCUPADO">🔴 Ocupado</option>
                <option value="CON_DEMORA">🟡 Con demora</option>
                <option value="FUERA_DE_SERVICIO">⚪ Fuera de servicio</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Visibilidad</label>
              <select
                value={String(form.isVisible)}
                onChange={(e) => setForm({ ...form, isVisible: e.target.value === 'true' })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
              >
                <option value="true">👁️ Visible</option>
                <option value="false">🚫 Oculto</option>
              </select>
            </div>
          </div>

          {/* Plan de suscripción */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">
              Plan de Suscripción
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PLAN_OPTIONS.map((plan) => {
                const isSelected = selectedPlan === plan.value;
                const colorMap: Record<string, string> = {
                  GRATIS:   'border-gray-500/40 text-gray-400',
                  BASICO:   'border-blue-500/40 text-blue-400',
                  ESTANDAR: 'border-cyan-400/50 text-cyan-400',
                  PREMIUM:  'border-yellow-400/50 text-yellow-400',
                };
                const selectedMap: Record<string, string> = {
                  GRATIS:   'bg-gray-500/15 border-gray-400/60',
                  BASICO:   'bg-blue-500/15 border-blue-400/60',
                  ESTANDAR: 'bg-cyan-400/15 border-cyan-400/60',
                  PREMIUM:  'bg-yellow-400/15 border-yellow-400/60',
                };
                return (
                  <button
                    key={plan.value}
                    type="button"
                    onClick={() => setSelectedPlan(plan.value)}
                    className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-sm transition-all
                      ${isSelected ? selectedMap[plan.value] : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'}
                    `}
                  >
                    <span className={`font-semibold text-sm ${isSelected ? colorMap[plan.value] : ''}`}>
                      {plan.label}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">{plan.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20"
            >
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}