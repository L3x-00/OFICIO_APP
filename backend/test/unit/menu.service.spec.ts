/**
 * UNIT — MenuService (Carta Digital): reglas críticas.
 *   • ownership (proveedor ajeno → 403).
 *   • feature-gate "carta_digital".
 *   • límite por plan (GRATIS=5 → 402).
 *   • isFeatured (menú del día) solo PREMIUM → 402.
 *   • carta pública agrupada + link de WhatsApp.
 */
import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { MenuService } from '../../src/menu/menu.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('MenuService (unit)', () => {
  let prisma: PrismaMock;
  let features: { assertProviderHasFeature: jest.Mock };
  let minio: {
    uploadFile: jest.Mock;
    assertManagedImageUrl: jest.Mock;
    isSameImageReference: jest.Mock;
  };
  let service: MenuService;

  const dto = { name: 'Lomo Saltado', price: 25 };

  beforeEach(() => {
    prisma = createPrismaMock();
    features = {
      assertProviderHasFeature: jest.fn().mockResolvedValue(undefined),
    };
    minio = {
      uploadFile: jest.fn().mockResolvedValue('https://cdn/x.jpg'),
      assertManagedImageUrl: jest.fn((url: string) => url),
      isSameImageReference: jest.fn(
        (current: string | null, next: string | null) => current === next,
      ),
    };
    service = new MenuService(prisma as any, features as any, minio as any);
  });

  it('ownership: un usuario que no es dueño → 403', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      userId: 99,
      type: 'NEGOCIO',
    });
    await expect(service.addItem(5, 7, dto as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('feature-gate: proveedor sin "carta_digital" → 403', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      userId: 5,
      type: 'NEGOCIO',
    });
    features.assertProviderHasFeature.mockRejectedValue(
      new ForbiddenException('sin carta'),
    );
    await expect(service.addItem(5, 7, dto as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('límite de plan: GRATIS con 5 platos → 402', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      userId: 5,
      type: 'NEGOCIO',
    });
    prisma.subscription.findFirst.mockResolvedValue({ plan: 'GRATIS' });
    prisma.menuItem.count.mockResolvedValue(5);
    expect.assertions(1);
    try {
      await service.addItem(5, 7, dto as any);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  });

  it('isFeatured (menú del día) en plan no PREMIUM → 402', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      userId: 5,
      type: 'NEGOCIO',
    });
    prisma.subscription.findFirst.mockResolvedValue({ plan: 'ESTANDAR' });
    expect.assertions(1);
    try {
      await service.addItem(5, 7, { ...dto, isFeatured: true } as any);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  });

  it('PREMIUM: crea con isFeatured y sin chequear conteo', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      userId: 5,
      type: 'NEGOCIO',
    });
    prisma.subscription.findFirst.mockResolvedValue({ plan: 'PREMIUM' });
    prisma.menuItem.create.mockResolvedValue({ id: 1 });
    await service.addItem(5, 7, { ...dto, isFeatured: true } as any);
    expect(prisma.menuItem.count).not.toHaveBeenCalled();
    expect(prisma.menuItem.create).toHaveBeenCalled();
  });

  it('valida la carpeta de una foto nueva antes de crear', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      userId: 5,
      type: 'NEGOCIO',
    });
    prisma.subscription.findFirst.mockResolvedValue({ plan: 'PREMIUM' });
    prisma.menuItem.create.mockResolvedValue({ id: 1 });

    await service.addItem(5, 7, {
      ...dto,
      photoUrl: 'https://img.test/menu/item.jpg',
    } as any);

    expect(minio.assertManagedImageUrl).toHaveBeenCalledWith(
      'https://img.test/menu/item.jpg',
      ['menu'],
    );
  });

  it('carta pública: agrupa por sección y arma link de WhatsApp', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      type: 'NEGOCIO',
      businessName: 'Cevichería',
      whatsapp: '+51 999 111 222',
      whatsappBiz: null,
      showWhatsapp: true,
    });
    prisma.menuItem.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Ceviche',
        category: 'fondo',
        isAvailable: true,
        isFeatured: false,
        order: 0,
      },
      {
        id: 2,
        name: 'Pisco Sour',
        category: 'bebida',
        isAvailable: true,
        isFeatured: false,
        order: 0,
      },
    ]);
    const res = await service.getPublicMenu(7);
    const sections = res.sections.map((s) => s.section);
    expect(sections).toEqual(['fondo', 'bebida']); // orden canónico de MENU_SECTIONS
    const ceviche = res.sections[0].items[0] as any;
    expect(ceviche.whatsappOrderUrl).toContain('wa.me/51999111222');
  });

  it('respeta el toggle showWhatsapp=false (sin link)', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      type: 'NEGOCIO',
      businessName: 'X',
      whatsapp: '+51999',
      whatsappBiz: null,
      showWhatsapp: false,
    });
    prisma.menuItem.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'A',
        category: 'fondo',
        isAvailable: true,
        isFeatured: false,
        order: 0,
      },
    ]);
    const res = await service.getPublicMenu(7);
    expect((res.sections[0].items[0] as any).whatsappOrderUrl).toBeNull();
  });
});
