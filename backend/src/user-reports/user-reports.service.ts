import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserReportStatus } from '../generated/client/enums.js';
import { CreateUserReportDto } from './dto/create-user-report.dto.js';

/**
 * Reportes de comportamiento usuario→usuario (spam, estafa, acoso). El
 * `reporterId` SIEMPRE llega del JWT (nunca del body). El admin los revisa.
 */
@Injectable()
export class UserReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: number, dto: CreateUserReportDto) {
    if (reporterId === dto.reportedUserId) {
      throw new BadRequestException('No puedes reportarte a ti mismo');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: dto.reportedUserId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('Usuario reportado no encontrado');
    }
    return this.prisma.userReport.create({
      data: {
        reporterId,
        reportedUserId: dto.reportedUserId,
        reason: dto.reason,
        description: dto.description ?? null,
      },
    });
  }

  /** Lista para el admin (por defecto PENDING) con info de ambos usuarios. */
  async listForAdmin(status?: string, page = 1, limit = 20) {
    const where =
      status && status in UserReportStatus
        ? { status: status as UserReportStatus }
        : {};
    const skip = (page - 1) * limit;

    const userSelect = {
      select: { id: true, firstName: true, lastName: true, email: true },
    };

    const [data, total, pendingCount] = await Promise.all([
      this.prisma.userReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { reporter: userSelect, reportedUser: userSelect },
      }),
      this.prisma.userReport.count({ where }),
      this.prisma.userReport.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
      pendingCount,
    };
  }

  /** Marca un reporte como REVIEWED o DISMISSED. */
  async updateStatus(id: number, status: string) {
    if (status !== 'REVIEWED' && status !== 'DISMISSED') {
      throw new BadRequestException(
        'Estado inválido (usa REVIEWED o DISMISSED)',
      );
    }
    const report = await this.prisma.userReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    return this.prisma.userReport.update({
      where: { id },
      data: { status: status as UserReportStatus },
    });
  }
}
