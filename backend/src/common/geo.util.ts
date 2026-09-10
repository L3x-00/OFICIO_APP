/**
 * Distancia geodésica (haversine) en kilómetros entre dos puntos lat/lng.
 * Pura y sin dependencias. Se usa para anotar la distancia cliente↔proveedor
 * en los eventos de analítica (el cálculo por radio de búsqueda sigue en
 * PostGIS; esto es solo para etiquetar un evento puntual).
 */
const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // 3 decimales (~1 m) es más que suficiente para bucketizar por km.
  return Math.round(EARTH_RADIUS_KM * c * 1000) / 1000;
}
