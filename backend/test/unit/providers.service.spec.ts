/**
 * UNIT — ProvidersService (complementa providers.gating.spec, que cubre el
 * enmascarado en findAll). Foco en los caminos restantes que cargan el mismo
 * invariante de negocio + lógica propia:
 *   • máscara default-deny en findOne / getNearby (sin suscripción = como GRATIS).
 *   • getNearby: validación de coordenadas, orden por cercanía, distancia redondeada.
 *   • trackEvent: persiste primero, emite al DUEÑO best-effort (no rompe si falla).
 *   • recommendations: idempotencia + atomicidad + increment/decrement correctos.
 *   • createReport: mapeo de excepciones por rama (BadRequest/NotFound/Conflict/passthrough).
 */
jest.mock('sharp', () => jest.fn());

import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ProvidersService } from '../../src/providers/providers.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  type EventsGatewayMock,
} from '../mocks/events-gateway.mock';

describe('ProvidersService (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let service: ProvidersService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    service = new ProvidersService(prisma as any, events as any);
  });

  describe('findOne() — máscara en detalle', () => {
    it('proveedor inexistente → null', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);
      await expect(service.findOne(1)).resolves.toBeNull();
    });

    it('GRATIS: enmascara TODO el contacto y recorta fotos a 2', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 1,
        phone: '999',
        whatsapp: '999',
        website: 'https://x',
        instagram: '@x',
        tiktok: '@x',
        facebook: 'x',
        linkedin: 'x',
        twitterX: '@x',
        telegram: '@x',
        whatsappBiz: '999',
        subscription: { plan: 'GRATIS' },
        providerCategories: [],
        images: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });
      const p: any = await service.findOne(1);
      // TODOS los canales de contacto enmascarados — dejar uno fuera = leak.
      expect(p.phone).toBe('');
      for (const f of [
        'whatsapp',
        'website',
        'instagram',
        'tiktok',
        'facebook',
        'linkedin',
        'twitterX',
        'telegram',
        'whatsappBiz',
      ]) {
        expect(p[f]).toBeNull();
      }
      expect(p.images).toHaveLength(2);
    });

    it('DEFAULT-DENY: sin suscripción vigente se enmascara como GRATIS', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 1,
        phone: '999',
        whatsapp: '999',
        subscription: null,
        providerCategories: [],
        images: [],
      });
      const p: any = await service.findOne(1);
      expect(p.phone).toBe('');
      expect(p.whatsapp).toBeNull();
    });

    it('PREMIUM: no enmascara el contacto', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 1,
        phone: '999',
        whatsapp: '999',
        subscription: { plan: 'PREMIUM' },
        providerCategories: [],
        images: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });
      const p: any = await service.findOne(1);
      expect(p.phone).toBe('999');
      expect(p.images).toHaveLength(3);
    });
  });

  describe('getNearby()', () => {
    it('coordenadas inválidas → BadRequest', async () => {
      await expect(service.getNearby(NaN, 0, 5)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getNearby(91, 0, 5)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getNearby(0, 200, 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sin resultados crudos → [] sin hidratar', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      await expect(service.getNearby(-12, -77, 5)).resolves.toEqual([]);
      expect(prisma.provider.findMany).not.toHaveBeenCalled();
    });

    it('ordena por cercanía cruda, redondea distancia 0.1km y enmascara GRATIS', async () => {
      // Raw: id2 a 2680m, id1 a 1234m (orden por cercanía: [2,1]).
      // dist_m que EXIGEN redondeo (1234→1.2, 2680→2.7): sin la lógica de
      // Math.round(.*10)/10 darían 1.234/2.68 → atrapa "no redondea".
      prisma.$queryRaw.mockResolvedValue([
        { id: 2, dist_m: 2680 },
        { id: 1, dist_m: 1234 },
      ]);
      // findMany devuelve en OTRO orden (1,2) — el servicio debe re-ordenar.
      prisma.provider.findMany.mockResolvedValue([
        { id: 1, phone: '999', subscription: { plan: 'GRATIS' }, images: [] },
        { id: 2, phone: '999', subscription: { plan: 'PREMIUM' }, images: [] },
      ]);
      const res: any = await service.getNearby(-12, -77, 5);
      expect(res.map((p: any) => p.id)).toEqual([2, 1]); // orden por cercanía
      expect(res[0].distanceKm).toBe(2.7);
      expect(res[1].distanceKm).toBe(1.2);
      // El GRATIS (id1) viene enmascarado también en el path geoespacial.
      expect(res[1].phone).toBe('');
      expect(res[0].phone).toBe('999'); // PREMIUM intacto
    });

    it('respeta los filtros activos: categoría/tipo entran al where de hidratación', async () => {
      // Sin esto, buscar por radio dentro de "Gasfiteros" devolvía a TODOS los
      // cercanos. El filtro se aplica en el findMany del paso 2 (Prisma).
      prisma.$queryRaw.mockResolvedValue([{ id: 1, dist_m: 500 }]);
      prisma.provider.findMany.mockResolvedValue([
        { id: 1, phone: '999', subscription: { plan: 'PREMIUM' }, images: [] },
      ]);
      await service.getNearby(-12, -77, 5, {
        categorySlug: 'gasfiteros',
        type: 'NEGOCIO',
      });
      expect(prisma.provider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: [1] },
            type: 'NEGOCIO',
            providerCategories: {
              some: { category: { slug: 'gasfiteros' } },
            },
          }),
        }),
      );
    });
  });

  describe('trackEvent()', () => {
    it('persiste y emite al DUEÑO del provider', async () => {
      prisma.providerAnalytic.create.mockResolvedValue({ id: 1 });
      prisma.provider.findUnique.mockResolvedValue({ userId: 9, type: 'OFICIO' });
      await service.trackEvent(10, 'whatsapp_click', 5);
      expect(prisma.providerAnalytic.create).toHaveBeenCalled();
      expect(events.emitProviderAnalytics).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ providerId: 10, eventType: 'whatsapp_click' }),
      );
    });

    it('best-effort: si resolver el dueño falla, NO rompe el tracking', async () => {
      prisma.providerAnalytic.create.mockResolvedValue({ id: 1 });
      prisma.provider.findUnique.mockRejectedValue(new Error('db down'));
      await expect(service.trackEvent(10, 'view')).resolves.toEqual({ id: 1 });
      expect(events.emitProviderAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('addRecommendation()', () => {
    it('proveedor inexistente → Error', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);
      await expect(service.addRecommendation(7, 1)).rejects.toThrow(
        'Proveedor no encontrado',
      );
    });

    it('IDEMPOTENCIA: ya recomendado → alreadyRecommended sin transacción', async () => {
      prisma.provider.findUnique.mockResolvedValue({ totalRecommendations: 4 });
      prisma.recommendation.findUnique.mockResolvedValue({ id: 1 });
      const res = await service.addRecommendation(7, 1);
      expect(res).toEqual({
        success: true,
        totalRecommendations: 4,
        alreadyRecommended: true,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('nuevo: crea + incrementa en 1 transacción, devuelve el contador post-update', async () => {
      prisma.provider.findUnique.mockResolvedValue({ totalRecommendations: 4 });
      prisma.recommendation.findUnique.mockResolvedValue(null);
      prisma.provider.update.mockResolvedValue({ totalRecommendations: 5 });
      const res = await service.addRecommendation(7, 1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.recommendation.create).toHaveBeenCalled();
      // INCREMENT (no decrement) — el bug-class de invertir el contador.
      expect(prisma.provider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { totalRecommendations: { increment: 1 } },
        }),
      );
      expect(res).toEqual({ success: true, totalRecommendations: 5 });
    });
  });

  describe('toggleRecommendation()', () => {
    it('existente → elimina con DECREMENT y recommended:false', async () => {
      prisma.provider.findUnique.mockResolvedValue({ id: 1 });
      prisma.recommendation.findUnique.mockResolvedValue({ id: 1 });
      prisma.provider.update.mockResolvedValue({ totalRecommendations: 3 });
      const res = await service.toggleRecommendation(7, 1);
      expect(prisma.recommendation.delete).toHaveBeenCalled();
      expect(prisma.provider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { totalRecommendations: { decrement: 1 } },
        }),
      );
      expect(res).toEqual({ recommended: false, totalRecommendations: 3 });
    });

    it('no existente → crea con INCREMENT y recommended:true', async () => {
      prisma.provider.findUnique.mockResolvedValue({ id: 1 });
      prisma.recommendation.findUnique.mockResolvedValue(null);
      prisma.provider.update.mockResolvedValue({ totalRecommendations: 5 });
      const res = await service.toggleRecommendation(7, 1);
      expect(prisma.recommendation.create).toHaveBeenCalled();
      expect(prisma.provider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { totalRecommendations: { increment: 1 } },
        }),
      );
      expect(res).toEqual({ recommended: true, totalRecommendations: 5 });
    });
  });

  describe('createReport()', () => {
    const valid = {
      providerId: 1,
      userId: 7,
      reason: 'FRAUDE',
      description: 'x',
    };

    it('motivo fuera del whitelist → BadRequest ANTES de tocar la BD', async () => {
      await expect(
        service.createReport({ ...valid, reason: 'XYZ' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.provider.findUnique).not.toHaveBeenCalled();
    });

    it('proveedor inexistente → NotFound', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);
      await expect(service.createReport(valid)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('éxito: crea reporte y notifica al admin', async () => {
      prisma.provider.findUnique.mockResolvedValue({ id: 1 });
      prisma.providerReport.create.mockResolvedValue({ id: 7 });
      await service.createReport(valid);
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NEW_PROVIDER_REPORT',
          targetRole: 'ADMIN',
        }),
      );
    });

    it('duplicado (P2002) → Conflict', async () => {
      prisma.provider.findUnique.mockResolvedValue({ id: 1 });
      prisma.providerReport.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.createReport(valid)).rejects.toThrow(
        ConflictException,
      );
    });

    it('otro error de BD se re-lanza tal cual, sin notificar', async () => {
      prisma.provider.findUnique.mockResolvedValue({ id: 1 });
      const boom = { code: 'P2003' };
      prisma.providerReport.create.mockRejectedValue(boom);
      await expect(service.createReport(valid)).rejects.toBe(boom);
      expect(events.emitNotification).not.toHaveBeenCalled();
    });
  });

  describe('createPlatformIssue()', () => {
    it('descripción < 5 chars (trim) → BadRequest', async () => {
      await expect(service.createPlatformIssue(7, ' abc ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('válida: persiste la descripción recortada', async () => {
      prisma.platformIssue.create.mockResolvedValue({ id: 1 });
      await service.createPlatformIssue(7, '  problema real  ');
      expect(prisma.platformIssue.create).toHaveBeenCalledWith({
        data: { userId: 7, description: 'problema real' },
      });
    });
  });

  describe('findAll — alcance por distritos (provider_coverage)', () => {
    const CATALOG = [
      { id: 1, department: 'Junín', province: 'Huancayo', district: 'Huancayo' },
      { id: 2, department: 'Junín', province: 'Huancayo', district: 'El Tambo' },
      { id: 5, department: 'Junín', province: 'Jauja', district: 'Jauja' },
    ];

    beforeEach(() => {
      prisma.locality.findMany.mockResolvedValue(CATALOG);
      prisma.provider.findMany.mockResolvedValue([]);
      prisma.provider.count.mockResolvedValue(0);
    });

    /// El filtro de distrito debe matchear registrado O cobertura de pago —
    /// compuesto en AND para no pisar el OR de la búsqueda por texto.
    it('filtro por distrito → OR registrado/coverage gateado por plan de pago', async () => {
      await service.findAll({
        department: 'Junín',
        province: 'Huancayo',
        district: 'El Tambo',
      });
      const where = prisma.provider.findMany.mock.calls[0][0].where;
      const loc = where.AND[0];
      expect(loc.OR[0]).toEqual({ localityId: { in: [2] } });
      expect(loc.OR[1].subscription.plan.in).toEqual(['ESTANDAR', 'PREMIUM']);
      expect(loc.OR[1].coverage.some.localityId.in).toEqual([2]);
      // El where.OR raíz queda libre para la búsqueda por texto.
      expect(where.OR).toBeUndefined();
    });

    it('search + distrito conviven: OR de texto en raíz, ubicación en AND', async () => {
      await service.findAll({
        department: 'Junín',
        province: 'Huancayo',
        district: 'El Tambo',
        search: 'gasfitero',
      });
      const where = prisma.provider.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeDefined(); // búsqueda por texto
      expect(where.AND[0].OR[0].localityId.in).toEqual([2]); // ubicación intacta
    });

    it('localityId directo también pasa por el OR de coverage', async () => {
      await service.findAll({ localityId: 7 });
      const where = prisma.provider.findMany.mock.calls[0][0].where;
      expect(where.AND[0].OR[0]).toEqual({ localityId: { in: [7] } });
      expect(where.AND[0].OR[1].coverage.some.localityId.in).toEqual([7]);
    });
  });
});
