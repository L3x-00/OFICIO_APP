'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, Star, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  updateProvider,
  updateProviderSubscription,
  requestProviderPasswordReset,
  getFormOptions,
  type Provider,
} from '@/lib/api';

// Límite de especialidades por plan — Premium 6, resto 3.
const specialtyLimit = (plan?: string) => (plan === 'PREMIUM' ? 6 : 3);

// Nodo del catálogo de categorías (Sectores → Especialidades).
interface CatNode {
  id: number;
  name: string;
  slug?: string;
  forType?: string;
  children?: CatNode[];
}

interface Props {
  provider: Provider | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const PLAN_OPTIONS = [
  { value: 'GRATIS',   label: '🆓 Gratis',    description: 'Período de gracia' },
  { value: 'ESTANDAR', label: '✅ Estándar',   description: 'S/ 19.90 /mes' },
  { value: 'PREMIUM',  label: '⭐ Premium',    description: 'S/ 39.90 /mes' },
];

// Campos de redes sociales — clave del form + etiqueta visible.
const SOCIAL_FIELDS: { key: SocialKey; label: string; placeholder: string }[] = [
  { key: 'website',     label: 'Sitio web',  placeholder: 'https://…' },
  { key: 'instagram',   label: 'Instagram',  placeholder: 'usuario' },
  { key: 'tiktok',      label: 'TikTok',     placeholder: 'usuario' },
  { key: 'facebook',    label: 'Facebook',   placeholder: 'usuario o URL' },
  { key: 'linkedin',    label: 'LinkedIn',   placeholder: 'usuario' },
  { key: 'twitterX',    label: 'X (Twitter)',placeholder: 'usuario' },
  { key: 'telegram',    label: 'Telegram',   placeholder: 'usuario' },
  { key: 'whatsappBiz', label: 'WhatsApp Business', placeholder: '+51 9…' },
];

type SocialKey =
  | 'website' | 'instagram' | 'tiktok' | 'facebook'
  | 'linkedin' | 'twitterX' | 'telegram' | 'whatsappBiz';

const inputCls =
  'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all';
const labelCls =
  'text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider';

export function EditProviderModal({ provider, isOpen, onClose, onUpdated }: Props) {
  const [form, setForm] = useState({
    businessName: '',
    phone: '',
    whatsapp: '',
    description: '',
    address: '',
    availability: 'DISPONIBLE',
    isVisible: true,
    // Redes
    website: '',
    instagram: '',
    tiktok: '',
    facebook: '',
    linkedin: '',
    twitterX: '',
    telegram: '',
    whatsappBiz: '',
    // Privacidad
    showPhone: true,
    showWhatsapp: true,
    showExactLocation: true,
    // Negocio / identidad
    dni: '',
    ruc: '',
    nombreComercial: '',
    razonSocial: '',
    hasDelivery: false,
  });

  const [selectedPlan, setSelectedPlan] = useState('GRATIS');
  const [isLoading, setIsLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  // Especialidades (multi-select) + catálogo de Sectores
  const [allCategories, setAllCategories]             = useState<CatNode[]>([]);
  const [selectedParentId, setSelectedParentId]       = useState<number | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId]     = useState<number | null>(null);

  // Catálogo de categorías (Sectores + Especialidades) para el selector.
  useEffect(() => {
    getFormOptions()
      .then((d) => setAllCategories((d?.categories ?? []) as CatNode[]))
      .catch(() => {});
  }, []);

  // Sincronizar el formulario cuando el proveedor cambia o el modal se abre.
  useEffect(() => {
    if (provider) {
      setForm({
        businessName: provider.businessName || '',
        phone: provider.phone || '',
        whatsapp: provider.whatsapp || '',
        description: provider.description || '',
        address: provider.address || '',
        availability: provider.availability || 'DISPONIBLE',
        isVisible: provider.isVisible ?? true,
        website: provider.website || '',
        instagram: provider.instagram || '',
        tiktok: provider.tiktok || '',
        facebook: provider.facebook || '',
        linkedin: provider.linkedin || '',
        twitterX: provider.twitterX || '',
        telegram: provider.telegram || '',
        whatsappBiz: provider.whatsappBiz || '',
        showPhone: provider.showPhone ?? true,
        showWhatsapp: provider.showWhatsapp ?? true,
        showExactLocation: provider.showExactLocation ?? true,
        dni: provider.dni || '',
        ruc: provider.ruc || '',
        nombreComercial: provider.nombreComercial || '',
        razonSocial: provider.razonSocial || '',
        hasDelivery: provider.hasDelivery ?? false,
      });
      setSelectedPlan(provider.subscription?.plan ?? 'GRATIS');

      // Prefill de Especialidades desde providerCategories.
      const pcs = provider.providerCategories ?? [];
      setSelectedCategoryIds(
        pcs.map((pc) => pc.category?.id).filter((id): id is number => id != null),
      );
      const primary = pcs.find((pc) => pc.isPrimary);
      setPrimaryCategoryId(primary?.category?.id ?? pcs[0]?.category?.id ?? null);
      setSelectedParentId(null);
    }
  }, [provider, isOpen]);

  if (!isOpen || !provider) return null;

  const isNegocio = provider.type === 'NEGOCIO';
  const maxSpecialties = specialtyLimit(provider.subscription?.plan);
  const filteredParents = allCategories.filter((c) => c.forType === provider.type);
  const images: { url: string }[] = Array.isArray(provider.images) ? provider.images : [];

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

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
      // Actualizar TODOS los campos editables + Especialidades.
      await updateProvider(provider.id, {
        ...form,
        ...(selectedCategoryIds.length > 0
          ? { categoryIds: selectedCategoryIds, primaryCategoryId: primaryCategoryId ?? selectedCategoryIds[0] }
          : {}),
      });

      // Actualizar plan si cambió.
      const currentPlan = provider.subscription?.plan ?? 'GRATIS';
      if (selectedPlan !== currentPlan) {
        await updateProviderSubscription(provider.id, selectedPlan);
      }

      toast.success('Proveedor actualizado');
      onUpdated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar el proveedor');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const userId = provider.userId ?? provider.user?.id;
    if (!userId) {
      toast.error('No se encontró el usuario del proveedor');
      return;
    }
    setResetting(true);
    try {
      await requestProviderPasswordReset(Number(userId));
      toast.success('Se envió el email al proveedor');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo enviar el email');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header (fijo) */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 shrink-0">
          <h2 className="text-lg font-bold text-white truncate pr-4">
            Editar: {provider.businessName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre del servicio</label>
              <input value={form.businessName} onChange={(e) => set({ businessName: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp</label>
              <input value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} className={inputCls} placeholder="+51 9…" />
            </div>
            <div>
              <label className={labelCls}>Dirección</label>
              <input value={form.address} onChange={(e) => set({ address: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Disponibilidad</label>
              <select
                value={form.availability}
                onChange={(e) => set({ availability: e.target.value })}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="DISPONIBLE">🟢 Disponible</option>
                <option value="OCUPADO">🔴 Ocupado</option>
                <option value="CON_DEMORA">🟡 Con demora</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Visibilidad</label>
              <select
                value={String(form.isVisible)}
                onChange={(e) => set({ isVisible: e.target.value === 'true' })}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                <option value="true">👁️ Visible</option>
                <option value="false">🚫 Oculto</option>
              </select>
            </div>
          </div>

          {/* ── Datos de negocio / identidad ── */}
          <div className="grid grid-cols-2 gap-4">
            {!isNegocio && (
              <div>
                <label className={labelCls}>DNI</label>
                <input value={form.dni} onChange={(e) => set({ dni: e.target.value })} className={inputCls} />
              </div>
            )}
            {isNegocio && (
              <>
                <div>
                  <label className={labelCls}>RUC</label>
                  <input value={form.ruc} onChange={(e) => set({ ruc: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Nombre comercial</label>
                  <input value={form.nombreComercial} onChange={(e) => set({ nombreComercial: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Razón social</label>
                  <input value={form.razonSocial} onChange={(e) => set({ razonSocial: e.target.value })} className={inputCls} />
                </div>
              </>
            )}
          </div>

          {/* ── Redes sociales ── */}
          <div>
            <label className={labelCls}>Redes y enlaces</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SOCIAL_FIELDS.map((s) => (
                <div key={s.key}>
                  <span className="text-[11px] text-gray-500 mb-1 block">{s.label}</span>
                  <input
                    value={form[s.key]}
                    onChange={(e) => set({ [s.key]: e.target.value } as Partial<typeof form>)}
                    placeholder={s.placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Privacidad + delivery (toggles) ── */}
          <div>
            <label className={labelCls}>Privacidad y opciones</label>
            <div className="flex flex-wrap gap-2">
              <Toggle label="Mostrar teléfono" value={form.showPhone} onChange={(v) => set({ showPhone: v })} />
              <Toggle label="Mostrar WhatsApp" value={form.showWhatsapp} onChange={(v) => set({ showWhatsapp: v })} />
              <Toggle label="Ubicación exacta" value={form.showExactLocation} onChange={(v) => set({ showExactLocation: v })} />
              {isNegocio && (
                <Toggle label="Tiene delivery" value={form.hasDelivery} onChange={(v) => set({ hasDelivery: v })} />
              )}
            </div>
          </div>

          {/* ── Fotos (solo lectura — se gestionan desde el panel del proveedor) ── */}
          {images.length > 0 && (
            <div>
              <label className={labelCls}>Fotos ({images.length})</label>
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={img.url}
                    alt={`Foto ${i + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border border-white/10"
                  />
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Las fotos las administra el proveedor desde su panel.
              </p>
            </div>
          )}

          {/* ── Especialidades — multi-select con marcado de principal ── */}
          <div>
            <label className={labelCls}>Especialidades — hasta {maxSpecialties}</label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredParents.map((parent) => {
                const open = selectedParentId === parent.id;
                const selInParent = (parent.children ?? []).filter((c) => selectedCategoryIds.includes(c.id)).length;
                return (
                  <div key={parent.id} className="rounded-xl border border-white/10 overflow-hidden">
                    <button type="button" onClick={() => setSelectedParentId(open ? null : parent.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${open ? 'bg-white/10' : 'bg-black/30 hover:bg-white/5'}`}
                    >
                      <span className="font-semibold text-sm text-white flex items-center gap-2">
                        {parent.name}
                        {selInParent > 0 && <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">{selInParent}</span>}
                      </span>
                      {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-500" />}
                    </button>
                    {open && (
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-black/20">
                        {(parent.children ?? []).map((child) => {
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
                    const cat = allCategories.flatMap((p) => p.children ?? []).find((c) => c.id === id);
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

          {/* ── Plan de suscripción ── */}
          <div>
            <label className={labelCls}>Plan de Suscripción</label>
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
                  <button key={plan.value} type="button" onClick={() => setSelectedPlan(plan.value)}
                    className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-sm transition-all
                      ${isSelected ? selectedMap[plan.value] : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'}`}
                  >
                    <span className={`font-semibold text-sm ${isSelected ? colorMap[plan.value] : ''}`}>{plan.label}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{plan.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Seguridad: reseteo de contraseña ── */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <label className={labelCls}>Seguridad de la cuenta</label>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400 leading-relaxed">
                Envía al proveedor un enlace para que cree una nueva contraseña.
                Tú nunca la verás ni la cambias.
              </p>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetting}
                className="shrink-0 inline-flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
              >
                <KeyRound size={14} />
                {resetting ? 'Enviando…' : 'Enviar enlace de restablecimiento'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer (fijo) */}
        <div className="flex justify-end gap-3 p-6 border-t border-white/5 bg-white/5 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm transition-colors">
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
  );
}

// Toggle compacto on/off para booleanos (privacidad, delivery).
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
        value
          ? 'bg-green-500/15 border-green-500/40 text-green-300'
          : 'bg-black/30 border-white/10 text-gray-500 hover:text-gray-300'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${value ? 'bg-green-400' : 'bg-gray-600'}`} />
      {label}
    </button>
  );
}
