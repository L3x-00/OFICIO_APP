/**
 * Telemetría de contacto de la web (best-effort, público, sin sesión).
 *
 * Registra en `provider_analytics` los eventos que hoy la web NO enviaba
 * (por eso las conversiones desde la web no contaban en el panel Admin ni
 * alimentaban el modelo de predicción). Adjunta la ubicación del cliente
 * SOLO si ya concedió geolocalización antes — nunca dispara un prompt nuevo,
 * así que la métrica de distancia se llena sin molestar al usuario.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://oficio-backend.onrender.com';

export type TrackableEvent = 'view' | 'whatsapp_click' | 'call_click';

export interface ClientCoords {
  lat: number;
  lng: number;
}

/**
 * Devuelve las coords del cliente SOLO si el permiso de geolocalización ya
 * está 'granted'. Si no hay Permissions API o no está concedido → null (no
 * se pregunta, para no interrumpir la navegación).
 */
export async function getCoordsIfGranted(): Promise<ClientCoords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  try {
    if (!navigator.permissions?.query) return null; // sin API → no arriesgar prompt
    const status = await navigator.permissions.query({
      name: 'geolocation' as PermissionName,
    });
    if (status.state !== 'granted') return null;
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 1500, maximumAge: 300000 },
    );
  });
}

/**
 * Registra un evento de contacto. Fire-and-forget: nunca lanza ni bloquea la
 * UI. `keepalive` asegura que el POST sobreviva a la navegación (p. ej. al
 * abrir WhatsApp en otra pestaña). El endpoint es PÚBLICO — no se manda token.
 */
export function trackProviderEvent(
  providerId: number,
  eventType: TrackableEvent,
  coords?: ClientCoords | null,
): void {
  if (!Number.isInteger(providerId) || providerId <= 0) return;
  const body: Record<string, unknown> = { eventType };
  if (coords) {
    body.clientLat = coords.lat;
    body.clientLng = coords.lng;
  }
  try {
    void fetch(`${API_BASE}/providers/${providerId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* best-effort: la telemetría jamás rompe la experiencia */
  }
}
