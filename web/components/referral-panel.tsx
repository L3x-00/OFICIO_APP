'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Coins,
  Copy,
  Share2,
  Sparkles,
  UserPlus,
  Gift,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Crown,
  Star as StarIcon,
  MapPin,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  api,
  type ReferralReward,
  type ReferralStats,
  type CoinRedemption,
  type RedemptionResult,
} from '@/lib/api';

const APP_DOWNLOAD_URL = 'https://oficio-backend.onrender.com/download';

const PLAN_REWARDS = [
  {
    plan: 'ESTANDAR' as const,
    label: 'Plan Estándar',
    duration: '1 mes',
    coinsCost: 500,
    icon: StarIcon,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    plan: 'PREMIUM' as const,
    label: 'Plan Premium',
    duration: '2 meses',
    coinsCost: 1000,
    icon: Crown,
    color: 'text-amber',
    bg: 'bg-amber/10',
    border: 'border-amber/40',
  },
];

type SubTab = 'code' | 'how' | 'redeem' | 'history';

export default function ReferralPanel() {
  const [tab, setTab] = useState<SubTab>('code');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [redemptions, setRedemptions] = useState<CoinRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<
    | { kind: 'plan'; plan: 'ESTANDAR' | 'PREMIUM'; label: string; cost: number }
    | { kind: 'reward'; reward: ReferralReward }
    | null
  >(null);
  const [success, setSuccess] = useState<RedemptionResult | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [s, r, h] = await Promise.allSettled([
        api.getMyReferralStats(),
        api.getReferralRewards(),
        api.getRedemptionHistory(),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (r.status === 'fulfilled') setRewards(r.value);
      if (h.status === 'fulfilled') setRedemptions(h.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const coins = stats?.coins ?? 0;

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-1.5 bg-bg-card border border-white/8 rounded-2xl p-1.5 overflow-x-auto">
        <SubTabButton active={tab === 'code'}   onClick={() => setTab('code')}   icon={Coins}   label="Mi código" />
        <SubTabButton active={tab === 'how'}    onClick={() => setTab('how')}    icon={Sparkles} label="Cómo funciona" />
        <SubTabButton active={tab === 'redeem'} onClick={() => setTab('redeem')} icon={Gift}    label="Canjear monedas" />
        <SubTabButton active={tab === 'history'} onClick={() => setTab('history')} icon={CheckCircle} label="Historial" />
      </div>

      {loading && <PanelSkeleton />}

      {!loading && tab === 'code' && (
        <CodeTab stats={stats} />
      )}

      {!loading && tab === 'how' && <HowTab rewards={rewards} />}

      {!loading && tab === 'redeem' && (
        <RedeemTab
          coins={coins}
          rewards={rewards}
          busy={busy}
          onPickPlan={(plan, label, cost) =>
            setConfirm({ kind: 'plan', plan, label, cost })
          }
          onPickReward={(reward) =>
            setConfirm({ kind: 'reward', reward })
          }
        />
      )}

      {!loading && tab === 'history' && (
        <HistoryTab stats={stats} redemptions={redemptions} />
      )}

      {/* Modal de confirmación */}
      {confirm && (
        <ConfirmRedeemModal
          confirm={confirm}
          coins={coins}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onAccept={async () => {
            setBusy(true);
            try {
              const payload =
                confirm.kind === 'plan'
                  ? { plan: confirm.plan }
                  : { rewardId: confirm.reward.id };
              const result = await api.redeemCoins(payload);
              setConfirm(null);
              setSuccess(result);
              await reload();
            } catch (err) {
              const msg =
                err instanceof Error ? err.message : 'No pudimos completar el canje';
              toast.error(msg);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {/* Modal de éxito */}
      {success && (
        <SuccessRedeemModal
          result={success}
          onClose={() => setSuccess(null)}
        />
      )}
    </div>
  );
}

/* ── Sub-tabs ───────────────────────────────────────────── */

function SubTabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
        active
          ? 'bg-primary/15 text-primary shadow-glow-sm'
          : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

/* ── TAB 1: Mi código ───────────────────────────────────── */

function CodeTab({ stats }: { stats: ReferralStats | null }) {
  if (!stats) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(stats.code);
    toast.success('Código copiado al portapapeles');
  };
  const copyLink = () => {
    const text = `Descarga OficioApp y usa mi código ${stats.code} al registrarte como profesional o negocio. ¡Gana 5 monedas de bienvenida! ${APP_DOWNLOAD_URL}`;
    navigator.clipboard.writeText(text);
    toast.success('Enlace de invitación copiado');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
      <div className="space-y-5">
        {/* Tarjeta del código */}
        <div className="bg-bg-card border border-white/5 rounded-2xl p-6 sm:p-7">
          <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
            Tu código personal
          </p>
          <div className="bg-primary/5 border border-primary/30 rounded-2xl px-5 py-6 flex items-center justify-between gap-4">
            <span
              className="font-mono text-3xl sm:text-4xl font-black text-gradient tracking-[0.3em] truncate"
              aria-label={`Código de referido ${stats.code}`}
            >
              {stats.code}
            </span>
            <button
              onClick={copyCode}
              className="w-11 h-11 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary flex items-center justify-center transition-all hover:scale-110"
              aria-label="Copiar código"
              title="Copiar código"
            >
              <Copy size={18} />
            </button>
          </div>

          <button
            onClick={copyLink}
            className="btn-primary press-effect mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
          >
            <Share2 size={16} />
            Copiar enlace de invitación
          </button>
          <p className="text-text-muted text-xs mt-3 leading-relaxed">
            Comparte tu código por WhatsApp, redes sociales o email. Cuando un
            profesional o negocio sea aprobado usándolo, recibirás{' '}
            <strong className="text-primary">50 monedas</strong>.
          </p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3">
          <MetricBox label="Enviadas"  value={stats.totalInvited}    color="text-blue-400" />
          <MetricBox label="Aprobadas" value={stats.approvedInvited} color="text-green" />
          <MetricBox label="Pendientes" value={stats.pendingInvited} color="text-amber" />
        </div>
      </div>

      {/* Coins card */}
      <CoinsCard coins={stats.coins} />
    </div>
  );
}

function CoinsCard({ coins }: { coins: number }) {
  return (
    <div className="relative bg-gradient-to-br from-amber/30 via-amber/15 to-bg-card border border-amber/30 rounded-2xl p-6 overflow-hidden">
      <div className="blob bg-amber/30 w-48 h-48 -top-10 -right-10 animate-float-slow" aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-11 h-11 rounded-xl bg-amber/25 ring-1 ring-amber/40 flex items-center justify-center">
            <Coins size={22} className="text-amber" />
          </div>
          <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">
            Tus monedas
          </p>
        </div>
        <div className="text-5xl sm:text-6xl font-extrabold text-amber tabular-nums leading-none">
          {coins.toLocaleString('es-PE')}
        </div>
        <p className="text-text-secondary text-sm mt-3">
          Acumula y canjea por planes gratis o servicios de la comunidad.
        </p>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-bg-card border border-white/5 rounded-xl p-4 text-center">
      <div className={`text-2xl font-extrabold tabular-nums ${color}`}>
        {value.toLocaleString('es-PE')}
      </div>
      <div className="text-text-muted text-xs mt-1">{label}</div>
    </div>
  );
}

/* ── TAB 2: Cómo funciona ───────────────────────────────── */

function HowTab({ rewards }: { rewards: ReferralReward[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Step
          number="01"
          icon={Share2}
          title="Comparte tu código"
          desc="Envía tu código único a otros profesionales o negocios."
        />
        <Step
          number="02"
          icon={UserPlus}
          title="Ellos se registran"
          desc="Tu amigo se registra como profesional o negocio usando tu código."
        />
        <Step
          number="03"
          icon={Coins}
          title="Gana monedas"
          desc="Cuando el admin apruebe su perfil, recibes 50 monedas."
        />
      </div>

      {/* Tabla de recompensas */}
      <div className="bg-bg-card border border-white/5 rounded-2xl p-6">
        <h3 className="text-text-primary font-bold text-base mb-1">
          ¿En qué puedes canjear tus monedas?
        </h3>
        <p className="text-text-muted text-xs mb-4">
          El sistema convierte tus invitaciones aprobadas en beneficios reales.
        </p>

        <div className="space-y-3">
          {PLAN_REWARDS.map((p) => (
            <RewardRow
              key={p.plan}
              icon={p.icon}
              iconColor={p.color}
              iconBg={p.bg}
              title={p.label}
              subtitle={`Activación inmediata · ${p.duration}`}
              cost={p.coinsCost}
            />
          ))}
          {rewards.map((r) => (
            <RewardRow
              key={r.id}
              icon={Gift}
              iconColor="text-primary"
              iconBg="bg-primary/10"
              title={r.title}
              subtitle={`${r.provider.businessName}${r.provider.category?.name ? ` · ${r.provider.category.name}` : ''}`}
              cost={r.coinsCost}
            />
          ))}
          {rewards.length === 0 && (
            <p className="text-text-muted text-xs italic text-center py-4">
              Aún no hay servicios canjeables. Vuelve pronto.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  icon: Icon,
  title,
  desc,
}: {
  number: string;
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-bg-card border border-white/5 rounded-2xl p-6 hover-lift transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon size={22} className="text-primary" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Paso {number}
        </span>
      </div>
      <h4 className="text-text-primary font-semibold text-base mb-1.5">{title}</h4>
      <p className="text-text-muted text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function RewardRow({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  cost,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  cost: number;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 bg-bg-input/40 rounded-xl">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-text-primary font-semibold text-sm truncate">{title}</div>
        <div className="text-text-muted text-xs truncate">{subtitle}</div>
      </div>
      <div className="flex items-center gap-1 px-3 py-1 bg-amber/15 border border-amber/30 rounded-full text-amber font-bold text-xs tabular-nums">
        <Coins size={11} />
        {cost.toLocaleString('es-PE')}
      </div>
    </div>
  );
}

/* ── TAB 3: Canjear monedas ─────────────────────────────── */

function RedeemTab({
  coins,
  rewards,
  busy,
  onPickPlan,
  onPickReward,
}: {
  coins: number;
  rewards: ReferralReward[];
  busy: boolean;
  onPickPlan: (plan: 'ESTANDAR' | 'PREMIUM', label: string, cost: number) => void;
  onPickReward: (reward: ReferralReward) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-amber/15 via-bg-card to-bg-card border border-amber/30 rounded-2xl p-5 flex items-center gap-4">
        <Coins size={28} className="text-amber" />
        <div>
          <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">
            Saldo disponible
          </p>
          <p className="text-amber text-3xl font-extrabold tabular-nums">
            {coins.toLocaleString('es-PE')}
          </p>
        </div>
      </div>

      {/* Planes */}
      <div>
        <h3 className="text-text-primary font-bold text-sm mb-3 uppercase tracking-wider">
          Planes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLAN_REWARDS.map((p) => {
            const Icon = p.icon;
            const enough = coins >= p.coinsCost;
            return (
              <div
                key={p.plan}
                className={`bg-bg-card border ${p.border} rounded-2xl p-5 flex flex-col gap-4`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${p.bg} flex items-center justify-center`}>
                    <Icon size={22} className={p.color} />
                  </div>
                  <div>
                    <h4 className="text-text-primary font-bold text-base">{p.label}</h4>
                    <p className="text-text-muted text-xs">{p.duration} · activación inmediata</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber font-extrabold text-2xl tabular-nums">
                    <Coins size={20} />
                    {p.coinsCost.toLocaleString('es-PE')}
                  </div>
                  <button
                    onClick={() => onPickPlan(p.plan, p.label, p.coinsCost)}
                    disabled={!enough || busy}
                    className={`btn-primary press-effect px-5 py-2 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      enough ? '' : ''
                    }`}
                  >
                    {enough ? 'Canjear' : `Faltan ${(p.coinsCost - coins).toLocaleString('es-PE')}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Servicios */}
      <div>
        <h3 className="text-text-primary font-bold text-sm mb-3 uppercase tracking-wider">
          Servicios canjeables
        </h3>
        {rewards.length === 0 ? (
          <div className="bg-bg-card border border-white/5 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center animate-float-slow">
              <Gift size={26} className="text-primary/60" />
            </div>
            <p className="text-text-secondary text-sm">
              Aún no hay servicios canjeables.
            </p>
            <p className="text-text-muted text-xs mt-1">
              El admin publicará nuevos servicios próximamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map((r) => (
              <RewardCard
                key={r.id}
                reward={r}
                coins={coins}
                busy={busy}
                onPick={() => onPickReward(r)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RewardCard({
  reward,
  coins,
  busy,
  onPick,
}: {
  reward: ReferralReward;
  coins: number;
  busy: boolean;
  onPick: () => void;
}) {
  const enough = coins >= reward.coinsCost;
  const cover = useMemo(() => {
    const imgs = reward.provider.images ?? [];
    const c = imgs.find((i) => i.isCover) ?? imgs[0];
    return c?.url;
  }, [reward.provider.images]);

  return (
    <div className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300">
      {cover ? (
        <div className="aspect-[5/3] bg-bg-input overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={reward.title} loading="lazy" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[5/3] bg-bg-input flex items-center justify-center text-text-muted/40">
          <Gift size={36} />
        </div>
      )}

      <div className="p-5">
        <h4 className="text-text-primary font-bold text-base">{reward.title}</h4>
        <p className="text-text-muted text-xs mt-1 truncate">
          {reward.provider.businessName}
          {reward.provider.category?.name ? ` · ${reward.provider.category.name}` : ''}
        </p>
        <p className="text-text-secondary text-sm leading-relaxed mt-3 line-clamp-2">
          {reward.description}
        </p>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1 text-amber font-extrabold text-xl tabular-nums">
            <Coins size={18} />
            {reward.coinsCost.toLocaleString('es-PE')}
          </div>
          <button
            onClick={onPick}
            disabled={!enough || busy}
            className="btn-primary press-effect px-5 py-2 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enough
              ? 'Canjear'
              : `Faltan ${(reward.coinsCost - coins).toLocaleString('es-PE')}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── TAB 4: Historial ───────────────────────────────────── */

function HistoryTab({
  stats,
  redemptions,
}: {
  stats: ReferralStats | null;
  redemptions: CoinRedemption[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
          Invitaciones
        </h3>
        {!stats || stats.history.length === 0 ? (
          <EmptyMini msg="Aún no has invitado a nadie." />
        ) : (
          <div className="bg-bg-card border border-white/5 rounded-2xl divide-y divide-white/5">
            {stats.history.map((h) => {
              const name =
                h.invitedProvider?.businessName ??
                (h.invitedUser
                  ? `${h.invitedUser.firstName} ${h.invitedUser.lastName}`.trim()
                  : 'Invitado');
              const status = STATUS_BADGE[h.status];
              return (
                <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-text-primary text-sm font-semibold truncate">
                      {name}
                    </div>
                    <div className="text-text-muted text-xs mt-0.5">
                      {formatDate(h.createdAt)}
                      {h.coinsAwarded > 0 ? ` · +${h.coinsAwarded} monedas` : ''}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${status.cls}`}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-text-muted text-[10px] uppercase tracking-widest font-bold mb-3">
          Canjes
        </h3>
        {redemptions.length === 0 ? (
          <EmptyMini msg="Todavía no has canjeado monedas." />
        ) : (
          <div className="bg-bg-card border border-white/5 rounded-2xl divide-y divide-white/5">
            {redemptions.map((r) => {
              const title = r.plan
                ? `Plan ${r.plan}`
                : r.reward?.title ?? 'Servicio canjeado';
              return (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-text-primary text-sm font-semibold truncate">
                      {title}
                    </div>
                    <div className="text-text-muted text-xs mt-0.5">
                      {formatDate(r.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber font-bold text-sm tabular-nums">
                    <Coins size={13} />
                    -{r.coinsSpent.toLocaleString('es-PE')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<
  'PENDING' | 'APPROVED' | 'REJECTED',
  { label: string; cls: string }
> = {
  PENDING: { label: 'Pendiente', cls: 'bg-amber/15 text-amber border-amber/40' },
  APPROVED: { label: 'Aprobado', cls: 'bg-green/15 text-green border-green/40' },
  REJECTED: { label: 'Rechazado', cls: 'bg-red/15 text-red border-red/40' },
};

function EmptyMini({ msg }: { msg: string }) {
  return (
    <div className="bg-bg-card border border-white/5 rounded-2xl p-6 text-center text-text-muted text-sm">
      {msg}
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const two = (n: number) => n.toString().padStart(2, '0');
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/* ── Modales ────────────────────────────────────────────── */

function ConfirmRedeemModal({
  confirm,
  coins,
  busy,
  onAccept,
  onCancel,
}: {
  confirm:
    | { kind: 'plan'; plan: 'ESTANDAR' | 'PREMIUM'; label: string; cost: number }
    | { kind: 'reward'; reward: ReferralReward };
  coins: number;
  busy: boolean;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const cost = confirm.kind === 'plan' ? confirm.cost : confirm.reward.coinsCost;
  const enough = coins >= cost;

  const title =
    confirm.kind === 'plan'
      ? `Confirmar canje · ${confirm.label}`
      : `Confirmar canje · ${confirm.reward.title}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-md animate-scale-in shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          <button
            onClick={onCancel}
            disabled={busy}
            className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-bg-input/60 border border-white/5 rounded-xl p-4 mb-4">
          {confirm.kind === 'plan' ? (
            <p className="text-text-secondary text-sm leading-relaxed">
              Vas a activar inmediatamente <strong className="text-text-primary">{confirm.label}</strong>.
              Una vez activado no se puede deshacer.
            </p>
          ) : (
            <>
              <p className="text-text-secondary text-sm leading-relaxed mb-2">
                {confirm.reward.description}
              </p>
              <p className="text-text-muted text-xs">
                Tras canjear, el proveedor te entregará el servicio. Coordina con sus datos de contacto.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-sm mb-5">
          <span className="text-text-muted">Costo</span>
          <span className="text-amber font-extrabold text-lg tabular-nums flex items-center gap-1">
            <Coins size={16} />
            {cost.toLocaleString('es-PE')}
          </span>
        </div>

        {!enough && (
          <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-3 mb-4 text-red text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            No tienes suficientes monedas. Te faltan {(cost - coins).toLocaleString('es-PE')}.
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="text-text-muted hover:text-text-secondary px-4 py-2 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onAccept}
            disabled={busy || !enough}
            className="btn-primary press-effect px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Confirmar canje
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessRedeemModal({
  result,
  onClose,
}: {
  result: RedemptionResult;
  onClose: () => void;
}) {
  const isPlan = !!result.planActivated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-bg-card border border-white/10 rounded-2xl p-6 w-full max-w-md animate-scale-in shadow-2xl">
        <div className="text-center pt-2">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 bg-green/15 rounded-full animate-pulse-glow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle size={40} className="text-green animate-scale-in" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-1">¡Canje exitoso!</h2>
          {isPlan ? (
            <p className="text-text-secondary text-sm">
              Has activado el plan{' '}
              <strong className="text-amber">{result.planActivated}</strong> por{' '}
              {result.months} {result.months === 1 ? 'mes' : 'meses'}.
            </p>
          ) : result.reward ? (
            <p className="text-text-secondary text-sm">
              Has canjeado <strong className="text-text-primary">{result.reward.title}</strong>.
            </p>
          ) : (
            <p className="text-text-secondary text-sm">Tu canje se registró correctamente.</p>
          )}
        </div>

        {!isPlan && result.reward && (
          <div className="bg-bg-input/60 border border-white/5 rounded-xl p-4 mt-5 space-y-2">
            <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">
              Datos del proveedor
            </p>
            <div className="flex items-center gap-2 text-text-primary text-sm">
              <MapPin size={14} className="text-primary" />
              <span>{result.reward.provider.businessName}</span>
            </div>
            {result.reward.provider.phone && (
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <Phone size={14} className="text-primary" />
                {result.reward.provider.phone}
              </div>
            )}
            {result.reward.provider.whatsapp && (
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <MessageCircle size={14} className="text-green" />
                {result.reward.provider.whatsapp}
              </div>
            )}
            <p className="text-text-muted text-xs leading-relaxed pt-2">
              Contacta al proveedor para coordinar tu servicio. Muestra este canje
              como comprobante.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="btn-primary press-effect mt-5 w-full px-6 py-3 rounded-xl text-sm font-semibold"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────── */

function PanelSkeleton() {
  return (
    <div className="space-y-5">
      <div className="skeleton h-32 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-20 rounded-xl" />
      </div>
    </div>
  );
}
