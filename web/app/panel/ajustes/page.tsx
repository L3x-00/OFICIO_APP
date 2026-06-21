'use client';

import { useState, useEffect } from 'react';
import { api, apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Shield,
  FileText,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  Check,
  LogOut,
  Crown,
  Star as StarIcon,
  Package,
  X,
} from 'lucide-react';
import YapePaymentModal from '@/components/yape-payment-modal';
import { getUser, clearSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useProfileType } from '@/lib/profile-type-context';
import type { Provider } from '@/lib/types';

const TERMS_TEXT = `TÉRMINOS Y CONDICIONES DE USO — Servi

Bienvenido a Servi. Antes de utilizar nuestra plataforma, lea detenidamente estos Términos y Condiciones...

(El texto completo es el mismo que está en login_screen.dart de la app Flutter)`;

const AVAIL_STYLES = {
  DISPONIBLE:  { bg: 'bg-accent/10',  text: 'text-accent',  border: 'border-accent/20',  label: 'Disponible' },
  OCUPADO:     { bg: 'bg-amber/10',  text: 'text-amber',  border: 'border-amber/20',  label: 'Ocupado' },
  CON_DEMORA:  { bg: 'bg-rose/10',    text: 'text-rose-400',    border: 'border-rose/20',    label: 'Con demora' },
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } 
  }
};

export default function PanelAjustesPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [yapeModal, setYapeModal] = useState<{
    plan: 'ESTANDAR' | 'PREMIUM';
    label: string;
    amount: number;
  } | null>(null);
  const user = getUser();
  const router = useRouter();

  const { activeType } = useProfileType();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const prov = await api.getMyProfile(activeType ?? undefined);
        if (!cancelled) setProvider(prov);
      } catch {
        // Cliente puro sin provider
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeType]);

  const currentPlan = provider?.subscription?.plan || 'GRATIS';
  const currentStatus = provider?.subscription?.status || 'ACTIVA';

  const plans = [
    {
      name: 'GRATIS' as const,
      label: 'Gratis',
      price: 0,
      icon: Package,
      iconColor: 'text-white/50',
      iconBg: 'bg-white/5',
      benefits: ['2 fotos en la galería', '1 servicio/producto', 'Perfil básico'],
      isCurrent: currentPlan === 'GRATIS',
    },
    {
      name: 'ESTANDAR' as const,
      label: 'Estándar',
      price: 19.9,
      icon: StarIcon,
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
      popular: true,
      benefits: [
        '6 fotos en la galería',
        '6 servicios/productos',
        'Estadísticas de visitas',
        'Mayor visibilidad en búsquedas',
      ],
      isCurrent: currentPlan === 'ESTANDAR',
    },
    {
      name: 'PREMIUM' as const,
      label: 'Premium',
      price: 39.9,
      icon: Crown,
      iconColor: 'text-primary-light',
      iconBg: 'bg-primary/10',
      benefits: [
        '10 fotos en la galería',
        'Servicios/productos ilimitados',
        'Estadísticas avanzadas',
        'Máxima visibilidad',
        'Insignia destacada',
      ],
      isCurrent: currentPlan === 'PREMIUM',
    },
  ];

  const handleReportSubmit = async () => {
    if (reportText.trim().length < 5) {
      toast.error('Describe el problema con al menos 5 caracteres');
      return;
    }
    try {
      const userId = user?.id;
      if (userId) {
        await apiFetch('/providers/report-issue', {
          method: 'POST',
          body: JSON.stringify({ userId, description: reportText }),
        });
        toast.success('Reporte enviado. ¡Gracias por tu ayuda!');
        setShowReport(false);
        setReportText('');
      }
    } catch {
      toast.error('Error al enviar el reporte');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-9 w-48 rounded" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  const currentPlanData = plans.find((p) => p.name === currentPlan);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-20 md:pb-0 max-w-4xl"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-extrabold text-white font-display tracking-tightest">Ajustes</h1>
        <p className="text-white/50 text-sm mt-1">
          Gestiona tu plan, disponibilidad y preferencias.
        </p>
      </motion.div>

      {/* Plan actual */}
      <motion.div variants={itemVariants} className="relative glass rounded-xl p-6 overflow-hidden border-primary/20 shadow-glow-md">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className={`w-14 h-14 ${currentPlanData?.iconBg} rounded-2xl flex items-center justify-center ring-1 ring-white/10`}>
            {currentPlanData?.icon && <currentPlanData.icon className={currentPlanData.iconColor} size={26} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white font-bold text-lg font-display">
                Plan {currentPlanData?.label || 'Gratis'}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  currentStatus === 'ACTIVA'
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : currentStatus === 'VENCIDA'
                    ? 'bg-rose/10 text-rose-400 border border-rose/20'
                    : 'bg-amber/10 text-amber border border-amber/20'
                }`}
              >
                {currentStatus}
              </span>
            </div>
            {provider?.subscription?.startDate && (
              <p className="text-white/40 text-xs mt-0.5">
                Activo desde{' '}
                {new Date(provider.subscription.startDate).toLocaleDateString('es-PE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Planes disponibles */}
      <motion.div variants={itemVariants}>
        <CollapsibleCard
          title="Planes disponibles"
          icon={<CreditCard size={18} className="text-primary-light" />}
          open={showPlans}
          onToggle={() => setShowPlans(!showPlans)}
        >
          <div className="grid sm:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative border rounded-2xl p-5 transition-all duration-300 ${
                  plan.isCurrent
                    ? 'glass border-primary/30 shadow-glow-sm'
                    : 'glass glass-hover border-white/5'
                }`}
              >
                {plan.popular && !plan.isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-glow-sm">
                    Más popular
                  </span>
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${plan.iconBg} rounded-xl flex items-center justify-center`}>
                    <plan.icon className={plan.iconColor} size={20} />
                  </div>
                  {plan.isCurrent && (
                    <span className="flex items-center gap-1 text-primary-light text-[10px] font-bold uppercase tracking-wider bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                      <Check size={11} /> Actual
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-white text-lg font-display">{plan.label}</h3>
                <p className="text-white font-extrabold text-2xl mt-1 mb-4">
                  {plan.price === 0 ? 'Gratis' : (
                    <>
                      <span className="text-gradient">S/. {plan.price}</span>
                      <span className="text-sm font-normal text-white/40">/mes</span>
                    </>
                  )}
                </p>
                <ul className="space-y-2 mb-5">
                  {plan.benefits.map((b) => (
                    <li key={b} className="text-white/50 text-xs flex items-start gap-1.5">
                      <Check size={13} className="text-accent mt-0.5 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                {!plan.isCurrent && plan.name !== 'GRATIS' && (
                  <button
                    onClick={() =>
                      setYapeModal({
                        plan: plan.name as 'ESTANDAR' | 'PREMIUM',
                        label: plan.label,
                        amount: plan.price,
                      })
                    }
                    className="btn btn-primary press-effect w-full py-2 text-sm"
                  >
                    Adquirir
                  </button>
                )}
                {plan.isCurrent && (
                  <button
                    disabled
                    className="w-full py-2 text-sm font-semibold bg-white/5 text-white/30 cursor-not-allowed rounded-xl"
                  >
                    Plan actual
                  </button>
                )}
              </div>
            ))}
          </div>
        </CollapsibleCard>
      </motion.div>

      {/* Disponibilidad */}
      {provider && (
        <motion.div variants={itemVariants} className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white font-display mb-1">Disponibilidad</h2>
          <p className="text-white/40 text-xs mb-4">Comunica a los clientes tu estado actual</p>
          <div className="grid grid-cols-3 gap-3">
            {(['DISPONIBLE', 'OCUPADO', 'CON_DEMORA'] as const).map((status) => {
              const style = AVAIL_STYLES[status];
              const isActive = provider.availability === status;
              return (
                <button
                  key={status}
                  onClick={async () => {
                    try {
                      await api.updateMyProfile({ availability: status }, activeType ?? undefined);
                      setProvider((prev) =>
                        prev ? { ...prev, availability: status } : prev
                      );
                      toast.success('Disponibilidad actualizada');
                    } catch {
                      toast.error('Error al actualizar');
                    }
                  }}
                  className={`relative py-3 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                    isActive
                      ? `${style.bg} ${style.text} ${style.border} shadow-glow-sm`
                      : 'glass border-white/10 text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current animate-pulse-soft" />
                  )}
                  {style.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Acciones legales / soporte */}
      <motion.div variants={itemVariants} className="glass rounded-xl divide-y divide-white/5">
        <ActionButton onClick={() => setShowTerms(true)} icon={FileText} label="Términos y Condiciones" iconColor="text-white/50" />
        <ActionButton onClick={() => setShowPrivacy(true)} icon={Shield} label="Política de Privacidad" iconColor="text-accent" />
        <ActionButton onClick={() => setShowHelp(true)} icon={HelpCircle} label="Ayuda" iconColor="text-primary-light" />
      </motion.div>

      {/* Reportar / Cerrar sesión */}
      <motion.div variants={itemVariants} className="glass rounded-xl divide-y divide-white/5">
        <ActionButton
          onClick={() => setShowReport(true)}
          icon={AlertTriangle}
          label="Reportar un problema"
          iconColor="text-amber"
          textColor="text-amber/80 hover:text-amber"
        />
        <ActionButton
          onClick={() => {
            clearSession();
            router.push('/');
          }}
          icon={LogOut}
          label="Cerrar sesión"
          iconColor="text-rose-400"
          textColor="text-rose-400/80 hover:text-rose-400"
        />
      </motion.div>

      {/* Modal Reporte */}
      <AnimatePresence>
        {showReport && (
          <ModalShell title="Reportar un problema" onClose={() => setShowReport(false)}>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={5}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none mb-4"
              placeholder="Describe el problema que encontraste..."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReport(false)}
                className="btn btn-ghost press-effect px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportSubmit}
                className="btn btn-primary press-effect px-6 py-2 text-sm"
              >
                Enviar reporte
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Modales legales */}
      <LegalModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        title="Términos y Condiciones"
        content={TERMS_TEXT}
      />
      <LegalModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Política de Privacidad"
        content="Política de Privacidad de Servi. (Texto pendiente de completar)"
      />
      <LegalModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Ayuda"
        content="Centro de ayuda de Servi. Si tienes dudas, contáctanos en soporteofiapp@gmail.com
                  o visita nuestras redes sociales. (Texto pendiente de completar)"
      />

      {/* Modal de pago Yape */}
      {yapeModal && (
        <YapePaymentModal
          isOpen={!!yapeModal}
          onClose={() => setYapeModal(null)}
          plan={yapeModal.plan}
          planLabel={yapeModal.label}
          amount={yapeModal.amount}
        />
      )}
    </motion.div>
  );
}

function CollapsibleCard({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left p-6 hover:bg-white/[0.02] transition-colors"
      >
        <h2 className="text-lg font-semibold text-white font-display flex items-center gap-2.5">
          {icon}
          {title}
        </h2>
        <ChevronDown
          size={20}
          className={`text-white/30 transition-transform duration-300 ${open ? 'rotate-180 text-primary-light' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({
  onClick,
  icon: Icon,
  label,
  iconColor = 'text-white/50',
  textColor = 'text-white/70 hover:text-white',
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  iconColor?: string;
  textColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full text-left px-5 py-4 hover:bg-white/[0.02] transition-colors group ${textColor}`}
    >
      <span className="flex items-center gap-3 text-sm font-medium font-display">
        <Icon size={18} className={iconColor} />
        {label}
      </span>
      <ChevronDown size={14} className="-rotate-90 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="relative glass rounded-2xl p-6 w-full max-w-md shadow-glow-lg"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white font-display">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function LegalModal({
  isOpen,
  onClose,
  title,
  content,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="relative glass rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-glow-lg"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white font-display">{title}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
              <pre className="text-white/60 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {content}
              </pre>
            </div>
            <div className="p-5 border-t border-white/5">
              <button
                onClick={onClose}
                className="btn btn-primary press-effect w-full py-2.5 text-sm"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}