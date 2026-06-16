'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import { Crosshair, Search, Loader2 } from 'lucide-react';

type LatLng = [number, number];

// Centro por defecto: Huancayo (ciudad intermedia objetivo) si no hay GPS.
const FALLBACK: LatLng = [-12.0686, -75.2103];
const PRIMARY = '#E07B39';

// Captura clics en el mapa para reubicar el centro del radio.
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Vuela la cámara cuando el centro cambia por GPS/click (el prop `center` de
// MapContainer solo aplica al montar; los layers sí son reactivos).
function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 0.6 });
  }, [center, map]);
  return null;
}

export default function SearchRadarMap({
  onSearch,
  loading,
}: {
  onSearch: (latitude: number, longitude: number, radiusKm: number) => void;
  loading?: boolean;
}) {
  const [center, setCenter] = useState<LatLng>(FALLBACK);
  const [radiusKm, setRadiusKm] = useState(5);
  const [locating, setLocating] = useState(false);

  // Intenta centrar en el GPS del usuario al montar (no bloqueante).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const useGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-2xl overflow-hidden border border-white/10 h-[300px]">
        <MapContainer
          center={center}
          zoom={13}
          minZoom={4}
          maxZoom={18}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%', background: '#0b0e14' }}
        >
          <TileLayer
            url="https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          <Circle
            center={center}
            radius={radiusKm * 1000}
            pathOptions={{ color: PRIMARY, fillColor: PRIMARY, fillOpacity: 0.12, weight: 2 }}
          />
          <CircleMarker
            center={center}
            radius={7}
            pathOptions={{ color: '#ffffff', weight: 2, fillColor: PRIMARY, fillOpacity: 1 }}
          />
          <ClickHandler onPick={(lat, lng) => setCenter([lat, lng])} />
          <Recenter center={center} />
        </MapContainer>

        {/* Botón recenter GPS */}
        <button
          type="button"
          onClick={useGps}
          disabled={locating}
          aria-label="Usar mi ubicación"
          className="absolute bottom-3 right-3 z-[400] w-10 h-10 rounded-full bg-dark-card/90 border border-white/15 text-white flex items-center justify-center shadow-lg hover:border-primary/50 transition-colors disabled:opacity-60"
        >
          {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
        </button>
      </div>

      {/* Slider de radio */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-white/50">Radio</span>
        <input
          type="range"
          min={1}
          max={50}
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className="flex-1 accent-primary"
        />
        <span className="w-14 text-right text-sm font-semibold text-white">{radiusKm} km</span>
      </div>

      <button
        type="button"
        onClick={() => onSearch(center[0], center[1], radiusKm)}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl py-3 transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        Buscar en {radiusKm} km a la redonda
      </button>
    </div>
  );
}
