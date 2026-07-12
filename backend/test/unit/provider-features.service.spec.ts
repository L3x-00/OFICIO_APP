/**
 * UNIT — ProviderFeaturesService: resolución de features con HERENCIA del
 * padre + assert que gatea los módulos (agenda, carta, catálogo, cotización).
 */
import { ForbiddenException } from '@nestjs/common';
import {
  ProviderFeaturesService,
  effectiveFeaturesFromCategories,
  visibleProviderFeatures,
} from '../../src/common/provider-features.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('effectiveFeaturesFromCategories (pure)', () => {
  it('une features con herencia y sin duplicar; tolera nulls', () => {
    const rows = [
      { category: { features: ['carta_digital'], parent: null } },
      { category: { features: [], parent: { features: ['catalogo'] } } },
      { category: { features: ['carta_digital'], parent: null } },
      null, // defensivo
    ];
    expect(effectiveFeaturesFromCategories(rows).sort()).toEqual([
      'carta_digital',
      'catalogo',
    ]);
  });
});

describe('visibleProviderFeatures (reducción 2026-07)', () => {
  const ALL = ['carta_digital', 'catalogo', 'agenda', 'cotizacion'];

  afterEach(() => {
    delete process.env.FEATURE_AGENDA;
    delete process.env.FEATURE_COTIZACION;
  });

  it('OFICIO pierde carta/catálogo en ambas superficies', () => {
    expect(visibleProviderFeatures(ALL, 'OFICIO', 'panel').sort()).toEqual([
      'agenda',
      'cotizacion',
    ]);
    expect(visibleProviderFeatures(ALL, 'OFICIO', 'public')).toEqual([]);
  });

  it('público: agenda/cotización ocultas sin env; panel las conserva (drenaje)', () => {
    expect(visibleProviderFeatures(ALL, 'NEGOCIO', 'public').sort()).toEqual([
      'carta_digital',
      'catalogo',
    ]);
    expect(visibleProviderFeatures(ALL, 'NEGOCIO', 'panel').sort()).toEqual(
      ALL.slice().sort(),
    );
  });

  it("env 'true' reactiva agenda/cotización al público", () => {
    process.env.FEATURE_AGENDA = 'true';
    process.env.FEATURE_COTIZACION = 'true';
    expect(visibleProviderFeatures(ALL, 'NEGOCIO', 'public').sort()).toEqual(
      ALL.slice().sort(),
    );
  });
});

describe('ProviderFeaturesService (unit)', () => {
  let prisma: PrismaMock;
  let service: ProviderFeaturesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ProviderFeaturesService(prisma as any);
  });

  describe('getCategoryFeatures', () => {
    it('devuelve los features PROPIOS si la categoría los tiene', async () => {
      prisma.category.findUnique.mockResolvedValue({
        features: ['agenda'],
        parent: { features: ['cotizacion'] },
      });
      expect(await service.getCategoryFeatures(10)).toEqual(['agenda']);
    });

    it('HEREDA del padre cuando la hija tiene features vacíos', async () => {
      prisma.category.findUnique.mockResolvedValue({
        features: [],
        parent: { features: ['agenda'] },
      });
      expect(await service.getCategoryFeatures(11)).toEqual(['agenda']);
    });

    it('devuelve [] si la categoría no existe', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      expect(await service.getCategoryFeatures(404)).toEqual([]);
    });
  });

  describe('getProviderFeatures', () => {
    it('une los features de todas las categorías (con herencia) sin duplicar', async () => {
      prisma.providerCategory.findMany.mockResolvedValue([
        { category: { features: ['agenda'], parent: null } },
        { category: { features: [], parent: { features: ['cotizacion'] } } },
        { category: { features: ['agenda'], parent: null } }, // duplicado
      ]);
      const features = await service.getProviderFeatures(7);
      expect(features.sort()).toEqual(['agenda', 'cotizacion']);
    });
  });

  describe('assertProviderHasFeature', () => {
    it('no lanza si el proveedor tiene el feature', async () => {
      prisma.providerCategory.findMany.mockResolvedValue([
        { category: { features: ['agenda'], parent: null } },
      ]);
      await expect(
        service.assertProviderHasFeature(7, 'agenda'),
      ).resolves.toBeUndefined();
    });

    it('lanza ForbiddenException si NO tiene el feature', async () => {
      prisma.providerCategory.findMany.mockResolvedValue([
        { category: { features: ['catalogo'], parent: null } },
      ]);
      await expect(
        service.assertProviderHasFeature(7, 'agenda'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
