import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { PushNotificationsService } from '../firebase/push-notifications.service.js';
import { MinioService } from '../common/minio.service.js';
import { validateProviderCategorySelection } from '../common/provider-category-validation.js';
import { SubmitProfessionalMigrationDto } from './dto/submit-professional-migration.dto.js';

const OFICIO = 'OFICIO';
const PROFESIONAL = 'PROFESIONAL';
const MIGRATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

type MigrationStatus = (typeof MIGRATION_STATUSES)[number];
type CategorySnapshot = {
  id: number;
  slug: string;
  name: string;
  isPrimary: boolean;
};

type CredentialFiles = {
  credentials?: Express.Multer.File[];
};

@Injectable()
export class ProfessionalMigrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly minio: MinioService,
    private readonly push: PushNotificationsService,
  ) {}

  private migrations(client: unknown = this.prisma): any {
    return (client as any).professionalMigrationRequest;
  }

  private profiles(client: unknown = this.prisma): any {
    return (client as any).professionalProfile;
  }

  private static status(value?: string): MigrationStatus {
    const normalized = (value ?? 'PENDING').toUpperCase();
    if (!MIGRATION_STATUSES.includes(normalized as MigrationStatus)) {
      throw new BadRequestException('Estado de migración inválido');
    }
    return normalized as MigrationStatus;
  }

  private static categoryIds(raw: unknown): number[] {
    if (!Array.isArray(raw)) {
      throw new BadRequestException('Las categorías solicitadas son inválidas');
    }
    const ids = raw.map((item) => {
      const id =
        item && typeof item === 'object' && 'id' in item
          ? Number((item as { id: unknown }).id)
          : Number(item);
      if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException(
          'Las categorías solicitadas son inválidas',
        );
      }
      return id;
    });
    if (ids.length === 0 || new Set(ids).size !== ids.length) {
      throw new BadRequestException('Las categorías solicitadas son inválidas');
    }
    return ids;
  }

  private static orderedSnapshot(
    categoryIds: number[],
    categories: Array<{ id: number; slug: string; name: string }>,
  ): CategorySnapshot[] {
    const byId = new Map(categories.map((category) => [category.id, category]));
    return categoryIds.map((id, index) => {
      const category = byId.get(id);
      if (!category) {
        throw new BadRequestException('Una especialidad ya no está disponible');
      }
      return { ...category, isPrimary: index === 0 };
    });
  }

  private async removeUploaded(urls: string[]): Promise<void> {
    await Promise.all(
      urls.map((url) => this.minio.deleteFile(url).catch(() => {})),
    );
  }

  async submit(
    userId: number,
    dto: SubmitProfessionalMigrationDto,
    files: CredentialFiles = {},
  ) {
    const categoryIds = ProfessionalMigrationsService.categoryIds(
      dto.categoryIds,
    );
    const provider = await this.prisma.provider.findFirst({
      where: { userId, type: OFICIO as any },
      select: {
        id: true,
        businessName: true,
        verificationStatus: true,
        providerCategories: {
          select: {
            isPrimary: true,
            category: { select: { id: true, slug: true, name: true } },
          },
          orderBy: { isPrimary: 'desc' },
        },
      },
    });
    if (!provider) {
      throw new BadRequestException(
        'Solo un perfil de Oficios puede solicitar el cambio a servicio profesional',
      );
    }
    // Mismo gate que trust-validation: no se pueden revisar credenciales
    // sobre un Oficio que un admin todavía no validó como real.
    if (provider.verificationStatus !== 'APROBADO') {
      throw new BadRequestException(
        'Tu perfil de Oficio debe estar aprobado antes de solicitar el cambio a servicio profesional',
      );
    }

    await validateProviderCategorySelection(
      this.prisma,
      categoryIds,
      PROFESIONAL,
    );

    const pending = await this.migrations().findFirst({
      where: { providerId: provider.id, status: 'PENDING' },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException(
        'Ya tienes una solicitud profesional pendiente',
      );
    }

    const requestedCategories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, slug: true, name: true },
    });
    const requestedSnapshot = ProfessionalMigrationsService.orderedSnapshot(
      categoryIds,
      requestedCategories,
    );
    const previousSnapshot: CategorySnapshot[] =
      provider.providerCategories.map((item) => ({
        ...item.category,
        isPrimary: item.isPrimary,
      }));

    const uploadedUrls: string[] = [];
    try {
      for (const file of files.credentials ?? []) {
        uploadedUrls.push(
          await this.minio.uploadFile(
            file.buffer,
            file.originalname,
            'trust-validation/professional-migrations',
          ),
        );
      }
    } catch (error) {
      await this.removeUploaded(uploadedUrls);
      throw error;
    }

    try {
      const request = await this.prisma.$transaction(async (tx) => {
        const migration = this.migrations(tx);
        const created = await migration.create({
          data: {
            providerId: provider.id,
            status: 'PENDING',
            specialty: dto.specialty,
            institution: dto.institution ?? null,
            yearsExperience: dto.yearsExperience ?? null,
            professionalTitle: dto.professionalTitle ?? null,
            registrationNumber: dto.registrationNumber ?? null,
            registrationIssuer: dto.registrationIssuer ?? null,
            requestedCategories: requestedSnapshot as any,
            previousCategories: previousSnapshot as any,
          },
          select: { id: true, createdAt: true },
        });

        if (uploadedUrls.length > 0) {
          await (tx as any).verificationDoc.createMany({
            data: uploadedUrls.map((fileUrl) => ({
              providerId: provider.id,
              professionalMigrationRequestId: created.id,
              docType: 'certificado',
              fileUrl,
              status: 'PENDIENTE',
            })),
          });
        }
        return created;
      });

      this.events.emitNotification({
        type: 'PROFESSIONAL_MIGRATION_SUBMITTED',
        title: 'Nueva migración profesional',
        body: `${provider.businessName} solicitó pasar de Oficios a Servicios profesionales.`,
        targetRole: 'ADMIN',
      });
      return {
        success: true,
        requestId: request.id,
        createdAt: request.createdAt,
      };
    } catch (error: any) {
      await this.removeUploaded(uploadedUrls);
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Ya tienes una solicitud profesional pendiente',
        );
      }
      throw error;
    }
  }

  async getMine(userId: number) {
    const individualProfiles = await this.prisma.provider.findMany({
      where: { userId, type: { in: [OFICIO, PROFESIONAL] as any } },
      select: { id: true, type: true },
      take: 2,
      orderBy: { id: 'asc' },
    });
    if (individualProfiles.length > 1) {
      throw new ConflictException(
        'Se detectaron perfiles individuales incompatibles',
      );
    }
    const provider = individualProfiles[0] ?? null;
    if (!provider) {
      return { eligible: false, providerType: null, request: null };
    }

    const request = await this.migrations().findFirst({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        specialty: true,
        institution: true,
        yearsExperience: true,
        professionalTitle: true,
        registrationNumber: true,
        registrationIssuer: true,
        rejectionReason: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      eligible: provider.type === OFICIO && request?.status !== 'PENDING',
      providerType: provider.type,
      request: request ?? null,
    };
  }

  async listForAdmin(status?: string, page = 1, limit = 20) {
    const normalizedStatus = ProfessionalMigrationsService.status(status);
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safeLimit = Math.min(
      100,
      Math.max(1, Math.floor(Number(limit) || 20)),
    );
    const where = { status: normalizedStatus };
    const [data, total] = await Promise.all([
      this.migrations().findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          status: true,
          specialty: true,
          createdAt: true,
          reviewedAt: true,
          rejectionReason: true,
          provider: {
            select: {
              id: true,
              businessName: true,
              type: true,
              user: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
          _count: { select: { documents: true } },
        },
      }),
      this.migrations().count({ where }),
    ]);
    return {
      data,
      total,
      page: safePage,
      lastPage: Math.ceil(total / safeLimit),
    };
  }

  async getForAdmin(id: number) {
    const request = await this.migrations().findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        specialty: true,
        institution: true,
        yearsExperience: true,
        professionalTitle: true,
        registrationNumber: true,
        registrationIssuer: true,
        requestedCategories: true,
        previousCategories: true,
        rejectionReason: true,
        reviewedByAdminId: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        documents: {
          select: {
            id: true,
            docType: true,
            fileUrl: true,
            status: true,
            reviewedAt: true,
            notes: true,
          },
        },
        provider: {
          select: {
            id: true,
            userId: true,
            businessName: true,
            type: true,
            phone: true,
            description: true,
            // El revisor necesita ver si el Oficio de origen sigue
            // PENDIENTE/RECHAZADO antes de aprobar credenciales — hoy no
            // hay ningún gate que lo impida en submit().
            verificationStatus: true,
            trustStatus: true,
            isVisible: true,
            images: { select: { id: true, url: true, isCover: true } },
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!request)
      throw new NotFoundException('Solicitud profesional no encontrada');
    return request;
  }

  async approve(id: number, adminId: number) {
    let approved: {
      providerId: number;
      userId: number;
      businessName: string;
    };
    try {
      approved = await this.prisma.$transaction(async (tx) => {
        const migration = this.migrations(tx);
        const now = new Date();
        const claimed = await migration.updateMany({
          where: { id, status: 'PENDING' },
          data: {
            status: 'APPROVED',
            reviewedAt: now,
            reviewedByAdminId: adminId,
            rejectionReason: null,
          },
        });
        if (claimed.count !== 1) {
          const existing = await migration.findUnique({
            where: { id },
            select: { id: true },
          });
          if (!existing) {
            throw new NotFoundException('Solicitud profesional no encontrada');
          }
          throw new ConflictException('La solicitud ya fue procesada');
        }

        const request = await migration.findUnique({
          where: { id },
          select: {
            providerId: true,
            specialty: true,
            institution: true,
            yearsExperience: true,
            professionalTitle: true,
            registrationNumber: true,
            registrationIssuer: true,
            requestedCategories: true,
            provider: {
              select: { userId: true, businessName: true, type: true },
            },
          },
        });
        if (!request) {
          throw new NotFoundException('Solicitud profesional no encontrada');
        }
        if (request.provider.type !== OFICIO) {
          throw new ConflictException('El perfil ya no es de Oficios');
        }

        const categoryIds = ProfessionalMigrationsService.categoryIds(
          request.requestedCategories,
        );
        await validateProviderCategorySelection(
          tx as any,
          categoryIds,
          PROFESIONAL,
        );

        await tx.provider.update({
          where: { id: request.providerId },
          data: { type: PROFESIONAL as any },
        });
        await tx.providerCategory.deleteMany({
          where: { providerId: request.providerId },
        });
        await tx.providerCategory.createMany({
          data: categoryIds.map((categoryId, index) => ({
            providerId: request.providerId,
            categoryId,
            isPrimary: index === 0,
          })),
        });
        await this.profiles(tx).upsert({
          where: { providerId: request.providerId },
          create: {
            providerId: request.providerId,
            specialty: request.specialty,
            institution: request.institution ?? null,
            yearsExperience: request.yearsExperience ?? null,
            professionalTitle: request.professionalTitle ?? null,
            registrationNumber: request.registrationNumber ?? null,
            registrationIssuer: request.registrationIssuer ?? null,
          },
          update: {
            specialty: request.specialty,
            institution: request.institution ?? null,
            yearsExperience: request.yearsExperience ?? null,
            professionalTitle: request.professionalTitle ?? null,
            registrationNumber: request.registrationNumber ?? null,
            registrationIssuer: request.registrationIssuer ?? null,
          },
        });
        await (tx as any).verificationDoc.updateMany({
          where: { professionalMigrationRequestId: id },
          data: { status: 'APROBADO', reviewedAt: now },
        });

        return {
          providerId: request.providerId,
          userId: request.provider.userId,
          businessName: request.provider.businessName,
        };
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'No se puede aprobar por un perfil individual duplicado',
        );
      }
      throw error;
    }

    const title = 'Tu perfil ahora es profesional';
    const body =
      'Tu solicitud fue aprobada. Conservamos tu perfil, fotos, plan e historial.';
    this.events.emitNotification({
      type: 'PROFESSIONAL_MIGRATION_APPROVED',
      title,
      body,
      targetUserId: approved.userId,
      targetProfileType: PROFESIONAL,
    });
    void this.push
      .sendToUser(approved.userId, title, body, {
        type: 'PROFESSIONAL_MIGRATION_APPROVED',
        profileType: PROFESIONAL,
      })
      .catch(() => {});
    return { success: true, providerId: approved.providerId };
  }

  async reject(id: number, adminId: number, reason: string) {
    const normalizedReason = reason?.trim();
    if (!normalizedReason) {
      throw new BadRequestException('Debes indicar el motivo del rechazo');
    }

    const rejected = await this.prisma.$transaction(async (tx) => {
      const migration = this.migrations(tx);
      const now = new Date();
      const claimed = await migration.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          rejectionReason: normalizedReason,
          reviewedAt: now,
          reviewedByAdminId: adminId,
        },
      });
      if (claimed.count !== 1) {
        const existing = await migration.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!existing) {
          throw new NotFoundException('Solicitud profesional no encontrada');
        }
        throw new ConflictException('La solicitud ya fue procesada');
      }

      const request = await migration.findUnique({
        where: { id },
        select: {
          providerId: true,
          provider: { select: { userId: true } },
        },
      });
      if (!request) {
        throw new NotFoundException('Solicitud profesional no encontrada');
      }
      await (tx as any).verificationDoc.updateMany({
        where: { professionalMigrationRequestId: id },
        data: {
          status: 'RECHAZADO',
          reviewedAt: now,
          notes: normalizedReason,
        },
      });
      return {
        providerId: request.providerId,
        userId: request.provider.userId,
      };
    });

    const title = 'Solicitud profesional observada';
    this.events.emitNotification({
      type: 'PROFESSIONAL_MIGRATION_REJECTED',
      title,
      body: normalizedReason,
      targetUserId: rejected.userId,
      targetProfileType: OFICIO,
    });
    void this.push
      .sendToUser(rejected.userId, title, normalizedReason, {
        type: 'PROFESSIONAL_MIGRATION_REJECTED',
        profileType: OFICIO,
      })
      .catch(() => {});
    return { success: true, providerId: rejected.providerId };
  }
}
