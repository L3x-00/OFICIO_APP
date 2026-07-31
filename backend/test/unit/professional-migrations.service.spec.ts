import { ConflictException, BadRequestException } from '@nestjs/common';
import { ProfessionalMigrationsService } from '../../src/professional-migrations/professional-migrations.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  type EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { createPushMock, type PushMock } from '../mocks/push.mock';

describe('ProfessionalMigrationsService (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;
  let minio: {
    uploadFile: jest.Mock;
    deleteFile: jest.Mock;
  };
  let service: ProfessionalMigrationsService;

  const dto = {
    specialty: 'Ingeniería civil',
    institution: 'Universidad Servi',
    yearsExperience: 6,
    professionalTitle: 'Ingeniero civil',
    registrationNumber: 'CIP-123',
    registrationIssuer: 'CIP',
    categoryIds: [30],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    minio = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    service = new ProfessionalMigrationsService(
      prisma as any,
      events as any,
      minio as any,
      push as any,
    );
  });

  function mockEligibleOficio() {
    prisma.provider.findFirst.mockResolvedValue({
      id: 10,
      businessName: 'Obras López',
      verificationStatus: 'APROBADO',
      providerCategories: [
        {
          isPrimary: true,
          category: { id: 4, slug: 'albanileria', name: 'Albañilería' },
        },
      ],
    });
    prisma.category.findMany
      .mockResolvedValueOnce([
        {
          id: 30,
          parentId: 3,
          forType: 'PROFESIONAL',
          parent: { forType: 'PROFESIONAL' },
        },
      ])
      .mockResolvedValueOnce([
        { id: 30, slug: 'ingenieria-civil', name: 'Ingeniería civil' },
      ]);
    prisma.professionalMigrationRequest.findFirst.mockResolvedValue(null);
  }

  it('solicitud no altera el Provider y guarda snapshots antes de migrar', async () => {
    mockEligibleOficio();
    prisma.professionalMigrationRequest.create.mockResolvedValue({
      id: 71,
      createdAt: new Date('2026-07-29T00:00:00Z'),
    });

    const result = await service.submit(7, dto as any);

    expect(result).toEqual(
      expect.objectContaining({ success: true, requestId: 71 }),
    );
    expect(prisma.provider.update).not.toHaveBeenCalled();
    expect(prisma.professionalMigrationRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerId: 10,
          status: 'PENDING',
          specialty: 'Ingeniería civil',
          requestedCategories: [
            {
              id: 30,
              slug: 'ingenieria-civil',
              name: 'Ingeniería civil',
              isPrimary: true,
            },
          ],
          previousCategories: [
            {
              id: 4,
              slug: 'albanileria',
              name: 'Albañilería',
              isPrimary: true,
            },
          ],
        }),
      }),
    );
    expect(events.emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PROFESSIONAL_MIGRATION_SUBMITTED',
        targetRole: 'ADMIN',
      }),
    );
  });

  it('PENDING duplicada → Conflict antes de subir documentos', async () => {
    mockEligibleOficio();
    prisma.professionalMigrationRequest.findFirst.mockResolvedValue({ id: 1 });

    await expect(service.submit(7, dto as any)).rejects.toThrow(
      ConflictException,
    );
    expect(minio.uploadFile).not.toHaveBeenCalled();
  });

  it('Oficio PENDIENTE o RECHAZADO → BadRequest antes de crear la solicitud', async () => {
    prisma.provider.findFirst.mockResolvedValue({
      id: 10,
      businessName: 'Obras López',
      verificationStatus: 'PENDIENTE',
      providerCategories: [],
    });

    await expect(service.submit(7, dto as any)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.professionalMigrationRequest.create).not.toHaveBeenCalled();
    expect(minio.uploadFile).not.toHaveBeenCalled();
  });

  it('aprueba en la misma fila: cambia tipo, categorías y perfil profesional', async () => {
    prisma.professionalMigrationRequest.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.professionalMigrationRequest.findUnique.mockResolvedValue({
      providerId: 10,
      specialty: 'Ingeniería civil',
      institution: 'Universidad Servi',
      yearsExperience: 6,
      professionalTitle: 'Ingeniero civil',
      registrationNumber: 'CIP-123',
      registrationIssuer: 'CIP',
      requestedCategories: [
        {
          id: 30,
          slug: 'ingenieria-civil',
          name: 'Ingeniería civil',
          isPrimary: true,
        },
      ],
      provider: { userId: 7, businessName: 'Obras López', type: 'OFICIO' },
    });
    prisma.category.findMany.mockResolvedValue([
      {
        id: 30,
        parentId: 3,
        forType: 'PROFESIONAL',
        parent: { forType: 'PROFESIONAL' },
      },
    ]);

    const result = await service.approve(71, 2);

    expect(result).toEqual({ success: true, providerId: 10 });
    expect(prisma.provider.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { type: 'PROFESIONAL' },
    });
    expect(prisma.providerCategory.deleteMany).toHaveBeenCalledWith({
      where: { providerId: 10 },
    });
    expect(prisma.providerCategory.createMany).toHaveBeenCalledWith({
      data: [{ providerId: 10, categoryId: 30, isPrimary: true }],
    });
    expect(prisma.professionalProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerId: 10 },
        create: expect.objectContaining({ specialty: 'Ingeniería civil' }),
      }),
    );
    expect(prisma.verificationDoc.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { professionalMigrationRequestId: 71 },
        data: expect.objectContaining({ status: 'APROBADO' }),
      }),
    );
    expect(events.emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PROFESSIONAL_MIGRATION_APPROVED',
        targetUserId: 7,
        targetProfileType: 'PROFESIONAL',
      }),
    );
  });

  it('doble aprobación no toca Provider ni categorías', async () => {
    prisma.professionalMigrationRequest.updateMany.mockResolvedValue({
      count: 0,
    });
    prisma.professionalMigrationRequest.findUnique.mockResolvedValue({
      id: 71,
    });

    await expect(service.approve(71, 2)).rejects.toThrow(ConflictException);
    expect(prisma.provider.update).not.toHaveBeenCalled();
    expect(prisma.providerCategory.deleteMany).not.toHaveBeenCalled();
  });

  it('rechazo conserva OFICIO y categorías existentes', async () => {
    prisma.professionalMigrationRequest.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.professionalMigrationRequest.findUnique.mockResolvedValue({
      providerId: 10,
      provider: { userId: 7 },
    });

    const result = await service.reject(
      71,
      2,
      'Falta una foto legible del título',
    );

    expect(result).toEqual({ success: true, providerId: 10 });
    expect(prisma.provider.update).not.toHaveBeenCalled();
    expect(prisma.providerCategory.deleteMany).not.toHaveBeenCalled();
    expect(prisma.verificationDoc.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { professionalMigrationRequestId: 71 },
        data: expect.objectContaining({
          status: 'RECHAZADO',
          notes: 'Falta una foto legible del título',
        }),
      }),
    );
  });

  it('snapshot corrupto no puede aprobarse', async () => {
    prisma.professionalMigrationRequest.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.professionalMigrationRequest.findUnique.mockResolvedValue({
      providerId: 10,
      requestedCategories: [],
      provider: { userId: 7, businessName: 'Obras López', type: 'OFICIO' },
    });

    await expect(service.approve(71, 2)).rejects.toThrow(BadRequestException);
    expect(prisma.provider.update).not.toHaveBeenCalled();
  });
});
