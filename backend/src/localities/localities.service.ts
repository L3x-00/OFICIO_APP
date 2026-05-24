import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Normaliza una cadena para comparación accent/case-insensitive.
 * Mismo algoritmo que el lado mobile (peru_locations.dart `_norm`).
 */
function norm(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFD')

    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class LocalitiesService {
  private readonly logger = new Logger(LocalitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea o devuelve la localidad correspondiente a la terna
   * (department, province, district). Idempotente accent-insensitive:
   *
   *   - Si ya existe una entrada con los mismos campos normalizados
   *     (ignorando tildes y mayúsculas), devuelve esa fila tal cual.
   *   - Si no existe, crea una nueva con `source = USER` y la marca
   *     activa. El `name` se compone del nivel más específico disponible.
   *
   * Esta función NO toma userId — las localidades son datos de catálogo
   * compartido, no referencian al usuario que las propuso. Si el
   * usuario borra su cuenta, la entrada permanece (es propiedad de la
   * plataforma, no del usuario).
   */
  async suggest(input: {
    department: string;
    province?: string;
    district?: string;
  }) {
    const department = input.department.trim();
    const province = input.province?.trim() || null;
    const district = input.district?.trim() || null;
    if (department.length < 2) {
      throw new BadRequestException('El departamento es obligatorio');
    }

    // Buscar match accent-insensitive en JS (Postgres `mode: insensitive`
    // ignora caso pero no acentos).
    const all = await this.prisma.locality.findMany({
      select: {
        id: true,
        name: true,
        department: true,
        province: true,
        district: true,
        country: true,
        isActive: true,
        source: true,
      },
    });
    const nDept = norm(department);
    const nProv = norm(province);
    const nDist = norm(district);
    const existing = all.find(
      (l) =>
        norm(l.department) === nDept &&
        norm(l.province) === nProv &&
        norm(l.district) === nDist,
    );
    if (existing) return existing;

    // Nombre amigable: el nivel más específico disponible.
    const name = district || province || department;

    return this.prisma.locality.create({
      data: {
        name,
        department,
        province,
        district,
        isActive: true,
        source: 'USER',
      },
    });
  }

  /**
   * Lista localidades activas que NO vienen del catálogo seed.
   * El cliente mobile las usa para sincronizar su catálogo runtime
   * (PeruLocations.dart + dynamic additions).
   */
  async listExtras() {
    return this.prisma.locality.findMany({
      where: { source: { in: ['USER', 'ADMIN'] }, isActive: true },
      orderBy: [
        { department: 'asc' },
        { province: 'asc' },
        { district: 'asc' },
      ],
      select: {
        id: true,
        department: true,
        province: true,
        district: true,
        source: true,
      },
    });
  }

  // ── Admin ───────────────────────────────────────────────────

  async adminList(opts: { activeOnly?: boolean; search?: string } = {}) {
    const where: any = {};
    if (opts.activeOnly) where.isActive = true;
    if (opts.search && opts.search.trim().length > 0) {
      const q = opts.search.trim();
      where.OR = [
        { department: { contains: q, mode: 'insensitive' } },
        { province: { contains: q, mode: 'insensitive' } },
        { district: { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.locality.findMany({
      where,
      orderBy: [
        { department: 'asc' },
        { province: 'asc' },
        { district: 'asc' },
      ],
    });
  }

  async adminCreate(input: {
    department: string;
    province?: string;
    district?: string;
    isActive?: boolean;
  }) {
    // Reutilizamos la lógica de suggest (deduplicación accent-insensitive)
    // pero marcamos source como ADMIN al crear.
    const existing = await this.suggest({
      department: input.department,
      province: input.province,
      district: input.district,
    });
    if (existing.source === 'USER') {
      // Si fue propuesta por un usuario, la promovemos a ADMIN como una
      // forma de "aprobar" desde el panel.
      return this.prisma.locality.update({
        where: { id: existing.id },
        data: {
          source: 'ADMIN',
          isActive: input.isActive ?? existing.isActive,
        },
      });
    }
    if (input.isActive !== undefined && existing.isActive !== input.isActive) {
      return this.prisma.locality.update({
        where: { id: existing.id },
        data: { isActive: input.isActive },
      });
    }
    return existing;
  }

  async adminUpdate(
    id: number,
    data: {
      department?: string;
      province?: string;
      district?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.locality.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Localidad no encontrada');

    // Construye un nombre coherente con los nuevos valores
    const department = data.department?.trim() ?? existing.department;
    const province =
      data.province !== undefined
        ? data.province.trim() || null
        : existing.province;
    const district =
      data.district !== undefined
        ? data.district.trim() || null
        : existing.district;
    const name = district || province || department;

    return this.prisma.locality.update({
      where: { id },
      data: {
        department,
        province,
        district,
        name,
        isActive: data.isActive ?? existing.isActive,
      },
    });
  }

  async adminDelete(id: number) {
    // Soft delete: desactivar para que no aparezca en filtros pero
    // los providers que la referencian no rompan FK.
    const existing = await this.prisma.locality.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Localidad no encontrada');
    return this.prisma.locality.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
