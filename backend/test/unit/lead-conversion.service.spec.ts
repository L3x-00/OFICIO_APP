/**
 * UNIT — LeadConversionService (capa admin de Captación). El core `convertLead`
 * ya está cubierto en lead-conversion.core.spec; acá se mockea para probar el
 * wrapper: mapeo del listado, gate de tamaño, marcado CONVERTED y stagingMissing.
 */
import { BadRequestException } from '@nestjs/common';

const convertLeadMock = jest.fn();
jest.mock('../../src/lead-conversion/lead-conversion.core.js', () => ({
  convertLead: (...args: unknown[]) => convertLeadMock(...args),
}));

import { LeadConversionService } from '../../src/lead-conversion/lead-conversion.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('LeadConversionService (unit)', () => {
  let prisma: PrismaMock & { $queryRawUnsafe: jest.Mock; $executeRawUnsafe: jest.Mock };
  let minio: { uploadFile: jest.Mock };
  let service: LeadConversionService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock() as any;
    prisma.$queryRawUnsafe = jest.fn();
    prisma.$executeRawUnsafe = jest.fn().mockResolvedValue(1);
    minio = { uploadFile: jest.fn().mockResolvedValue('https://cdn/x.jpg') };
    service = new LeadConversionService(prisma as any, minio as any);
  });

  describe('listLeads', () => {
    it('devuelve items + total + stats', async () => {
      const rows = [{ leadKey: 'l1', businessName: 'Pollos', district: 'Huancayo', consentStatus: 'CONSENTED', convertedProviderId: null, categoryName: 'Pollerías', photoCount: 2 }];
      prisma.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('count(*) FILTER')) return Promise.resolve([{ total: 1, consented: 1, converted: 0 }]);
        if (sql.trim().startsWith('SELECT count(*)::int AS total')) return Promise.resolve([{ total: 1 }]);
        return Promise.resolve(rows);
      });
      const res = await service.listLeads({ consent: 'CONSENTED', page: 1, pageSize: 25 });
      expect(res.stagingMissing).toBe(false);
      expect(res.items).toEqual(rows);
      expect(res.total).toBe(1);
      expect(res.stats).toEqual({ total: 1, consented: 1, converted: 0 });
    });

    it('si el staging no existe → stagingMissing sin lanzar', async () => {
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('relation "provider_leads" does not exist'));
      const res = await service.listLeads({});
      expect(res.stagingMissing).toBe(true);
      expect(res.items).toEqual([]);
    });
  });

  describe('convert', () => {
    it('rechaza lista vacía o > 50', async () => {
      await expect(service.convert([], false)).rejects.toThrow(BadRequestException);
      await expect(service.convert(Array(51).fill('k'), false)).rejects.toThrow(/50/);
      expect(convertLeadMock).not.toHaveBeenCalled();
    });

    it('convierte un lead: llama convertLead y marca CONVERTED', async () => {
      const leadRow = { id: 1n, leadKey: 'l1', businessName: 'Pollos', consentStatus: 'CONSENTED' };
      prisma.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('FROM "provider_leads" pl WHERE pl."leadKey"')) return Promise.resolve([leadRow]);
        if (sql.includes('provider_lead_photos')) return Promise.resolve([]);
        if (sql.includes('count(*) FILTER')) return Promise.resolve([{ total: 1, consented: 0, converted: 1 }]);
        return Promise.resolve([]);
      });
      convertLeadMock.mockResolvedValue({ leadKey: 'l1', userId: 10, providerId: 20, approved: false, images: 0, reused: false });

      const res = await service.convert(['l1'], false);

      expect(convertLeadMock).toHaveBeenCalledWith(prisma, leadRow, { approve: false, imageUrls: [] });
      // Marca el lead CONVERTED con el providerId devuelto.
      const updateCall = prisma.$executeRawUnsafe.mock.calls.find((c: unknown[]) => String(c[0]).includes('CONVERTED'));
      expect(updateCall).toBeTruthy();
      expect(updateCall![1]).toBe(20);
      expect(updateCall![2]).toBe('l1');
      expect(res.converted).toBe(1);
      expect(res.failed).toBe(0);
      expect(res.results[0]).toMatchObject({ leadKey: 'l1', ok: true, providerId: 20 });
    });

    it('un lead que falla no aborta el resto (best-effort)', async () => {
      prisma.$queryRawUnsafe.mockImplementation((sql: string) => {
        if (sql.includes('FROM "provider_leads" pl WHERE pl."leadKey"')) return Promise.resolve([]); // no encontrado
        if (sql.includes('count(*) FILTER')) return Promise.resolve([{ total: 0, consented: 0, converted: 0 }]);
        return Promise.resolve([]);
      });
      const res = await service.convert(['missing'], false);
      expect(res.failed).toBe(1);
      expect(res.results[0]).toMatchObject({ leadKey: 'missing', ok: false });
      expect(convertLeadMock).not.toHaveBeenCalled();
    });
  });
});
