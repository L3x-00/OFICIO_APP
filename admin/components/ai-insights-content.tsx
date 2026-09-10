'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart, Bar, Cell, LabelList,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Brain, Target, MousePointerClick, Eye, ShieldCheck, Sparkles, Gauge,
  RefreshCw, Loader2, AlertTriangle, TrendingUp, Lightbulb, Ban, Clock,
} from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getInsightsDashboard, getInsightsConversion, getInsightsDataQuality,
  getInsightsPatterns, getInsightsModel, getInsightsRecentPredictions,
  trainInsightsModel, predictConversion,
  type InsightsDashboard, type InsightsConversion, type InsightsDataQuality,
  type InsightsPatterns, type InsightsModelStatus, type RecentPrediction,
  type PredictionResult,
} from '@/lib/api';

// Paleta categórica de planes — VALIDADA (colorblind-safe) contra superficie
// oscura con el script del skill dataviz (blue/orange/aqua, slots 1-3).
const PLAN_COLORS: Record<string, string> = {
  GRATIS: '#3987e5',
  ESTANDAR: '#d95926',
  PREMIUM: '#199e70',
};
// Hue único para medidas de una sola serie (magnitud, no identidad).
const HUE = '#3987e5';
const DAY_OPTIONS = [7, 30, 90] as const;

const pct = (n: number | null | undefined) =>
  n == null ? '—' : `${Math.round(n)}%`;

// Tono de la etiqueta de probabilidad de una predicción.
function labelTone(label: string): 'success' | 'warning' | 'neutral' | 'danger' {
  if (label === 'alta') return 'success';
  if (label === 'media') return 'warning';
  if (label === 'baja') return 'neutral';
  return 'danger'; // sin_modelo
}

interface TooltipEntry { name: string; value: number; color: string; dataKey: string }
function ChartTooltip({
  active, payload, label, unit = '',
}: { active?: boolean; payload?: TooltipEntry[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-1)', border: '1px solid var(--border-default)',
      borderRadius: 10, padding: '8px 12px', fontSize: 12,
    }}>
      {label != null && (
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      )}
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {p.name}: {p.value.toLocaleString()}{unit}
        </div>
      ))}
    </div>
  );
}

// Barra-medidor horizontal (HTML) para una dimensión de calidad de datos.
function QualityMeter({ label, score, hint }: { label: string; score: number; hint: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          {score}%
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.max(0, Math.min(100, score))}%`, height: '100%',
          borderRadius: 99, background: HUE, transition: 'width .4s ease',
        }} />
      </div>
      <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{hint}</span>
    </div>
  );
}

export default function AiInsightsContent() {
  const [days, setDays] = useState<number>(30);
  const [dashboard, setDashboard] = useState<InsightsDashboard | null>(null);
  const [conversion, setConversion] = useState<InsightsConversion | null>(null);
  const [quality, setQuality] = useState<InsightsDataQuality | null>(null);
  const [patterns, setPatterns] = useState<InsightsPatterns | null>(null);
  const [model, setModel] = useState<InsightsModelStatus | null>(null);
  const [predictions, setPredictions] = useState<RecentPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [training, setTraining] = useState(false);

  // Predicción "what-if" por proveedor.
  const [providerId, setProviderId] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const [dash, conv, qual, pat, mdl, preds] = await Promise.all([
        getInsightsDashboard(d),
        getInsightsConversion(d),
        getInsightsDataQuality(),
        getInsightsPatterns(d),
        getInsightsModel(),
        getInsightsRecentPredictions(10),
      ]);
      setDashboard(dash);
      setConversion(conv);
      setQuality(qual);
      setPatterns(pat);
      setModel(mdl);
      setPredictions(preds);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando la analítica predictiva');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const retrain = async () => {
    setTraining(true);
    try {
      await trainInsightsModel();
      await load(days);
    } finally {
      setTraining(false);
    }
  };

  const runPrediction = async () => {
    const id = Number.parseInt(providerId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setPredictError('Ingresa un ID de proveedor válido.');
      return;
    }
    setPredicting(true);
    setPredictError(null);
    setPrediction(null);
    try {
      const res = await predictConversion({ providerId: id });
      setPrediction(res);
      // Refresca el historial para que la nueva predicción aparezca arriba.
      getInsightsRecentPredictions(10).then(setPredictions).catch(() => {});
    } catch (e) {
      setPredictError(e instanceof Error ? e.message : 'No se pudo predecir');
    } finally {
      setPredicting(false);
    }
  };

  if (loading && !dashboard) {
    return (
      <div style={{
        minHeight: 320, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13,
      }}>
        <Loader2 size={18} className="animate-spin" /> Cargando análisis predictivo…
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
        <button onClick={() => load(days)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: 'var(--surface-3)', border: '1px solid var(--border-default)',
          borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12.5,
        }}>
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    );
  }

  const byPlan = conversion?.byPlan ?? [];
  const byHour = conversion?.byHour ?? [];
  const byDistance = conversion?.byDistance ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg,#3987e5,#199e70)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Brain size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              Análisis Predictivo · Conversión
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {dashboard?.contacts.toLocaleString() ?? 0} contactos ·{' '}
              {dashboard?.views.toLocaleString() ?? 0} vistas · últimos {days} días
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Selector de rango */}
          <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 8, padding: 2 }}>
            {DAY_OPTIONS.map((d) => (
              <button key={d} onClick={() => setDays(d)} style={{
                padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: days === d ? 'var(--surface-1)' : 'transparent',
                color: days === d ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}>{d}d</button>
            ))}
          </div>
          <button onClick={() => load(days)} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
            background: 'var(--surface-3)', border: '1px solid var(--border-default)',
            borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12.5,
          }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <MetricCard title="Tasa de conversión" value={pct(dashboard?.conversionRate)} icon={Target} color="green" subtitle="Contactos / vistas (proxy)" />
        <MetricCard title="Contactos" value={dashboard?.contacts ?? 0} icon={MousePointerClick} color="blue" subtitle="WhatsApp + llamadas" />
        <MetricCard title="Vistas" value={dashboard?.views ?? 0} icon={Eye} color="teal" subtitle="Aperturas de ficha" />
        <MetricCard title="Calidad de datos" value={pct(dashboard?.dataQualityScore)} icon={ShieldCheck} color="purple" subtitle={`${quality?.sampleSize ?? 0} proveedores`} />
        <MetricCard title="Precisión del modelo" value={dashboard?.modelAccuracy != null ? pct(dashboard.modelAccuracy * 100) : '—'} icon={Gauge} color="orange" subtitle={model?.trained ? `AUC ${model.metrics?.auc ?? '—'}` : 'Modelo sin entrenar'} />
        <MetricCard title="Predicciones" value={dashboard?.predictionsCount ?? 0} icon={Sparkles} color="blue" subtitle="Servidas y registradas" />
      </div>

      {/* Conversión por hora */}
      <Card>
        <CardHeader>
          <CardTitle>Conversión por hora del día (Perú)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={byHour} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="key" interval={1} tickFormatter={(v) => `${v}h`} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis unit="%" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip unit="%" />} />
              <Line type="monotone" dataKey="conversionRate" name="Conversión" stroke={HUE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Plan + Distancia */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Conversión por plan */}
        <Card>
          <CardHeader><CardTitle>Tasa de conversión por plan</CardTitle></CardHeader>
          <CardContent>
            {byPlan.length === 0 ? (
              <EmptyChart text="Aún no hay eventos segmentados por plan." />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byPlan} margin={{ top: 18, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="key" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis unit="%" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip unit="%" />} />
                    <Bar dataKey="conversionRate" name="Conversión" radius={[4, 4, 0, 0]}>
                      {byPlan.map((b) => (
                        <Cell key={b.key} fill={PLAN_COLORS[b.key] ?? HUE} />
                      ))}
                      <LabelList dataKey="conversionRate" position="top" formatter={(v) => `${v}%`} fill="var(--text-secondary)" fontSize={11} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Leyenda (identidad no depende solo del color) */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
                  {byPlan.map((b) => (
                    <span key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: PLAN_COLORS[b.key] ?? HUE }} />
                      {b.key} · {b.contacts}/{b.views}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Conversión por distancia */}
        <Card>
          <CardHeader><CardTitle>Conversión por distancia (km)</CardTitle></CardHeader>
          <CardContent>
            {byDistance.length === 0 ? (
              <EmptyChart
                icon={<Target size={26} color="var(--text-tertiary)" />}
                text="Sin datos de distancia todavía."
                hint="Se llena cuando la web/móvil envíen la ubicación del cliente al contactar."
              />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byDistance} margin={{ top: 18, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="key" tickFormatter={(v) => `${v} km`} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis unit="%" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip unit="%" />} />
                  <Bar dataKey="conversionRate" name="Conversión" fill={HUE} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="conversionRate" position="top" formatter={(v) => `${v}%`} fill="var(--text-secondary)" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calidad de datos + Rechazo por categoría (diferido) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card>
          <CardHeader><CardTitle>Calidad de datos de proveedores</CardTitle></CardHeader>
          <CardContent>
            {quality && quality.sampleSize > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <QualityMeter label="Completitud" score={quality.completeness.score} hint="Campos clave del perfil llenos" />
                <QualityMeter label="Consistencia" score={quality.consistency.score} hint="Sin contradicciones (rating, geo, reseñas)" />
                <QualityMeter label="Validez" score={quality.validity.score} hint="Formato correcto (teléfono, RUC, DNI)" />
                <QualityMeter label="Unicidad" score={quality.uniqueness.score} hint="Sin teléfonos duplicados" />
                <QualityMeter label="Exactitud" score={quality.accuracy.score} hint="Perfiles verificados por admin" />
              </div>
            ) : (
              <EmptyChart text="Sin proveedores para evaluar." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rechazo por categoría</CardTitle></CardHeader>
          <CardContent>
            <EmptyChart
              icon={<Ban size={26} color="var(--text-tertiary)" />}
              text="Métrica diferida."
              hint="Depende de las solicitudes/ofertas (subastas, agenda, cotización), hoy ocultas por feature flag. Se activa al reactivarlas."
            />
          </CardContent>
        </Card>
      </div>

      {/* Patrones detectados */}
      <Card>
        <CardHeader><CardTitle>Patrones detectados</CardTitle></CardHeader>
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(patterns?.patterns ?? []).map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--surface-3)', border: '1px solid var(--border-default)',
              }}>
                <Lightbulb size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{p}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modelo + Predicción what-if */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Estado del modelo */}
        <Card>
          <CardHeader><CardTitle>Modelo de conversión</CardTitle></CardHeader>
          <CardContent>
            {model?.trained ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge tone="success">Entrenado</Badge>
                  <Badge tone="neutral">{model.algorithm}</Badge>
                </div>
                <Row label="Precisión (validación cruzada)" value={pct((model.metrics?.accuracy ?? 0) * 100)} />
                <Row label="AUC" value={String(model.metrics?.auc ?? '—')} />
                <Row label="Muestras de entrenamiento" value={String(model.metrics?.sampleSize ?? 0)} />
                <Row label="Casos positivos" value={String(model.metrics?.positives ?? 0)} />
                <Row label="Entrenado" value={model.trainedAt ? new Date(model.trainedAt).toLocaleString('es-PE') : '—'} />
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                El modelo aún no se ha entrenado (o no hay suficientes datos con
                exposición). Reentrena para generar la primera versión.
              </p>
            )}
            <button onClick={retrain} disabled={training} style={{
              marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'var(--surface-3)', border: '1px solid var(--border-default)',
              borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12.5,
            }}>
              <RefreshCw size={13} className={training ? 'animate-spin' : ''} />
              {training ? 'Entrenando…' : 'Reentrenar modelo'}
            </button>
          </CardContent>
        </Card>

        {/* Predicción what-if */}
        <Card>
          <CardHeader><CardTitle>Probar predicción</CardTitle></CardHeader>
          <CardContent>
            <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Predice la probabilidad de conversión de un proveedor por su ID.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runPrediction(); }}
                placeholder="ID de proveedor"
                inputMode="numeric"
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  background: 'var(--surface-3)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
              <button onClick={runPrediction} disabled={predicting} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                background: HUE, border: 'none', borderRadius: 8, color: '#fff',
                cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
              }}>
                {predicting ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                Predecir
              </button>
            </div>
            {predictError && (
              <p style={{ fontSize: 12, color: '#EF4444', marginTop: 10 }}>{predictError}</p>
            )}
            {prediction && (
              <div style={{
                marginTop: 14, padding: 14, borderRadius: 12,
                background: 'var(--surface-3)', border: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 68, height: 68, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, color: 'var(--text-primary)',
                  background: `conic-gradient(${HUE} ${prediction.probability * 3.6}deg, var(--surface-1) 0deg)`,
                }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: '50%', background: 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>{prediction.probability}%</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Badge tone={labelTone(prediction.label)}>Probabilidad {prediction.label}</Badge>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {prediction.modelVersion ? `modelo ${prediction.modelVersion}` : 'sin modelo entrenado'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Predicciones recientes */}
      <Card>
        <CardHeader><CardTitle>Últimas predicciones</CardTitle></CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Aún no se han servido predicciones.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {predictions.map((p) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px', borderRadius: 8, background: 'var(--surface-3)',
                }}>
                  <Clock size={13} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', width: 130, flexShrink: 0 }}>
                    {new Date(p.createdAt).toLocaleString('es-PE')}
                  </span>
                  <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {p.providerId != null ? `Proveedor #${p.providerId}` : 'Escenario manual'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {p.probability}%
                  </span>
                  <Badge tone={labelTone(p.label)}>{p.label}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
      <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function EmptyChart({ icon, text, hint }: { icon?: React.ReactNode; text: string; hint?: string }) {
  return (
    <div style={{
      height: 220, display: 'flex', flexDirection: 'column', gap: 8,
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16,
    }}>
      {icon}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{text}</p>
      {hint && <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', maxWidth: 280, lineHeight: 1.5 }}>{hint}</p>}
    </div>
  );
}
