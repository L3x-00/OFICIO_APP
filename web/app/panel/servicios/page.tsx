'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, ArrowUpRight, Package, X, Sparkles } from 'lucide-react';
import { useProfileType } from '@/lib/profile-type-context';
import type { Provider } from '@/lib/types';

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
  const [editingId, setEditingId] = useState<string | null>(null);

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
  const maxItems = plan === 'PREMIUM' ? Infinity : plan === 'ESTANDAR' ? 6 : 3;
  // Servicios reales del provider — vienen embebidos en
  // `scheduleJson.services` (mismo shape que persiste el mobile).
  // Antes el contador estaba hardcoded a 0 y nunca se renderizaban los
  // ítems con sus fotos.
  const items = provider?.scheduleJson?.services ?? [];
  const currentItems = items.length;
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
          onClick={() => setShowModal(true)}
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
            href="/panel/ajustes"
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
              </div>
              {isNegocio && item.price != null && (
                <span className="text-primary-light font-bold text-sm bg-primary/10 px-3 py-1 rounded-lg flex-shrink-0">
                  S/. {item.price.toFixed(2)}
                </span>
              )}
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
            onClick={() => setShowModal(true)}
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
              onClick={() => setShowModal(false)}
            />
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative glass rounded-2xl p-6 w-full max-w-md shadow-glow-lg border border-white/10"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white font-display">
                  {editingId ? 'Editar' : 'Añadir'} {isNegocio ? 'producto' : 'servicio'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
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
                {isNegocio && (
                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-2 uppercase tracking-wider">
                      Precio
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
                )}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn-ghost press-effect px-4 py-2 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary press-effect px-6 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                  >
                    <Sparkles size={14} />
                    Guardar
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