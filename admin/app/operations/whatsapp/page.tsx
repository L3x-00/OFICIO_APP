"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  MessageCircle,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  acknowledgeWhatsappDeliveryFailure,
  acknowledgeWhatsappHandover,
  getWhatsappDeliveryFailures,
  getWhatsappHandovers,
  getWhatsappOperationsSummary,
  type WhatsappDeliveryFailure,
  type WhatsappHandover,
  type WhatsappOperationsSummary,
} from "@/lib/api";

function formatDate(value: string): string {
  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  });
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function WhatsappOperationsPage() {
  const [summary, setSummary] = useState<WhatsappOperationsSummary | null>(
    null,
  );
  const [handovers, setHandovers] = useState<WhatsappHandover[]>([]);
  const [failures, setFailures] = useState<WhatsappDeliveryFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextHandovers, nextFailures] = await Promise.all([
        getWhatsappOperationsSummary(),
        getWhatsappHandovers(),
        getWhatsappDeliveryFailures(),
      ]);
      setSummary(nextSummary);
      setHandovers(nextHandovers);
      setFailures(nextFailures);
    } catch (loadError) {
      setError(errorText(loadError, "No se pudieron cargar las operaciones."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function acknowledge(kind: "handover" | "failure", id: number) {
    const key = `${kind}:${id}`;
    setActing(key);
    setError(null);
    try {
      if (kind === "handover") {
        await acknowledgeWhatsappHandover(id);
      } else {
        await acknowledgeWhatsappDeliveryFailure(id);
      }
      await load();
    } catch (actionError) {
      setError(errorText(actionError, "No se pudo registrar la acción."));
    } finally {
      setActing(null);
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" /> Cargando operaciones de
        WhatsApp…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <MessageCircle size={21} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              WhatsApp Servi
            </h1>
            <p className="text-sm text-[var(--text-tertiary)]">
              Handover humano y fallos de entrega. Sin conversaciones ni datos
              personales.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-3)] px-3 py-2 text-sm text-[var(--text-secondary)] disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
          Actualizar
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertTriangle size={16} /> {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          title="Handovers hoy"
          value={summary?.handoversToday ?? 0}
          icon={MessageCircle}
          color="blue"
          subtitle="Solicitudes humanas recibidas"
        />
        <MetricCard
          title="Pendientes humanos"
          value={summary?.openHandovers ?? 0}
          icon={UsersRound}
          color="orange"
          alert={(summary?.openHandovers ?? 0) > 0}
          subtitle="Aún sin reconocimiento"
        />
        <MetricCard
          title="DLQ pendiente"
          value={summary?.pendingDeliveryFailures ?? 0}
          icon={AlertTriangle}
          color="red"
          alert={(summary?.pendingDeliveryFailures ?? 0) > 0}
          subtitle="Solo reconocimiento; sin reintento"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Handovers por tomar</CardTitle>
          </CardHeader>
          <CardContent>
            {handovers.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">
                Sin handovers pendientes.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-default)]">
                {handovers.map((handover) => {
                  const key = `handover:${handover.id}`;
                  return (
                    <div
                      key={handover.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Solicitud #{handover.id}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {formatDate(handover.requestedAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void acknowledge("handover", handover.id)
                        }
                        disabled={acting === key}
                        className="flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2.5 py-1.5 text-xs font-medium text-emerald-300 disabled:opacity-60"
                      >
                        {acting === key ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Tomar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fallos de entrega</CardTitle>
          </CardHeader>
          <CardContent>
            {failures.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">
                Sin fallos pendientes.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-default)]">
                {failures.map((failure) => {
                  const key = `failure:${failure.id}`;
                  return (
                    <div
                      key={failure.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          Fallo #{failure.id} ·{" "}
                          {failure.errorCode ?? "SEND_UNKNOWN_ERROR"}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {formatDate(failure.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void acknowledge("failure", failure.id)}
                        disabled={acting === key}
                        className="flex items-center gap-1.5 rounded-md bg-[var(--surface-3)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] disabled:opacity-60"
                      >
                        {acting === key ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Reconocer
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
