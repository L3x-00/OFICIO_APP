'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, Star } from 'lucide-react';
import { updateProvider, updateProviderSubscription, getFormOptions } from '@/lib/api';

// Límite de especialidades por plan — Premium 6, resto 3.
const specialtyLimit = (plan?: string) => (plan === 'PREMIUM' ? 6 : 3);

interface Props {
  provider: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const PLAN_OPTIONS = [
  { value: 'GRATIS',   label: '🆓 Gratis',    description: 'Período de gracia' },
  { value: 'ESTANDAR', label: '✅ Estándar',   description: 'S/ 19.90 /mes' },
  { value: 'PREMIUM',  label: '⭐ Premium',    description: 'S/ 39.90 /mes' },
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

  // Especialidades (multi-select, máx 3) + catálogo de Sectores
  const [allCategories, setAllCategories]             = useState<any[]>([]);
  const [selectedParentId, setSelectedParentId]       = useState<number | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId]     = useState<number | null>(null);

  // Catálogo de categorías (Sectores + Especialidades) para el selector.
  useEffect(() => {
    getFormOptions()
      .then((d) => setAllCategories(d?.categories ?? []))
      .catch(() => {});
  }, []);

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

      // Prefill de Especialidades desde providerCategories.
      const pcs: any[] = provider.providerCategories ?? [];
      setSelectedCategoryIds(pcs.map((pc) => pc.category?.id).filter(Boolean));
      const primary = pcs.find((pc) => pc.isPrimary);
      setPrimaryCategoryId(primary?.category?.id ?? pcs[0]?.category?.id ?? null);
      setSelectedParentId(null);
    }
  }, [provider, isOpen]);

  if (!isOpen || !provider) return null;

  const maxSpecialties = specialtyLimit(provider.subscription?.plan);
  const filteredParents = allCategories.filter((c: any) => c.forType === provider.type);

  // Multi-especialidad: alterna selección, respeta el tope y mantiene
  // siempre una especialidad marcada como principal.
  const toggleCategory = (id: number) => {
    if (selectedCategoryIds.includes(id)) {
      const next = selectedCategoryIds.filter((x) => x !== id);
      setSelectedCategoryIds(next);
      if (primaryCategoryId === id) setPrimaryCategoryId(next[0] ?? null);
    } else {
      if (selectedCategoryIds.length >= maxSpecialties) return;
      setSelectedCategoryIds([...selectedCategoryIds, id]);
      if (primaryCategoryId == null) setPrimaryCategoryId(id);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Actualizar datos básicos + Especialidades del proveedor
      await updateProvider(provider.id, {
        ...form,
        ...(selectedCategoryIds.length > 0
          ? { categoryIds: selectedCategoryIds, primaryCategoryId: primaryCategoryId ?? selectedCategoryIds[0] }
          : {}),
      });

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

          {/* Especialidades — multi-select (máx 3) con marcado de principal */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">
              Especialidades — hasta {maxSpecialties}
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredParents.map((parent: any) => {
                const isOpen = selectedParentId === parent.id;
                const selInParent = (parent.children ?? []).filter((c: any) => selectedCategoryIds.includes(c.id)).length;
                return (
                  <div key={parent.id} className="rounded-xl border border-white/10 overflow-hidden">
                    <button type="button" onClick={() => setSelectedParentId(isOpen ? null : parent.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${isOpen ? 'bg-white/10' : 'bg-black/30 hover:bg-white/5'}`}
                    >
                      <span className="font-semibold text-sm text-white flex items-center gap-2">
                        {parent.name}
                        {selInParent > 0 && <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">{selInParent}</span>}
                      </span>
                      {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-500" />}
                    </button>
                    {isOpen && (
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-black/20">
                        {(parent.children ?? []).map((child: any) => {
                          const sel = selectedCategoryIds.includes(child.id);
                          const capped = !sel && selectedCategoryIds.length >= maxSpecialties;
                          return (
                            <button key={child.id} type="button" disabled={capped} onClick={() => toggleCategory(child.id)}
                              className={`px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-all border ${
                                sel ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                    : capped ? 'bg-white/[0.02] border-white/5 text-gray-600 cursor-not-allowed'
                                    : 'bg-black/30 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                              }`}
                            >{child.name}</button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedCategoryIds.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] text-gray-500">La estrella marca la especialidad principal:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCategoryIds.map((id) => {
                    const cat = allCategories.flatMap((p: any) => p.children ?? []).find((c: any) => c.id === id);
                    const isPrimary = primaryCategoryId === id;
                    return (
                      <div key={id} className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-lg text-xs border ${isPrimary ? 'bg-amber-500/15 border-amber-500/40 text-amber-200' : 'bg-black/30 border-white/10 text-gray-300'}`}>
                        <button type="button" onClick={() => setPrimaryCategoryId(id)} title="Marcar como principal">
                          <Star size={12} className={isPrimary ? 'fill-amber-400 text-amber-400' : 'text-gray-500 hover:text-amber-400'} />
                        </button>
                        <span>{cat?.name ?? `#${id}`}</span>
                        <button type="button" onClick={() => toggleCategory(id)} title="Quitar">
                          <X size={11} className="text-gray-500 hover:text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                  ESTANDAR: 'border-cyan-400/50 text-cyan-400',
                  PREMIUM:  'border-yellow-400/50 text-yellow-400',
                };
                const selectedMap: Record<string, string> = {
                  GRATIS:   'bg-gray-500/15 border-gray-400/60',
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