/**
 * UNIT — ProvidersService.findAll: gating de fotos + contacto por plan.
 *
 * Regla de negocio (bug 4): el plan GRATIS muestra MÁX 2 fotos y oculta el
 * contacto en los listados públicos; ESTANDAR/PREMIUM ven todo. Las fotos NO
 * se borran de BD — solo se recortan en lectura. Si alguien rompe este gating,
 * se expone contacto de planes gratis o se muestran fotos de más.
 */
jest.mock('sharp', () => jest.fn());

import { ProvidersService } from '../../src/providers/providers.service.js';
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  EventsGatewayMock,
} from '../mocks/events-gateway.mock';

describe('ProvidersService.findAll — gating por plan (unit)', () => {
  let service: ProvidersService;
  let prisma: PrismaMock;
  let events: EventsGatewayMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    service = new ProvidersService(prisma as any, events as any);
  });

  const row = (plan: string, nImages: number) => ({
    id: 1,
    businessName: 'X',
    phone: '999888777',
    whatsapp: '999888777',
    website: 'https://x.com',
    subscription: { plan, status: 'ACTIVA' },
    images: Array.from({ length: nImages }, (_, i) => ({
      id: i,
      url: `img${i}.jpg`,
      isCover: i === 0,
      order: i,
    })),
  });

  it('GRATIS: recorta a 2 fotos y enmascara contacto', async () => {
    prisma.provider.findMany.mockResolvedValue([row('GRATIS', 5)]);
    prisma.provider.count.mockResolvedValue(1);

    const res: any = await service.findAll({});
    const p = res.data[0];

    expect(p.images).toHaveLength(2);
    expect(p.phone).toBe('');
    expect(p.whatsapp).toBeNull();
    expect(p.website).toBeNull();
  });

  it('PREMIUM: todas las fotos + contacto visible', async () => {
    prisma.provider.findMany.mockResolvedValue([row('PREMIUM', 5)]);
    prisma.provider.count.mockResolvedValue(1);

    const res: any = await service.findAll({});
    const p = res.data[0];

    expect(p.images).toHaveLength(5);
    expect(p.phone).toBe('999888777');
  });

  it('ESTANDAR: contacto visible (no enmascara)', async () => {
    prisma.provider.findMany.mockResolvedValue([row('ESTANDAR', 3)]);
    prisma.provider.count.mockResolvedValue(1);

    const res: any = await service.findAll({});
    expect(res.data[0].phone).toBe('999888777');
  });

  it('acota paginacion publica antes de consultar Prisma', async () => {
    prisma.provider.findMany.mockResolvedValue([]);
    prisma.provider.count.mockResolvedValue(0);

    await service.findAll({ page: -10, limit: 1000000 });

    expect(prisma.provider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 }),
    );
  });
});
