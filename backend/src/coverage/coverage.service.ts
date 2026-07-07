import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../generated/client/client.js';

/**
 * ALCANCE POR DISTRITOS
 *
 * El distrito registrado (Provider.localityId) SIEMPRE es visible. Los
 * distritos ADICIONALES viven en `provider_coverage` y solo surten efecto
 * con plan de pago — el gate se aplica al LEER (visibleInLocalities), no
 * al escribir. Así, cuando el plan vence/se cancela (plan → GRATIS), el
 * proveedor vuelve automáticamente a su distrito registrado sin cron ni
 * hooks extra, y su selección se conserva por si vuelve a pagar.
 */

/** Límite TOTAL de distritos visibles por plan (incluye el registrado). */
export const PLAN_COVERAGE_LIMITS: Record<string, number> = {
  GRATIS: 1,
  ESTANDAR: 3,
  PREMIUM: 10,
};

/**
 * Extras que se auto-seleccionan al activar el PRIMER plan de pago:
 * "los 3 distritos alrededor" = registrado + 2 vecinos de su provincia.
 * ponytail: PREMIUM también arranca con 3 (no 10) — amplía a mano desde
 * el panel; un default de 10 distritos sorprendería al proveedor.
 */
const DEFAULT_EXTRA_SEED = 2;

const PAID_PLANS = ['ESTANDAR', 'PREMIUM'] as const;

/** Mismo algoritmo de normalización que providers/localities service. */
const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const LOCALITY_SELECT = {
  id: true,
  name: true,
  department: true,
  province: true,
  district: true,
} as const;

/**
 * Filtro Prisma reutilizable: proveedor visible en alguna de las
 * localidades dadas — por su distrito registrado (siempre) o por su
 * alcance (solo plan de pago). Componer dentro de `AND` para no pisar
 * otros `OR` del where (ej. búsqueda por texto).
 */
export function visibleInLocalities(ids: number[]): Prisma.ProviderWhereInput {
  return {
    OR: [
      { localityId: { in: ids } },
      {
        subscription: { plan: { in: [...PAID_PLANS] } },
        coverage: { some: { localityId: { in: ids } } },
      },
    ],
  };
}

/**
 * Sincroniza el alcance con el plan recién activado. Llamar DESPUÉS de la
 * transacción que cambia la suscripción (nunca dentro — un fallo aquí no
 * debe revertir un pago).
 *
 * - Plan GRATIS: no-op (el gate de lectura ya oculta los extras).
 * - Downgrade PREMIUM→ESTANDAR: recorta a los extras más antiguos.
 * - Primer plan de pago sin selección: siembra el default (2 vecinos de
 *   la misma provincia, en orden de catálogo).
 *
 * Función suelta (no método) para no tocar los constructores de los 7
 * services que activan planes ni sus tests existentes.
 */
export async function syncCoverageToPlan(
  prisma: PrismaService,
  providerId: number,
  plan: string,
): Promise<void> {
  try {
    const limit = PLAN_COVERAGE_LIMITS[plan] ?? 1;
    if (limit <= 1) return;

    const existing = await prisma.providerCoverage.findMany({
      where: { providerId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (existing.length > limit - 1) {
      const keep = existing.slice(0, limit - 1).map((c) => c.id);
      await prisma.providerCoverage.deleteMany({
        where: { providerId, id: { notIn: keep } },
      });
      return;
    }
    if (existing.length > 0) return; // ya tiene selección propia — respetarla

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        localityId: true,
        locality: { select: { province: true, department: true } },
      },
    });
    if (!provider?.locality?.province) return;

    // Orden por id = orden del catálogo seed (los distritos principales de
    // cada provincia van primero) — el default queda en la zona urbana.
    const all = await prisma.locality.findMany({
      where: { isActive: true, district: { not: null } },
      orderBy: { id: 'asc' },
      select: { id: true, province: true, department: true },
    });
    const nProv = norm(provider.locality.province);
    const nDept = norm(provider.locality.department);
    const neighbors = all
      .filter(
        (l) =>
          l.id !== provider.localityId &&
          norm(l.province) === nProv &&
          norm(l.department) === nDept,
      )
      .slice(0, DEFAULT_EXTRA_SEED)
      .map((l) => ({ providerId, localityId: l.id }));

    if (neighbors.length > 0) {
      await prisma.providerCoverage.createMany({
        data: neighbors,
        skipDuplicates: true,
      });
    }
  } catch (e) {
    // El alcance nunca debe romper la activación de un plan/pago.
    new Logger('CoverageSync').error(
      `syncCoverageToPlan(provider=${providerId}, plan=${plan}) falló: ${e}`,
    );
  }
}

@Injectable()
export class CoverageService {
  constructor(private prisma: PrismaService) {}

  private async findProvider(userId: number, type?: string) {
    const where: Prisma.ProviderWhereInput = { userId };
    if (type === 'OFICIO' || type === 'NEGOCIO') {
      where.type = type as Prisma.EnumProviderTypeFilter;
    }
    const provider = await this.prisma.provider.findFirst({
      where,
      select: {
        id: true,
        localityId: true,
        locality: { select: LOCALITY_SELECT },
        subscription: { select: { plan: true } },
      },
    });
    if (!provider)
      throw new NotFoundException('No tienes un perfil de proveedor');
    return provider;
  }

  /** Distritos elegibles: misma provincia (y departamento) del registrado. */
  private async provinceOptions(home: {
    id: number;
    department: string;
    province: string | null;
  }) {
    if (!home.province) return [];
    const all = await this.prisma.locality.findMany({
      where: { isActive: true, district: { not: null } },
      orderBy: { id: 'asc' },
      select: LOCALITY_SELECT,
    });
    const nProv = norm(home.province);
    const nDept = norm(home.department);
    return all.filter(
      (l) =>
        l.id !== home.id &&
        norm(l.province) === nProv &&
        norm(l.department) === nDept,
    );
  }

  // GET /provider-profile/me/coverage
  async getCoverage(userId: number, type?: string) {
    const provider = await this.findProvider(userId, type);
    const plan = provider.subscription?.plan ?? 'GRATIS';
    const limit = PLAN_COVERAGE_LIMITS[plan] ?? 1;
    const locked = limit <= 1;

    let extras = await this.prisma.providerCoverage.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'asc' },
      include: { locality: { select: LOCALITY_SELECT } },
    });

    // Self-heal: si un downgrade entre planes de pago no pasó por
    // syncCoverageToPlan, recorta aquí al abrir el panel.
    if (!locked && extras.length > limit - 1) {
      const keep = extras.slice(0, limit - 1);
      await this.prisma.providerCoverage.deleteMany({
        where: {
          providerId: provider.id,
          id: { notIn: keep.map((c) => c.id) },
        },
      });
      extras = keep;
    }

    return {
      plan,
      maxDistricts: limit,
      locked,
      home: provider.locality,
      // GRATIS: los extras no aplican (se conservan en BD por si re-activa).
      selected: locked ? [] : extras.map((c) => c.locality),
      options: locked ? [] : await this.provinceOptions(provider.locality),
    };
  }

  // PUT /provider-profile/me/coverage  body: { localityIds: number[] }
  async setCoverage(userId: number, localityIds: number[], type?: string) {
    const provider = await this.findProvider(userId, type);
    const plan = provider.subscription?.plan ?? 'GRATIS';
    const limit = PLAN_COVERAGE_LIMITS[plan] ?? 1;
    if (limit <= 1) {
      throw new ForbiddenException(
        'Tu plan actual no permite ampliar el alcance. Mejora a Estándar o Premium para mostrarte en más distritos.',
      );
    }

    // El registrado siempre es visible — no se guarda como extra.
    const ids = [...new Set(localityIds)].filter(
      (id) => id !== provider.localityId,
    );
    if (ids.length > limit - 1) {
      throw new BadRequestException(
        `Tu plan permite mostrarte hasta en ${limit} distritos (incluido el registrado).`,
      );
    }

    const valid = new Set(
      (await this.provinceOptions(provider.locality)).map((o) => o.id),
    );
    if (ids.some((id) => !valid.has(id))) {
      throw new BadRequestException(
        'Solo puedes elegir distritos activos de tu misma provincia.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.providerCoverage.deleteMany({
        where: { providerId: provider.id },
      }),
      ...(ids.length > 0
        ? [
            this.prisma.providerCoverage.createMany({
              data: ids.map((localityId) => ({
                providerId: provider.id,
                localityId,
              })),
            }),
          ]
        : []),
    ]);

    return this.getCoverage(userId, type);
  }
}
