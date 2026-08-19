'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, ArrowUpRight, Package, X, Save, Pencil, Trash2, Loader2, ImagePlus } from 'lucide-react';
import { useProfileType } from '@/lib/profile-type-context';
import type { Provider, ProviderService } from '@/lib/types';

// ========== ANIMACIONES CON TIPADO CORRECTO ==========
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 },
  },
};

export default function PanelServiciosPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceUnit, setServiceUnit] = useState('');
  const [serviceImage, setServiceImage] = useState<string | undefined>(undefined);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNegocio = provider?.type === 'NEGOCIO';
  const { activeType } = useProfileType();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const prov = await api.getMyProfile(activeType ?? undefined);
        if (!cancelled) setProvider(prov);
      } catch {
        if (!cancelled) toast.error('Error al cargar datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activeType]);

  const plan = provider?.subscription?.plan || 'GRATIS';
  // Límites (espejo de mobile/core/utils/plan_limits.dart): OFICIO GRATIS 1,
  // NEGOCIO GRATIS 3, ambos ESTANDAR 6, PREMIUM ilimitado. El backend NO
  // gatea (scheduleJson es opaco): este límite es la verdad operativa.
  const maxItems =
    plan === 'PREMIUM' ? Infinity : plan === 'ESTANDAR' ? 6 : isNegocio ? 3 : 1;
  // Servicios reales del provider — embebidos en `scheduleJson.services`
  // (mismo shape que persiste el mobile: ServiceItem).
  const items = provider?.scheduleJson?.services ?? [];
  const currentItems = items.length;
  const isAtLimit = currentItems >= maxItems;
  const progressPct = maxItems === Infinity ? 0 : Math.min((currentItems / maxItems) * 100, 100);

  const resetForm = () => {
    setServiceName('');
    setServiceDesc('');
    setServicePrice('');
    setServiceUnit('');
    setServiceImage(undefined);
    setPickedFile(null);
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: ProviderService) => {
    setEditingId(item.id);
    setServiceName(item.name);
    setServiceDesc(item.description ?? '');
    setServicePrice(item.price != null ? String(item.price) : '');
    setServiceUnit(item.unit ?? '');
    setServiceImage(item.imageUrl);
    setPickedFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Persiste la lista completa vía PATCH /me (scheduleJson.services),
  // preservando el resto del scheduleJson (p.ej. horario).
  const persist = async (nextServices: ProviderService[]) => {
    const updated = await api.saveServices(
      nextServices,
      provider?.scheduleJson,
      activeType ?? undefined,
    );
    setProvider(updated);
  };

  const handleSave = async () => {
    const name = serviceName.trim();
    if (!name) {
      toast.error(`Ingresa el nombre del ${isNegocio ? 'producto' : 'servicio'}`);
      return;
    }
    setSaving(true);
    try {
      let imageUrl = serviceImage;
      if (pickedFile) {
        imageUrl = await api.uploadProviderPhoto(pickedFile);
      }
      const priceNum = parseFloat(servicePrice);
      const item: ProviderService = {
        id: editingId ?? String(Date.now()),
        name,
        description: serviceDesc.trim() || undefined,
        price: Number.isFinite(priceNum) ? priceNum : undefined,
        unit: serviceUnit.trim() || undefined,
        imageUrl: imageUrl || undefined,
      };
      const next = editingId
        ? items.map((s) => (s.id === editingId ? { ...s, ...item } : s))
        : [...items, item];
      await persist(next);
      toast.success(editingId ? 'Cambios guardados' : `${isNegocio ? 'Producto' : 'Servicio'} añadido`);
      closeModal();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ProviderService) => {
    setDeletingId(item.id);
    try {
      await persist(items.filter((s) => s.id !== item.id));
      toast.success('Eliminado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 5 MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Solo se permiten JPG, PNG o WebP');
      return;
    }
    setPickedFile(file);
    setServiceImage(URL.createObjectURL(file));
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-20 md:pb-0 max-w-4xl">
        <div className="skeleton h-9 w-48 rounded-lg bg-white/5 animate-pulse" />
        <div className="skeleton h-24 rounded-2xl bg-white/5 animate-pulse" />
        <div className="skeleton h-48 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-20 md:pb-0 max-w-4xl"
    >
      {/* Encabezado */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-display tracking-tightest">
            {isNegocio ? 'Productos' : 'Servicios'}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Gestiona los {isNegocio ? 'productos' : 'servicios'} de tu perfil.
          </p>
        </div>
        <button
          onClick={openNew}
          disabled={isAtLimit}
          className="btn-primary press-effect px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Añadir
        </button>
      </motion.div>

      {/* Indicador de límite (glass) */}
      <motion.div
        variants={itemVariants}
        className="glass rounded-2xl p-5 border border-white/5 shadow-glow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-white text-sm font-semibold">
              {currentItems}/{maxItems === Infinity ? '∞' : maxItems}
            </span>
            <span className="text-white/40 text-sm ml-1.5">
              {isNegocio ? 'productos' : 'servicios'} en plan{' '}
              <span className="text-primary-light font-semibold">{plan}</span>
            </span>
          </div>
          {isAtLimit && (
            <span className="text-amber text-xs font-bold uppercase tracking-wider px-2 py-1 bg-amber/10 rounded-full border border-amber/20">
              Límite alcanzado
            </span>
          )}
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-smooth ${
              progressPct >= 100
                ? 'bg-gradient-to-r from-amber to-amber/70'
                : progressPct >= 80
                ? 'bg-gradient-to-r from-yellow-400 to-amber'
                : 'bg-gradient-to-r from-primary to-primary-light'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {isAtLimit && (
          <a
            href="/panel/perfil?section=planes"
            className="inline-flex items-center gap-1 text-primary-light text-sm mt-3 font-semibold hover:text-primary transition-colors group"
          >
            Subir de plan
            <ArrowUpRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        )}
      </motion.div>

      {/* Lista de servicios/productos del provider (con fotos R2). */}
      {currentItems > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="glass rounded-2xl p-4 flex items-center gap-4 border border-white/5"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.04] border border-white/5 flex items-center justify-center">
                {item.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package size={24} className="text-white/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                {item.description && (
                  <p className="text-white/40 text-xs mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.price != null && (
                  <p className="text-primary-light font-bold text-sm mt-1">
                    S/. {item.price.toFixed(2)}
                    {item.unit && <span className="text-white/40 font-normal"> · {item.unit}</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => openEdit(item)}
                  className="w-8 h-8 rounded-lg glass flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                  aria-label="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  className="w-8 h-8 rounded-lg glass flex items-center justify-center text-rose-400/70 hover:text-rose-400 hover:bg-rose/10 transition-colors disabled:opacity-50"
                  aria-label="Eliminar"
                >
                  {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty state con glass y animación */}
      {currentItems === 0 && (
        <motion.div
          variants={itemVariants}
          className="glass rounded-2xl p-12 text-center border border-white/5"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl glass flex items-center justify-center animate-float-slow">
            <Package size={36} className="text-primary-light/70" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2 font-display">
            Aún no has añadido {isNegocio ? 'productos' : 'servicios'}
          </h3>
          <p className="text-white/50 text-sm max-w-sm mx-auto mb-6">
            Añade tu primer {isNegocio ? 'producto' : 'servicio'} para que los clientes vean
            todo lo que ofreces.
          </p>
          <button
            onClick={openNew}
            className="btn-primary press-effect px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Añadir {isNegocio ? 'producto' : 'servicio'}
          </button>
        </motion.div>
      )}

      {/* Modal con AnimatePresence y estilo glass premium */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={closeModal}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative glass rounded-2xl p-6 w-full max-w-md shadow-glow-lg border border-white/10 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white font-display">
                  {editingId ? 'Editar' : 'Añadir'} {isNegocio ? 'producto' : 'servicio'}
                </h2>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Imagen (opcional) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-full h-28 rounded-xl border border-dashed border-white/15 bg-white/[0.03] hover:border-primary/40 overflow-hidden flex items-center justify-center text-white/40 hover:text-primary-light transition-colors group"
                >
                  {serviceImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={serviceImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <span className="relative z-10 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Cambiar imagen
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-2 text-sm">
                      <ImagePlus size={18} /> Añadir imagen (opcional)
                    </span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePickFile}
                />

                <InputField
                  label="Nombre"
                  value={serviceName}
                  onChange={setServiceName}
                />
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
                    Descripción
                  </label>
                  <textarea
                    value={serviceDesc}
                    onChange={(e) => setServiceDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                    placeholder="Describe brevemente lo que ofreces..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
                      Precio (opcional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-semibold">
                        S/.
                      </span>
                      <input
                        type="number"
                        value={servicePrice}
                        onChange={(e) => setServicePrice(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                      />
                    </div>
                  </div>
                  <InputField
                    label="Unidad"
                    value={serviceUnit}
                    onChange={setServiceUnit}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={closeModal}
                    disabled={saving}
                    className="btn-ghost press-effect px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary press-effect px-6 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Componente InputField mejorado visualmente
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
      <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
        placeholder={`Ingresa el ${label.toLowerCase()}`}
      />
    </div>
  );
}