/**
 * UNIT — CoverageService + syncCoverageToPlan + visibleInLocalities.
 *
 * Invariantes del "Alcance por distritos":
 *   • El distrito registrado SIEMPRE es visible; los extras solo con plan
 *     de pago (gate en visibleInLocalities, no en BD).
 *   • Límite TOTAL por plan (incluye registrado): GRATIS 1 / ESTANDAR 3 /
 *     PREMIUM 10.
 *   • Solo distritos activos de la MISMA provincia del registrado.
 *   • Downgrade PREMIUM→ESTANDAR recorta a los extras más antiguos.
 *   • syncCoverageToPlan nunca lanza (no debe romper activaciones de pago).
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  CoverageService,
  syncCoverageToPlan,
  visibleInLocalities,
  PLAN_COVERAGE_LIMITS,
} from '../../src/coverage/coverage.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

// Catálogo de prueba: 4 distritos de Huancayo + 1 de Jauja. El id 6 usa
// variantes sin tilde/case para validar el match accent-insensitive.
const LOCS = [
  { id: 1, name: 'Huancayo', department: 'Junín', province: 'Huancayo', district: 'Huancayo' },
  { id: 2, name: 'El Tambo', department: 'Junín', province: 'Huancayo', district: 'El Tambo' },
  { id: 3, name: 'Chilca', department: 'Junín', province: 'Huancayo', district: 'Chilca' },
  { id: 4, name: 'Pilcomayo', department: 'junin', province: 'HUANCAYO', district: 'Pilcomayo' },
  { id: 5, name: 'Jauja', department: 'Junín', province: 'Jauja', district: 'Jauja' },
];

// Proveedor registrado en El Tambo (id 2).
const providerRow = (plan: string | null) => ({
  id: 10,
  localityId: 2,
  locality: LOCS[1],
  subscription: plan ? { plan } : null,
});

describe('visibleInLocalities()', () => {
  it('OR: distrito registrado SIEMPRE; coverage solo con plan de pago', () => {
    const f: any = visibleInLocalities([1, 2]);
    expect(f.OR).toHaveLength(2);
    expect(f.OR[0]).toEqual({ localityId: { in: [1, 2] } });
    expect(f.OR[1].subscription.plan.in).toEqual(['ESTANDAR', 'PREMIUM']);
    expect(f.OR[1].coverage.some.localityId.in).toEqual([1, 2]);
  });
});

describe('PLAN_COVERAGE_LIMITS', () => {
  it('GRATIS 1 / ESTANDAR 3 / PREMIUM 10', () => {
    expect(PLAN_COVERAGE_LIMITS).toEqual({ GRATIS: 1, ESTANDAR: 3, PREMIUM: 10 });
  });
});

describe('CoverageService (unit)', () => {
  let prisma: PrismaMock;
  let service: CoverageService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    service = new CoverageService(prisma as any);
    prisma.locality.findMany.mockResolvedValue(LOCS);
    prisma.providerCoverage.findMany.mockResolvedValue([]);
  });

  describe('getCoverage()', () => {
    it('GRATIS → locked, sin selected ni options (extras se conservan en BD)', async () => {
      prisma.provider.findFirst.mockResolvedValue(providerRow('GRATIS'));
      prisma.providerCoverage.findMany.mockResolvedValue([
        { id: 100, locality: LOCS[0] }, // selección previa de un plan vencido
      ]);
      const res = await service.getCoverage(1);
      expect(res.locked).toBe(true);
      expect(res.maxDistricts).toBe(1);
      expect(res.selected).toEqual([]);
      expect(res.options).toEqual([]);
      // NO se borra la selección: se restaura si vuelve a pagar.
      expect(prisma.providerCoverage.deleteMany).not.toHaveBeenCalled();
    });

    it('sin suscripción = default-deny como GRATIS', async () => {
      prisma.provider.findFirst.mockResolvedValue(providerRow(null));
      const res = await service.getCoverage(1);
      expect(res.plan).toBe('GRATIS');
      expect(res.locked).toBe(true);
    });

    it('ESTANDAR → options solo de su provincia (accent-insensitive), sin el registrado', async () => {
      prisma.provider.findFirst.mockResolvedValue(providerRow('ESTANDAR'));
      prisma.providerCoverage.findMany.mockResolvedValue([
        { id: 100, locality: LOCS[0] },
      ]);
      const res = await service.getCoverage(1);
      expect(res.locked).toBe(false);
      expect(res.maxDistricts).toBe(3);
      expect(res.selected).toEqual([LOCS[0]]);
      // 1 (Huancayo), 3 (Chilca), 4 (HUANCAYO sin tilde) — nunca 2 (home) ni 5 (Jauja)
      expect(res.options.map((o: any) => o.id)).toEqual([1, 3, 4]);
    });

    it('self-heal: recorta extras sobrantes tras un downgrade sin hook', async () => {
      prisma.provider.findFirst.mockResolvedValue(providerRow('ESTANDAR'));
      prisma.providerCoverage.findMany.mockResolvedValue([
        { id: 100, locality: LOCS[0] },
        { id: 101, locality: LOCS[2] },
        { id: 102, locality: LOCS[3] }, // 3 extras > límite 2 de ESTANDAR
      ]);
      const res = await service.getCoverage(1);
      expect(res.selected).toHaveLength(2); // conserva los más antiguos
      expect(prisma.providerCoverage.deleteMany).toHaveBeenCalledWith({
        where: { providerId: 10, id: { notIn: [100, 101] } },
      });
    });
  });

  describe('setCoverage()', () => {
    it('GRATIS → ForbiddenException (opción bloqueada)', async () => {
      prisma.provider.findFirst.mockResolvedValue(providerRow('GRATIS'));
      await expect(service.setCoverage(1, [1])).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('más extras que el límite del plan → BadRequest', async () => {
      prisma.provider.findFirst.mockResolvedValue(providerRow('ESTANDAR'));
      await expect(service.setCoverage(1, [1, 3, 4])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('distrito de otra provincia → BadRequest', async () => {
      prisma.provider.findFirst.mockResolvedValue(providerRow('ESTANDAR'));
      await expect(service.setCoverage(1, [5])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('OK: filtra el registrado, reemplaza en transacción y devuelve estado fresco', async () => {
      prisma.provider.findFirst.mockResolvedValue(providerRow('ESTANDAR'));
      // ids incluyen el home (2) — se ignora, quedan [1, 3] dentro del límite
      const res = await service.setCoverage(1, [1, 2, 3]);
      expect(prisma.providerCoverage.deleteMany).toHaveBeenCalledWith({
        where: { providerId: 10 },
      });
      expect(prisma.providerCoverage.createMany).toHaveBeenCalledWith({
        data: [
          { providerId: 10, localityId: 1 },
          { providerId: 10, localityId: 3 },
        ],
      });
      expect(res.plan).toBe('ESTANDAR');
    });

    it('lista vacía = volver solo al distrito registrado (sin createMany)', async () => {
      prisma.provider.findFirst.mockResolvedValue(providerRow('PREMIUM'));
      await service.setCoverage(1, []);
      expect(prisma.providerCoverage.deleteMany).toHaveBeenCalled();
      expect(prisma.providerCoverage.createMany).not.toHaveBeenCalled();
    });
  });
});

describe('syncCoverageToPlan()', () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    prisma.locality.findMany.mockResolvedValue(LOCS);
    prisma.providerCoverage.findMany.mockResolvedValue([]);
  });

  it('GRATIS → no-op (el gate de lectura ya oculta los extras)', async () => {
    await syncCoverageToPlan(prisma as any, 10, 'GRATIS');
    expect(prisma.providerCoverage.findMany).not.toHaveBeenCalled();
    expect(prisma.providerCoverage.deleteMany).not.toHaveBeenCalled();
  });

  it('primer plan de pago → siembra 2 vecinos de la provincia por orden de catálogo', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      localityId: 2,
      locality: { province: 'Huancayo', department: 'Junín' },
    });
    await syncCoverageToPlan(prisma as any, 10, 'ESTANDAR');
    expect(prisma.providerCoverage.createMany).toHaveBeenCalledWith({
      data: [
        { providerId: 10, localityId: 1 }, // Huancayo
        { providerId: 10, localityId: 3 }, // Chilca (4 queda fuera: solo 2)
      ],
      skipDuplicates: true,
    });
  });

  it('con selección previa dentro del límite → la respeta (no siembra ni borra)', async () => {
    prisma.providerCoverage.findMany.mockResolvedValue([{ id: 100 }]);
    await syncCoverageToPlan(prisma as any, 10, 'PREMIUM');
    expect(prisma.providerCoverage.createMany).not.toHaveBeenCalled();
    expect(prisma.providerCoverage.deleteMany).not.toHaveBeenCalled();
  });

  it('downgrade PREMIUM→ESTANDAR → recorta a los 2 extras más antiguos', async () => {
    prisma.providerCoverage.findMany.mockResolvedValue([
      { id: 100 },
      { id: 101 },
      { id: 102 },
      { id: 103 },
    ]);
    await syncCoverageToPlan(prisma as any, 10, 'ESTANDAR');
    expect(prisma.providerCoverage.deleteMany).toHaveBeenCalledWith({
      where: { providerId: 10, id: { notIn: [100, 101] } },
    });
    expect(prisma.providerCoverage.createMany).not.toHaveBeenCalled();
  });

  it('provider sin provincia → no siembra nada', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      localityId: 2,
      locality: { province: null, department: 'Junín' },
    });
    await syncCoverageToPlan(prisma as any, 10, 'ESTANDAR');
    expect(prisma.providerCoverage.createMany).not.toHaveBeenCalled();
  });

  it('nunca lanza: un fallo de BD no debe romper la activación del pago', async () => {
    prisma.providerCoverage.findMany.mockRejectedValue(new Error('db down'));
    await expect(
      syncCoverageToPlan(prisma as any, 10, 'PREMIUM'),
    ).resolves.toBeUndefined();
  });
});
