/**
 * UNIT — CatalogService (Catálogo): reglas críticas.
 *   • ownership (proveedor ajeno → 403).
 *   • feature-gate "catalogo".
 *   • límite por plan (GRATIS=3 → 402).
 *   • catálogo público agrupado + link de WhatsApp.
 */
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CatalogService } from '../../src/catalog/catalog.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('CatalogService (unit)', () => {
  let prisma: PrismaMock;
  let features: { assertProviderHasFeature: jest.Mock };
  let minio: { uploadFile: jest.Mock };
  let service: CatalogService;

  const dto = { name: 'Taladro', price: 120 };

  beforeEach(() => {
    prisma = createPrismaMock();
    features = { assertProviderHasFeature: jest.fn().mockResolvedValue(undefined) };
    minio = { uploadFile: jest.fn().mockResolvedValue('https://cdn/x.jpg') };
    service = new CatalogService(prisma as any, features as any, minio as any);
  });

  it('ownership: un usuario que no es dueño → 403', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 7, userId: 99 });
    await expect(service.addProduct(5, 7, dto as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('feature-gate: proveedor sin "catalogo" → 403', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 7, userId: 5 });
    features.assertProviderHasFeature.mockRejectedValue(
      new ForbiddenException('sin catalogo'),
    );
    await expect(service.addProduct(5, 7, dto as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('límite de plan: GRATIS con 3 productos → 402', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 7, userId: 5 });
    prisma.subscription.findFirst.mockResolvedValue({ plan: 'GRATIS' });
    prisma.catalogProduct.count.mockResolvedValue(3);
    expect.assertions(1);
    try {
      await service.addProduct(5, 7, dto as any);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  });

  it('ESTANDAR con 5 productos (límite 6) → crea', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 7, userId: 5 });
    prisma.subscription.findFirst.mockResolvedValue({ plan: 'ESTANDAR' });
    prisma.catalogProduct.count.mockResolvedValue(5);
    prisma.catalogProduct.create.mockResolvedValue({ id: 1 });
    await service.addProduct(5, 7, dto as any);
    expect(prisma.catalogProduct.create).toHaveBeenCalled();
  });

  it('catálogo público: agrupa y arma link de WhatsApp', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      businessName: 'Ferretería Sur',
      whatsapp: '+51 988 777 666',
      whatsappBiz: null,
      showWhatsapp: true,
    });
    prisma.catalogProduct.findMany.mockResolvedValue([
      { id: 1, name: 'Martillo', category: 'Herramientas', isAvailable: true, order: 0 },
      { id: 2, name: 'Clavos', category: null, isAvailable: false, order: 0 },
    ]);
    const res = await service.getPublicCatalog(7);
    // 'Herramientas' (disponible) antes que 'otros' (agotado).
    expect(res.sections[0].section).toBe('Herramientas');
    expect((res.sections[0].items[0] as any).whatsappOrderUrl).toContain(
      'wa.me/51988777666',
    );
  });
});
