/**
 * UNIT — OfferPostsService: regresión de fixes.
 *   • P1 — createOffer respeta durationHours PERO la capa al tope del plan
 *     (anti-abuso): GRATIS máx 12h aunque el cliente pida 999.
 *   • bug 1 — reportOffer: duplicado (P2002) → 409 ConflictException, no 500.
 */
jest.mock('sharp', () => jest.fn());

import { OfferPostsService } from '../../src/offer-posts/offer-posts.service.js';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock';

describe('OfferPostsService — regresión (unit)', () => {
  let service: OfferPostsService;
  let prisma: PrismaMock;
  const minio = { uploadFile: jest.fn(), deleteFile: jest.fn() };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new OfferPostsService(prisma as any, minio as any);
  });

  describe('createOffer — cap de durationHours por plan (P1)', () => {
    it('GRATIS: pedir 999h se capa a 12h del plan', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 1,
        trustStatus: 'APPROVED',
        isTrusted: true,
        providerCategories: [],
        subscription: { plan: 'GRATIS', status: 'ACTIVA' },
      });
      prisma.offerPost.count.mockResolvedValue(0);
      let captured: any;
      prisma.offerPost.create.mockImplementation((args: any) => {
        captured = args;
        return Promise.resolve({ id: 1, ...args.data, categories: [] });
      });

      await service.createOffer(1, {
        title: 'Oferta de prueba',
        description: 'Descripción larga suficiente',
        durationHours: 999,
      } as any);

      const hours =
        (new Date(captured.data.expiresAt).getTime() - Date.now()) / 3_600_000;
      expect(hours).toBeGreaterThan(11);
      expect(hours).toBeLessThanOrEqual(12.1); // capado a 12, NO 999
    });

    it('sin durationHours usa el tope del plan (12h GRATIS)', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: 1,
        trustStatus: 'APPROVED',
        isTrusted: true,
        providerCategories: [],
        subscription: { plan: 'GRATIS', status: 'ACTIVA' },
      });
      prisma.offerPost.count.mockResolvedValue(0);
      let captured: any;
      prisma.offerPost.create.mockImplementation((args: any) => {
        captured = args;
        return Promise.resolve({ id: 1, ...args.data, categories: [] });
      });

      await service.createOffer(1, {
        title: 'Oferta de prueba',
        description: 'Descripción larga suficiente',
      } as any);

      const hours =
        (new Date(captured.data.expiresAt).getTime() - Date.now()) / 3_600_000;
      expect(hours).toBeGreaterThan(11);
      expect(hours).toBeLessThanOrEqual(12.1);
    });
  });

  describe('reportOffer — duplicado → 409 (bug 1)', () => {
    const offer = { id: 2, isActive: true, providerId: 5, title: 'Oferta' };

    it('P2002 (ya reportada) → ConflictException, no 500', async () => {
      prisma.offerPost.findUnique.mockResolvedValue(offer);
      prisma.offerReport.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.reportOffer(7, 2, 'SPAM')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('éxito → crea el reporte y NO lanza', async () => {
      prisma.offerPost.findUnique.mockResolvedValue(offer);
      prisma.offerReport.create.mockResolvedValue({ id: 1 });
      const r: any = await service.reportOffer(7, 2, 'SPAM');
      expect(r.id).toBe(1);
    });

    it('oferta inexistente/ inactiva → 404', async () => {
      prisma.offerPost.findUnique.mockResolvedValue(null);
      await expect(service.reportOffer(7, 99, 'SPAM')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
