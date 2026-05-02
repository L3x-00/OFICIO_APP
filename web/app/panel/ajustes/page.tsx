'use client';

import { useState, useEffect } from 'react';
import { api, apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  CreditCard,
  Shield,
  FileText,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
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

const TERMS_TEXT = `TÉRMINOS Y CONDICIONES DE USO — ConfiServ

Bienvenido a ConfiServ. Antes de utilizar nuestra plataforma, lea detenidamente estos Términos y Condiciones...

(El texto completo es el mismo que está en login_screen.dart de la app Flutter)`;

const AVAIL_STYLES = {
  DISPONIBLE:  { bg: 'bg-green/15',  text: 'text-green',  border: 'border-green/40',  label: 'Disponible' },
  OCUPADO:     { bg: 'bg-amber/15',  text: 'text-amber',  border: 'border-amber/40',  label: 'Ocupado' },
  CON_DEMORA:  { bg: 'bg-red/15',    text: 'text-red',    border: 'border-red/40',    label: 'Con demora' },
} as const;

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
      iconColor: 'text-text-muted',
      iconBg: 'bg-text-muted/10',
      benefits: ['3 fotos en la galería', '1 servicio/producto', 'Perfil básico'],
      isCurrent: currentPlan === 'GRATIS',
    },
    {
      name: 'ESTANDAR' as const,
      label: 'Estándar',
      price: 19.9,
      icon: StarIcon,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-400/10',
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
      iconColor: 'text-amber',
      iconBg: 'bg-amber/10',
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
    <div className="space-y-6 pb-20 md:pb-0 max-w-4xl">
      <div data-reveal>
        <h1 className="text-3xl font-extrabold text-text-primary">Ajustes</h1>
        <p className="text-text-secondary text-sm mt-1">
          Gestiona tu plan, disponibilidad y preferencias.
        </p>
      </div>

      {/* Plan actual */}
      <div data-reveal className="relative bg-gradient-to-br from-primary/10 via-bg-card to-bg-card border border-primary/20 rounded-2xl p-6 overflow-hidden">
        <div className="blob bg-primary/25 w-64 h-64 -top-20 -right-20 animate-float-slow" aria-hidden />
        <div className="relative flex items-center gap-4">
          <div className={`w-14 h-14 ${currentPlanData?.iconBg} rounded-2xl flex items-center justify-center ring-1 ring-white/10`}>
            {currentPlanData?.icon && <currentPlanData.icon className={currentPlanData.iconColor} size={26} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-text-primary font-bold text-lg">
                Plan {currentPlanData?.label || 'Gratis'}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  currentStatus === 'ACTIVA'
                    ? 'bg-green/15 text-green border border-green/30'
                    : currentStatus === 'VENCIDA'
                    ? 'bg-red/15 text-red border border-red/30'
                    : 'bg-amber/15 text-amber border border-amber/30'
                }`}
              >
                {currentStatus}
              </span>
            </div>
            {provider?.subscription?.startDate && (
              <p className="text-text-muted text-xs mt-0.5">
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
      </div>

      {/* Planes disponibles */}
      <CollapsibleCard
        title="Planes disponibles"
        icon={<CreditCard size={18} className="text-primary" />}
        open={showPlans}
        onToggle={() => setShowPlans(!showPlans)}
      >
        <div className="grid sm:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative border rounded-2xl p-5 transition-all duration-300 ${
                plan.isCurrent
                  ? 'border-primary/50 bg-primary/5 shadow-glow-sm'
                  : 'border-white/5 hover:border-primary/30 hover-lift'
              }`}
            >
              {plan.popular && !plan.isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-glow-md">
                  Más popular
                </span>
              )}
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${plan.iconBg} rounded-xl flex items-center justify-center`}>
                  <plan.icon className={plan.iconColor} size={20} />
                </div>
                {plan.isCurrent && (
                  <span className="flex items-center gap-1 text-primary text-[10px] font-bold uppercase tracking-wider bg-primary/10 px-2 py-1 rounded-full border border-primary/30">
                    <Check size={11} /> Actual
                  </span>
                )}
              </div>
              <h3 className="font-bold text-text-primary text-lg">{plan.label}</h3>
              <p className="text-text-primary font-extrabold text-2xl mt-1 mb-4">
                {plan.price === 0 ? 'Gratis' : (
                  <>
                    <span className="text-gradient">S/. {plan.price}</span>
                    <span className="text-sm font-normal text-text-muted">/mes</span>
                  </>
                )}
              </p>
              <ul className="space-y-2 mb-5">
                {plan.benefits.map((b) => (
                  <li key={b} className="text-text-secondary text-xs flex items-start gap-1.5">
                    <Check size={13} className="text-green mt-0.5 shrink-0" />
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
                  className="btn-primary press-effect w-full py-2 rounded-xl text-sm font-semibold"
                >
                  Adquirir
                </button>
              )}
              {plan.isCurrent && (
                <button
                  disabled
                  className="w-full py-2 rounded-xl text-sm font-semibold bg-white/5 text-text-muted cursor-not-allowed"
                >
                  Plan actual
                </button>
              )}
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Disponibilidad */}
      {provider && (
        <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-1">Disponibilidad</h2>
          <p className="text-text-muted text-xs mb-4">Comunica a los clientes tu estado actual</p>
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
                      : 'bg-bg-input border-white/5 text-text-muted hover:text-text-secondary hover:border-white/15'
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
        </div>
      )}

      {/* Acciones legales / soporte */}
      <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl divide-y divide-white/5">
        <ActionButton onClick={() => setShowTerms(true)} icon={FileText} label="Términos y Condiciones" />
        <ActionButton onClick={() => setShowPrivacy(true)} icon={Shield} label="Política de Privacidad" />
        <ActionButton onClick={() => setShowHelp(true)} icon={HelpCircle} label="Ayuda" />
      </div>

      {/* Reportar / Cerrar sesión */}
      <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl divide-y divide-white/5">
        <ActionButton
          onClick={() => setShowReport(true)}
          icon={AlertTriangle}
          label="Reportar un problema"
          accent="text-amber"
        />
        <ActionButton
          onClick={() => {
            clearSession();
            router.push('/');
          }}
          icon={LogOut}
          label="Cerrar sesión"
          accent="text-red"
        />
      </div>

      {/* Modal Reporte */}
      {showReport && (
        <ModalShell title="Reportar un problema" onClose={() => setShowReport(false)}>
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            rows={5}
            className="w-full bg-bg-input border border-white/8 rounded-xl p-3 text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_rgba(224,123,57,0.12)] transition-all resize-none mb-4"
            placeholder="Describe el problema que encontraste..."
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowReport(false)}
              className="text-text-muted hover:text-text-secondary px-4 py-2 text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleReportSubmit}
              className="bg-amber hover:bg-amber/85 text-black px-6 py-2 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-glow-md"
            >
              Enviar reporte
            </button>
          </div>
        </ModalShell>
      )}

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
        content="Política de Privacidad de OficioApp. (Texto pendiente de completar)"
      />
      <LegalModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Ayuda"
        content="Centro de ayuda de OficioApp. Si tienes dudas, contáctanos en soporteofiapp@gmail.com
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
    </div>
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
    <div data-reveal className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left p-6 hover:bg-white/[0.02] transition-colors"
      >
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2.5">
          {icon}
          {title}
        </h2>
        {open ? (
          <ChevronUp className="text-primary" size={20} />
        ) : (
          <ChevronDown className="text-text-muted" size={20} />
        )}
      </button>
      <div
        className={`grid transition-all duration-300 ease-smooth ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  icon: Icon,
  label,
  accent = 'text-text-secondary hover:text-text-primary',
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full text-left px-5 py-4 hover:bg-white/[0.03] transition-colors group ${accent}`}
    >
      <span className="flex items-center gap-3 text-sm font-medium">
        <Icon size={18} className="opacity-80" />
        {label}
      </span>
      <ChevronUp size={14} className="rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-md animate-scale-in shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-bg-card border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-scale-in shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <pre className="text-text-secondary text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {content}
          </pre>
        </div>
        <div className="p-5 border-t border-white/5">
          <button
            onClick={onClose}
            className="btn-primary press-effect w-full py-2.5 rounded-xl font-semibold text-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
