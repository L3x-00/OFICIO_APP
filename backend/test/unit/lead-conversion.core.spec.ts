/**
 * UNIT — Paso 6: conversión de lead NEGOCIO → User + Provider.
 * Blindaje de la lógica pura de `src/lead-conversion/lead-conversion.core.ts`:
 * compuerta de consentimiento, idempotencia, mapeo de campos, reuso de la
 * validación de categorías, hashing bcrypt y el path `--approve`.
 */
import { BadRequestException } from '@nestjs/common';
import {
  convertLead,
  categoryIdsFromLead,
  validateLeadConversionInput,
  type StagingLead,
} from '../../src/lead-conversion/lead-conversion.core.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

function baseLead(overrides: Partial<StagingLead> = {}): StagingLead {
  return {
    leadKey: 'lead-1',
    businessName: 'Pollos Wanka',
    publicPhone: '064111111',
    whatsapp: '+51999111222',
    ruc: '20123456789',
    address: 'Jr. Real 100',
    department: 'Junín',
    province: 'Huancayo',
    district: 'Huancayo',
    mappedCategoryId: 1,
    categoryIds: [1, 2],
    scheduleJson: { lun: '08:00-18:00' },
    introduction: 'Pollería en Huancayo con delivery.',
    storeDelivery: true,
    website: 'https://pollos.test',
    instagram: 'https://instagram.com/pollos',
    facebook: null,
    tiktok: null,
    linkedin: null,
    twitterX: null,
    telegram: null,
    latitude: -12.0681,
    longitude: -75.2102,
    consentStatus: 'CONSENTED',
    convertedProviderId: null,
    suggestedEmail: 'polloswanka-4f2a@leads.oficioapp.org.pe',
    suggestedPassword: 'Xy7k2mAbc123def',
    ...overrides,
  };
}

describe('lead-conversion.core (unit)', () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    // Categorías: eco de los ids pedidos como hijas NEGOCIO legacy (forType null,
    // aceptado por validateProviderCategorySelection para NEGOCIO).
    prisma.category.findMany.mockImplementation((args: any) =>
      Promise.resolve(
        (args.where.id.in as number[]).map((id) => ({
          id,
          parentId: 900,
          forType: null,
          parent: { forType: null },
        })),
      ),
    );
    prisma.locality.findMany.mockResolvedValue([]);
    prisma.locality.create.mockResolvedValue({ id: 55 });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.provider.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 10, hasUsedTrial: false });
    prisma.provider.create.mockResolvedValue({ id: 20 });
  });

  it('rechaza leads que no están CONSENTED', async () => {
    await expect(
      convertLead(prisma as any, baseLead({ consentStatus: 'PENDING' })),
    ).rejects.toThrow(/CONSENTED/);
    expect(prisma.provider.create).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rechaza si faltan credenciales sugeridas', async () => {
    await expect(
      convertLead(prisma as any, baseLead({ suggestedEmail: null })),
    ).rejects.toThrow(/credenciales sugeridas/);
    expect(prisma.provider.create).not.toHaveBeenCalled();
  });

  it('crea User + Provider(NEGOCIO) en PENDIENTE, con bcrypt y una sola primaria', async () => {
    const res = await convertLead(prisma as any, baseLead());

    expect(res).toMatchObject({
      leadKey: 'lead-1',
      userId: 10,
      providerId: 20,
      approved: false,
      reused: false,
    });

    const userData = prisma.user.create.mock.calls[0][0].data;
    expect(userData.email).toBe('polloswanka-4f2a@leads.oficioapp.org.pe');
    expect(userData.role).toBe('USUARIO');
    expect(userData.isEmailVerified).toBe(false);
    // bcrypt real: el hash empieza con el prefijo $2a/$2b/$2y.
    expect(userData.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(userData.passwordHash).not.toBe('Xy7k2mAbc123def');

    const providerData = prisma.provider.create.mock.calls[0][0].data;
    expect(providerData.type).toBe('NEGOCIO');
    expect(providerData.verificationStatus).toBe('PENDIENTE');
    expect(providerData.isVisible).toBe(false);
    expect(providerData.slug).toBe('pollos-wanka');
    // Mapeo de campos NEGOCIO.
    expect(providerData.hasDelivery).toBe(true);
    expect(providerData.whatsapp).toBe('+51999111222');
    expect(providerData.ruc).toBe('20123456789');
    expect(providerData.instagram).toBe('https://instagram.com/pollos');
    expect(providerData.description).toBe('Pollería en Huancayo con delivery.');
    expect(providerData.localityId).toBe(55);
    expect(providerData.latitude).toBe(-12.0681);
    expect(providerData.longitude).toBe(-75.2102);
    // Exactamente una Especialidad principal, y es la mappedCategoryId.
    const cats = providerData.providerCategories.create;
    expect(cats).toHaveLength(2);
    expect(cats.filter((c: any) => c.isPrimary)).toHaveLength(1);
    expect(cats.find((c: any) => c.isPrimary).categoryId).toBe(1);

    // Sin --approve: nada de suscripción ni cambio de rol.
    expect(prisma.subscription.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('es idempotente: si el usuario ya tiene un NEGOCIO, no crea nada', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, hasUsedTrial: false });
    prisma.provider.findUnique.mockResolvedValue({ id: 99 });

    const res = await convertLead(prisma as any, baseLead());

    expect(res).toMatchObject({ userId: 7, providerId: 99, reused: true, approved: false });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.provider.create).not.toHaveBeenCalled();
  });

  it('propaga el rechazo de categorías inválidas (reuso de la validación real)', async () => {
    prisma.category.findMany.mockResolvedValue([]); // ids inexistentes
    await expect(convertLead(prisma as any, baseLead())).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.provider.create).not.toHaveBeenCalled();
  });

  it.each([
    ['teléfono', { publicPhone: '123' }],
    ['descripción', { introduction: 'corta' }],
    ['coordenadas', { latitude: null, longitude: null }],
    ['RUC', { ruc: '123' }],
  ])('rechaza %s que el formulario real no aceptaría', async (_field, overrides) => {
    await expect(convertLead(prisma as any, baseLead(overrides))).rejects.toThrow(/inválid|faltan coordenadas/i);
    expect(prisma.provider.create).not.toHaveBeenCalled();
  });

  it('valida el nombre antes de consultar categorías o crear registros', () => {
    expect(() => validateLeadConversionInput(baseLead({ businessName: ' ' }))).toThrow(/nombre/);
  });

  it('con --approve deja el negocio APROBADO/visible + Subscription + rol PROVEEDOR', async () => {
    const res = await convertLead(prisma as any, baseLead(), { approve: true });
    expect(res.approved).toBe(true);

    const upd = prisma.provider.update.mock.calls[0][0];
    expect(upd.where).toEqual({ id: 20 });
    expect(upd.data.verificationStatus).toBe('APROBADO');
    expect(upd.data.isVisible).toBe(true);
    expect(upd.data.planPriority).toBe(2); // ESTANDAR/ACTIVA

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { role: 'PROVEEDOR' },
    });

    const sub = prisma.subscription.create.mock.calls[0][0].data;
    expect(sub.providerId).toBe(20);
    expect(sub.plan).toBe('ESTANDAR');
    expect(sub.status).toBe('GRACIA');
    expect(sub.endDate).toBeInstanceOf(Date);
  });

  it('adjunta imageUrls como ProviderImage (primera = portada, orden secuencial)', async () => {
    const res = await convertLead(prisma as any, baseLead(), {
      imageUrls: ['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg'],
    });
    expect(res.images).toBe(3);
    const rows = prisma.providerImage.createMany.mock.calls[0][0].data;
    expect(rows).toEqual([
      { providerId: 20, url: 'https://cdn/a.jpg', isCover: true, order: 0 },
      { providerId: 20, url: 'https://cdn/b.jpg', isCover: false, order: 1 },
      { providerId: 20, url: 'https://cdn/c.jpg', isCover: false, order: 2 },
    ]);
  });

  it('sin imageUrls no crea ProviderImage', async () => {
    const res = await convertLead(prisma as any, baseLead());
    expect(res.images).toBe(0);
    expect(prisma.providerImage.createMany).not.toHaveBeenCalled();
  });

  it('categoryIdsFromLead pone la primaria primero y dedup', () => {
    expect(
      categoryIdsFromLead(baseLead({ mappedCategoryId: 2, categoryIds: [1, 2, 3] })),
    ).toEqual([2, 1, 3]);
    expect(
      categoryIdsFromLead(baseLead({ mappedCategoryId: null, categoryIds: [5, 6] })),
    ).toEqual([5, 6]);
  });
});
