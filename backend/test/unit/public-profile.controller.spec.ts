import { PublicProfileController } from '../../src/providers/public-profile.controller.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('PublicProfileController privacy', () => {
  let prisma: PrismaMock;
  let controller: PublicProfileController;

  const provider = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    slug: 'perfil-seguro',
    businessName: 'Perfil seguro',
    description: 'Descripcion',
    type: 'OFICIO',
    averageRating: 5,
    totalReviews: 3,
    totalRecommendations: 2,
    isVerified: true,
    isTrusted: true,
    hasHomeService: true,
    hasDelivery: false,
    plenaCoordinacion: false,
    showPhone: true,
    showWhatsapp: true,
    showExactLocation: true,
    phone: '999888777',
    whatsapp: '999888777',
    website: 'https://example.com',
    instagram: '@example',
    tiktok: null,
    facebook: null,
    linkedin: null,
    telegram: null,
    twitterX: null,
    whatsappBiz: '999888777',
    scheduleJson: null,
    images: [],
    providerCategories: [],
    locality: {
      name: 'El Tambo',
      department: 'Junin',
      province: 'Huancayo',
      district: 'El Tambo',
    },
    subscription: { plan: 'GRATIS', status: 'ACTIVA' },
    ...overrides,
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    controller = new PublicProfileController(prisma as any);
  });

  it('does not expose direct contact for a free plan', async () => {
    prisma.provider.findFirst.mockResolvedValue(provider());

    const result = await controller.getBySlug('perfil-seguro');

    expect(result.contact).toEqual({
      phone: null,
      whatsapp: null,
      website: null,
      instagram: null,
      tiktok: null,
      facebook: null,
      linkedin: null,
      telegram: null,
      twitterX: null,
      whatsappBiz: null,
    });
  });

  it('honors contact and exact-location privacy on a paid plan', async () => {
    prisma.provider.findFirst.mockResolvedValue(
      provider({
        showPhone: false,
        showWhatsapp: false,
        showExactLocation: false,
        subscription: { plan: 'PREMIUM', status: 'ACTIVA' },
      }),
    );

    const result = await controller.getBySlug('perfil-seguro');

    expect(result.contact.phone).toBeNull();
    expect(result.contact.whatsapp).toBeNull();
    expect(result.contact.whatsappBiz).toBeNull();
    expect(result.contact.website).toBe('https://example.com');
    expect(result.locality).toEqual({
      name: null,
      department: 'Junin',
      province: 'Huancayo',
      district: null,
    });
  });
});
