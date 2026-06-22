'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Bot, Coins, DollarSign, Clock, ShieldAlert, Zap, RefreshCw, Loader2,
  MessageSquare, AlertTriangle, X,
} from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getAiSummary, getAiTopQueries, getAiSecurityEvents,
  type AiSummary, type AiTopQuery, type AiSecurityEvents,
} from '@/lib/api';

// Tipo de evento de estabilidad seleccionado para el Drawer de detalle.
type SecurityEventType = 'jailbreak' | 'breaker' | 'errors';

// Botón transparente que envuelve un Badge para hacerlo clicable.
function EventButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ver detalle"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      {children}
    </button>
  );
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short',
  });
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: TooltipPayload[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border-default)',
      borderRadius: 10,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>
        {label ? fmtDate(label) : ''}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value.toLocaleString()}
        </div>
      ))}
    </div>
  );
}

// Mapea el estado del breaker a un tono de Badge.
function breakerTone(state: string): 'success' | 'warning' | 'danger' {
  if (state === 'OPEN') return 'danger';
  if (state === 'HALF_OPEN') return 'warning';
  return 'success';
}

// Etiqueta humana del estado del breaker. CLOSED es el estado SANO
// (circuito cerrado = la corriente fluye = IA operativa) pero "closed"
// se lee como "apagado" → lo traducimos para el admin.
function breakerLabel(state: string | undefined): string {
  if (state === 'OPEN') return 'Cortado';
  if (state === 'HALF_OPEN') return 'Recuperando';
  if (state === 'CLOSED') return 'Operativo';
  return '—';
}

export default function AiAnalyticsContent() {
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [topQueries, setTopQueries] = useState<AiTopQuery[]>([]);
  const [security, setSecurity] = useState<AiSecurityEvents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Evento de estabilidad abierto en el Drawer de detalle (null = cerrado).
  const [drawerEvent, setDrawerEvent] = useState<SecurityEventType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, tq, sec] = await Promise.all([
        getAiSummary(),
        getAiTopQueries(10),
        getAiSecurityEvents(),
      ]);
      setSummary(s);
      setTopQueries(tq);
      setSecurity(sec);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando la analítica de IA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !summary) {
    return (
      <div style={{
        minHeight: 320, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13,
      }}>
        <Loader2 size={18} className="animate-spin" />
        Cargando observabilidad IA…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: 240, display: 'flex', flexDirection: 'column', gap: 12,
        alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
      }}>
        <AlertTriangle size={28} color="#EF4444" />
        <p style={{ fontSize: 13 }}>{error}</p>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: 'var(--surface-3)', border: '1px solid var(--border-default)',
          borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12.5,
        }}>
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    );
  }

  const cb = security?.circuitBreaker;
  const timeline = summary?.timeline ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg,#F59E0B,#B97506)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a',
          }}>
            <Bot size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              Observabilidad IA · Ofi
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {summary?.questionsToday.toLocaleString() ?? 0} preguntas hoy ·{' '}
              {summary?.questionsAllTime.toLocaleString() ?? 0} totales
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge tone="info">prompt {summary?.promptVersion ?? '—'}</Badge>
          <button onClick={load} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
            background: 'var(--surface-3)', border: '1px solid var(--border-default)',
            borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12.5,
          }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14,
      }}>
        <MetricCard
          title="Tokens hoy"
          value={summary?.tokensToday ?? 0}
          icon={Coins}
          color="teal"
          subtitle="Consumo diario de Gemini"
        />
        <MetricCard
          title="Costo estimado hoy"
          value={`$${(summary?.estimatedCostTodayUSD ?? 0).toFixed(4)}`}
          icon={DollarSign}
          color="green"
          subtitle="USD aprox. por tokens"
        />
        <MetricCard
          title="Latencia promedio"
          value={`${summary?.avgLatencyMs ?? 0} ms`}
          icon={Clock}
          color="blue"
          subtitle="Respuesta del modelo"
        />
        <MetricCard
          title="Intentos de jailbreak"
          value={security?.jailbreakToday ?? 0}
          icon={ShieldAlert}
          color="red"
          alert={(security?.jailbreakToday ?? 0) > 0}
          subtitle={`${security?.jailbreakTotal ?? 0} en total`}
        />
        <MetricCard
          title="Estado del asistente"
          value={breakerLabel(cb?.state)}
          icon={Zap}
          color={cb?.state === 'OPEN' ? 'red' : cb?.state === 'HALF_OPEN' ? 'orange' : 'green'}
          alert={cb?.isOpen ?? false}
          subtitle={
            cb?.state === 'CLOSED'
              ? 'IA operativa · sin cortes'
              : `${security?.breakerOpensToday ?? 0} aperturas hoy · ${security?.geminiErrorsToday ?? 0} errores`
          }
        />
      </div>

      {/* Gráfica de uso */}
      <Card>
        <CardHeader>
          <CardTitle>Uso de IA por día (14 días)</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              Sin datos de uso todavía.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeline} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tickFormatter={fmtDate} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="q" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis yAxisId="t" orientation="right" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line yAxisId="q" type="monotone" dataKey="questions" name="Preguntas" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line yAxisId="t" type="monotone" dataKey="tokens" name="Tokens" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top queries + Seguridad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Top queries */}
        <Card>
          <CardHeader>
            <CardTitle>Consultas más frecuentes</CardTitle>
          </CardHeader>
          <CardContent>
            {topQueries.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Aún no hay consultas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topQueries.map((q, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, background: 'var(--surface-3)',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', width: 18 }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.query}
                    </span>
                    <Badge tone="neutral">{q.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos de seguridad */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos de seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <EventButton onClick={() => setDrawerEvent('breaker')}>
                <Badge tone={breakerTone(cb?.state ?? 'CLOSED')}>
                  <Zap size={11} /> Asistente: {breakerLabel(cb?.state)}
                </Badge>
              </EventButton>
              <EventButton onClick={() => setDrawerEvent('errors')}>
                <Badge tone={(security?.geminiErrorsToday ?? 0) > 0 ? 'warning' : 'neutral'}>
                  {security?.geminiErrorsToday ?? 0} errores Gemini hoy
                </Badge>
              </EventButton>
              <EventButton onClick={() => setDrawerEvent('jailbreak')}>
                <Badge tone={(security?.jailbreakToday ?? 0) > 0 ? 'danger' : 'neutral'}>
                  <ShieldAlert size={11} /> {security?.jailbreakToday ?? 0} jailbreaks hoy
                </Badge>
              </EventButton>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
              Haz clic en un evento para ver el detalle de los inputs bloqueados o el estado del breaker.
            </p>

            <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={12} /> Intentos bloqueados recientes
            </p>
            {security && security.recentJailbreaks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {security.recentJailbreaks.slice(0, 3).map((j, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDrawerEvent('jailbreak')}
                    style={{
                      textAlign: 'left', cursor: 'pointer',
                      padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
                    }}
                  >
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {j.content}
                    </p>
                    <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 3 }}>
                      {new Date(j.createdAt).toLocaleString('es-PE')}{j.ip ? ` · ${j.ip}` : ''}
                    </p>
                  </button>
                ))}
                {security.recentJailbreaks.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setDrawerEvent('jailbreak')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent, #F59E0B)', fontSize: 12, textAlign: 'left', padding: '2px 0' }}
                  >
                    Ver los {security.recentJailbreaks.length} intentos →
                  </button>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 12.5 }}>
                Sin intentos de jailbreak registrados. 🛡️
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drawer de detalle de eventos de estabilidad */}
      {drawerEvent && security && (
        <SecurityEventDrawer
          event={drawerEvent}
          data={security}
          onClose={() => setDrawerEvent(null)}
        />
      )}
    </div>
  );
}

// ── Drawer lateral con el detalle del evento de estabilidad ──
function SecurityEventDrawer({
  event, data, onClose,
}: { event: SecurityEventType; data: AiSecurityEvents; onClose: () => void }) {
  const cb = data.circuitBreaker;
  const title =
    event === 'jailbreak' ? 'Intentos de jailbreak bloqueados'
    : event === 'breaker' ? 'Circuit Breaker'
    : 'Errores de Gemini';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 92vw)', height: '100%',
          background: 'var(--surface-1, #161616)', borderLeft: '1px solid var(--border-default, rgba(255,255,255,0.08))',
          display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 30px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-default, rgba(255,255,255,0.06))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {event === 'breaker' ? <Zap size={18} color="#F97316" />
              : <ShieldAlert size={18} color="#EF4444" />}
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {event === 'jailbreak' && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge tone={data.jailbreakToday > 0 ? 'danger' : 'neutral'}>{data.jailbreakToday} hoy</Badge>
                <Badge tone="neutral">{data.jailbreakTotal} en total</Badge>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Inputs detectados como inyección de prompt / jailbreak por el sanitizador y bloqueados antes de llegar al modelo. Se muestran los últimos {data.recentJailbreaks.length} (contenido recortado por el backend a 160 caracteres).
              </p>
              {data.recentJailbreaks.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Sin intentos registrados. 🛡️</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.recentJailbreaks.map((j, i) => (
                    <div key={i} style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
                    }}>
                      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                        {j.content}
                      </p>
                      <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 5 }}>
                        {new Date(j.createdAt).toLocaleString('es-PE')}{j.ip ? ` · IP ${j.ip}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {event === 'breaker' && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge tone={breakerTone(cb.state)}>Estado: {breakerLabel(cb.state)} ({cb.state})</Badge>
                <Badge tone={cb.fails > 0 ? 'warning' : 'neutral'}>{cb.fails} fallos consecutivos</Badge>
              </div>
              <DrawerRow label="Aperturas hoy" value={String(data.breakerOpensToday)} />
              <DrawerRow label="Errores de Gemini hoy" value={String(data.geminiErrorsToday)} />
              <DrawerRow
                label="Abierto desde"
                value={cb.openedAt ? new Date(cb.openedAt).toLocaleString('es-PE') : '—'}
              />
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                El breaker corta las llamadas a Gemini tras fallos repetidos para proteger el servicio. En estado <strong>OPEN</strong> las peticiones se rechazan temporalmente; pasa a <strong>HALF_OPEN</strong> para probar recuperación y vuelve a <strong>CLOSED</strong> al normalizarse.
              </p>
            </>
          )}

          {event === 'errors' && (
            <>
              <Badge tone={data.geminiErrorsToday > 0 ? 'warning' : 'neutral'}>{data.geminiErrorsToday} errores hoy</Badge>
              <DrawerRow label="Estado del asistente" value={`${breakerLabel(cb.state)} (${cb.state})`} />
              <DrawerRow label="Aperturas del breaker hoy" value={String(data.breakerOpensToday)} />
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Contador diario de errores de la API de Gemini (timeouts, 5xx, cuota). El detalle por error no se persiste en BD — solo el contador en Redis y la traza completa en Sentry. Si los errores disparan el breaker, lo verás reflejado en su estado.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DrawerRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
