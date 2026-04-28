'use client';

import { useState, useEffect } from 'react';
import { api, apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  Settings,
  CreditCard,
  Shield,
  FileText,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
  MessageSquare,
  LogOut,
} from 'lucide-react';
import YapePaymentModal from '@/components/yape-payment-modal';
import { getUser, clearSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import type { Provider } from '@/lib/types';

const TERMS_TEXT = `TÉRMINOS Y CONDICIONES DE USO — ConfiServ

Bienvenido a ConfiServ. Antes de utilizar nuestra plataforma, lea detenidamente estos Términos y Condiciones...

(El texto completo es el mismo que está en login_screen.dart de la app Flutter)`;

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

  useEffect(() => {
    async function load() {
      try {
        const prov = await api.getMyProfile();
        setProvider(prov);
      } catch {
        // Podría no tener provider (cliente puro)
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currentPlan = provider?.subscription?.plan || 'GRATIS';
  const currentStatus = provider?.subscription?.status || 'ACTIVA';

  const plans = [
    {
      name: 'GRATIS',
      label: 'Gratis',
      price: 0,
      benefits: ['3 fotos en la galería', '1 servicio/producto', 'Perfil básico'],
      isCurrent: currentPlan === 'GRATIS',
    },
    {
      name: 'ESTANDAR',
      label: 'Estándar',
      price: 19.9,
      benefits: [
        '6 fotos en la galería',
        '6 servicios/productos',
        'Estadísticas de visitas',
        'Mayor visibilidad en búsquedas',
      ],
      isCurrent: currentPlan === 'ESTANDAR',
    },
    {
      name: 'PREMIUM',
      label: 'Premium',
      price: 39.9,
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
      // Llamar al endpoint de reporte
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-text-primary">Ajustes</h1>

      {/* Plan actual */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="text-primary" size={24} />
          <h2 className="text-lg font-semibold text-text-primary">Plan actual</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-text-primary font-bold text-lg">
            Plan {plans.find((p) => p.name === currentPlan)?.label || 'Gratis'}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              currentStatus === 'ACTIVA'
                ? 'bg-green/10 text-green'
                : currentStatus === 'VENCIDA'
                ? 'bg-red/10 text-red'
                : 'bg-amber/10 text-amber'
            }`}
          >
            {currentStatus}
          </span>
          {provider?.subscription?.startDate && (
            <span className="text-text-muted text-sm">
              Desde{' '}
              {new Date(provider.subscription.startDate).toLocaleDateString('es-PE')}
            </span>
          )}
        </div>
      </div>

      {/* Planes disponibles */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <button
          onClick={() => setShowPlans(!showPlans)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-lg font-semibold text-text-primary">
            Planes disponibles
          </h2>
          {showPlans ? (
            <ChevronUp className="text-text-muted" size={20} />
          ) : (
            <ChevronDown className="text-text-muted" size={20} />
          )}
        </button>

        {showPlans && (
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`border rounded-card p-4 ${
                  plan.isCurrent
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-white/5 hover:border-primary/20 transition-colors'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-text-primary">{plan.label}</h3>
                  {plan.isCurrent && (
                    <span className="flex items-center gap-1 text-primary text-xs">
                      <Check size={14} /> Actual
                    </span>
                  )}
                </div>
                <p className="text-primary font-bold text-xl mb-3">
                  {plan.price === 0 ? 'Gratis' : `S/. ${plan.price}/mes`}
                </p>
                <ul className="space-y-1.5 mb-4">
                  {plan.benefits.map((b) => (
                    <li key={b} className="text-text-secondary text-xs flex items-start gap-1.5">
                      <Check size={12} className="text-green mt-0.5 shrink-0" />
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
                    className="w-full bg-primary hover:bg-primary-dark text-white py-2 rounded-button text-sm font-medium transition-colors"
                  >
                    Adquirir
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disponibilidad */}
      {provider && (
        <div className="bg-bg-card border border-white/5 rounded-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Disponibilidad
          </h2>
          <div className="flex gap-3">
            {(['DISPONIBLE', 'OCUPADO', 'CON_DEMORA'] as const).map((status) => (
              <button
                key={status}
                onClick={async () => {
                  try {
                    await api.updateMyProfile({ availability: status });
                    setProvider((prev) =>
                      prev ? { ...prev, availability: status } : prev
                    );
                    toast.success('Disponibilidad actualizada');
                  } catch {
                    toast.error('Error al actualizar');
                  }
                }}
                className={`flex-1 py-2.5 rounded-button text-sm font-medium transition-colors ${
                  provider.availability === status
                    ? 'bg-primary text-white'
                    : 'bg-bg-input text-text-muted hover:text-text-secondary'
                }`}
              >
                {status === 'DISPONIBLE'
                  ? 'Disponible'
                  : status === 'OCUPADO'
                  ? 'Ocupado'
                  : 'Con demora'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modales legales */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6 space-y-3">
        <button
          onClick={() => setShowTerms(true)}
          className="flex items-center gap-3 w-full text-left text-text-secondary hover:text-text-primary transition-colors"
        >
          <FileText size={18} />
          <span className="text-sm">Términos y Condiciones</span>
        </button>
        <button
          onClick={() => setShowPrivacy(true)}
          className="flex items-center gap-3 w-full text-left text-text-secondary hover:text-text-primary transition-colors"
        >
          <Shield size={18} />
          <span className="text-sm">Política de Privacidad</span>
        </button>
        <button
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-3 w-full text-left text-text-secondary hover:text-text-primary transition-colors"
        >
          <HelpCircle size={18} />
          <span className="text-sm">Ayuda</span>
        </button>
      </div>

      {/* Reportar un problema */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-3 w-full text-left text-amber hover:text-amber/80 transition-colors"
        >
          <AlertTriangle size={18} />
          <span className="text-sm font-medium">Reportar un problema</span>
        </button>
      </div>

      {/* Cerrar sesión */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <button
          onClick={() => {
            clearSession();
            router.push('/');
          }}
          className="flex items-center gap-3 w-full text-left text-red hover:text-red/80 transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Cerrar sesión</span>
        </button>
      </div>

      {/* Modal Reporte */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-bg-card border border-white/5 rounded-card p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-text-primary mb-4">
              Reportar un problema
            </h2>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={4}
              className="w-full bg-bg-input border border-white/5 rounded-button p-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none mb-4"
              placeholder="Describe el problema que encontraste..."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReport(false)}
                className="text-text-muted hover:text-text-secondary px-4 py-2 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportSubmit}
                className="bg-amber hover:bg-amber/80 text-black px-6 py-2 rounded-button text-sm font-medium transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales de texto legal */}
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
        content="Centro de ayuda de OficioApp. Si tienes dudas, contáctanos en soporte@oficioapp.pe"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-bg-card border border-white/5 rounded-card w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <pre className="text-text-secondary text-sm whitespace-pre-wrap font-sans">
            {content}
          </pre>
        </div>
        <div className="p-5 border-t border-white/5">
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-button font-semibold text-sm transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

