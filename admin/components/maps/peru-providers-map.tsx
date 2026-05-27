'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Mapa interactivo del Perú con proveedores agrupados por departamento.
 *
 * Diseño:
 *   • Tiles oscuros de CartoDB (matchean el tema del panel admin).
 *   • Cada departamento con proveedores se pinta como `CircleMarker`
 *     rojo cuyo radio escala con `providerCount` (raíz cuadrada para
 *     que la diferencia entre 1 y 50 sea visible pero no exagerada).
 *   • Tooltip on-hover con departamento + conteo.
 *
 * El componente recibe puntos ya pre-procesados desde el backend
 * (lat/lng + count por departamento). Sin estado interno, sin fetch
 * — eso vive en `users-geo-content.tsx`.
 */
export interface MapPoint {
  department: string;
  providerCount: number;
  lat: number;
  lng: number;
}

interface Props {
  points: MapPoint[];
  /** Alto del mapa en CSS. Default 480px. */
  height?: number;
}

// Centro y zoom inicial para que el Perú quepa completo en el viewport
// estándar (ajuste validado a 380px-560px de altura).
const PERU_CENTER: [number, number] = [-9.19, -75.0152];
const PERU_ZOOM = 5;

export default function PeruProvidersMap({ points, height = 480 }: Props) {
  // Leaflet calcula su tamaño al montar. Si el contenedor entró en el
  // DOM con `display:none` (tab swap, modal) el mapa queda en gris.
  // Forzamos un `invalidateSize` con un MutationObserver no es viable
  // acá; el patrón canónico es disparar resize después del mount —
  // suficiente para nuestro caso de uso.
  useEffect(() => {
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      style={{ height }}
      className="relative w-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl"
    >
      <MapContainer
        center={PERU_CENTER}
        zoom={PERU_ZOOM}
        minZoom={4}
        maxZoom={10}
        scrollWheelZoom={false}
        worldCopyJump={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: '#0b1220' }}
      >
        {/* Tiles oscuros — matchean el bg del admin (slate-950). */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {points.map((p) => (
          <CircleMarker
            key={p.department}
            center={[p.lat, p.lng]}
            radius={6 + Math.sqrt(p.providerCount) * 6}
            pathOptions={{
              color:       '#F97316',          // borde naranja Servi
              weight:      2,
              fillColor:   '#EF4444',          // relleno rojo
              fillOpacity: 0.55,
            }}
          >
            <Tooltip
              direction="top"
              offset={L.point(0, -4)}
              opacity={0.95}
              className="!bg-slate-900 !text-white !border !border-white/10 !rounded-lg"
            >
              <span className="font-bold text-white">{p.department}</span>
              <span className="text-amber-300 ml-1.5">
                · {p.providerCount} proveedor
                {p.providerCount === 1 ? '' : 'es'}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Leyenda flotante — esquina inferior izquierda */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/85 backdrop-blur border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60 border border-orange-400" />
          <span>1 punto = 1 departamento con proveedores</span>
        </div>
      </div>
    </div>
  );
}
