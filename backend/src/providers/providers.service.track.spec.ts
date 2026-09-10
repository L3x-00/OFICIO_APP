import { ProvidersService } from './providers.service.js';

// Cubre SOLO la lógica de tracking con distancia añadida en la sub-fase 3.
// ProvidersService tiene un constructor liviano: (prisma, events).

function setup(
  providerLatLng: { latitude: number | null; longitude: number | null } | null,
) {
  const create = jest.fn().mockResolvedValue({ id: 1 });
  const findUnique = jest
    .fn()
    .mockResolvedValue(
      providerLatLng
        ? { ...providerLatLng, userId: 7, type: 'OFICIO' }
        : { latitude: null, longitude: null, userId: 7, type: 'OFICIO' },
    );
  const prisma = {
    providerAnalytic: { create },
    provider: { findUnique },
  } as any;
  const events = { emitProviderAnalytics: jest.fn() } as any;
  return { service: new ProvidersService(prisma, events), create, findUnique };
}

describe('ProvidersService.trackEvent (distancia)', () => {
  it('sin coords: payload idéntico al histórico (sin campos de distancia)', async () => {
    const { service, create } = setup({ latitude: -12, longitude: -75.2 });

    await service.trackEvent(3, 'view');

    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({ providerId: 3, eventType: 'view' });
    expect(data).not.toHaveProperty('distanceKm');
    expect(data).not.toHaveProperty('clientLat');
  });

  it('con coords: anota ubicación del cliente y distancia haversine', async () => {
    const { service, create } = setup({ latitude: -12.0, longitude: -75.2 });

    await service.trackEvent(3, 'whatsapp_click', undefined, {
      lat: -12.01,
      lng: -75.2,
    });

    const data = create.mock.calls[0][0].data;
    expect(data.clientLat).toBe(-12.01);
    expect(data.clientLng).toBe(-75.2);
    // 0.01° de latitud ≈ 1.11 km.
    expect(data.distanceKm).toBeGreaterThan(1);
    expect(data.distanceKm).toBeLessThan(1.3);
  });

  it('con coords pero proveedor sin lat/lng: guarda coords sin distancia', async () => {
    const { service, create } = setup(null);

    await service.trackEvent(3, 'call_click', undefined, {
      lat: -12.01,
      lng: -75.2,
    });

    const data = create.mock.calls[0][0].data;
    expect(data.clientLat).toBe(-12.01);
    expect(data).not.toHaveProperty('distanceKm');
  });
});
