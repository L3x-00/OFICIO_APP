import { haversineKm } from './geo.util.js';

describe('haversineKm', () => {
  it('es 0 para el mismo punto', () => {
    expect(haversineKm(-12.06, -75.2, -12.06, -75.2)).toBe(0);
  });

  it('es simétrica', () => {
    const a = haversineKm(-12.06, -75.2, -12.04, -75.21);
    const b = haversineKm(-12.04, -75.21, -12.06, -75.2);
    expect(a).toBeCloseTo(b, 6);
  });

  it('~1.11 km por 0.01° de latitud', () => {
    // 0.01° de latitud ≈ 1.11 km en cualquier meridiano.
    expect(haversineKm(-12.0, -75.2, -12.01, -75.2)).toBeCloseTo(1.11, 1);
  });

  it('distancia conocida Huancayo↔Lima ≈ 200 km (aprox)', () => {
    const d = haversineKm(-12.0651, -75.2049, -12.0464, -77.0428);
    expect(d).toBeGreaterThan(180);
    expect(d).toBeLessThan(220);
  });
});
