import { BadRequestException } from '@nestjs/common';
import { AdminService } from '../../src/admin/admin.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('AdminService professional providers (unit)', () => {
  let prisma: PrismaMock;
  let minio: {
    uploadFile: jest.Mock;
    deleteFile: jest.Mock;
    assertManagedImageUrl: jest.Mock;
    isSameImageReference: jest.Mock;
  };
  let service: AdminService;

  const professionalInput = (overrides: Record<string, unknown> = {}) => ({
    email: 'ingeniera@servi.pe',
    firstName: 'Ana',
    lastName: 'Rojas',
    businessName: 'Ana Rojas Ingenieria',
    phone: '999888777',
    localityId: 9,
    type: 'PROFESIONAL',
    categoryIds: [71],
    primaryCategoryId: 71,
    professionalSpecialty: 'Ingenieria civil',
    professionalInstitution: 'Universidad Nacional del Centro',
    professionalYearsExperience: '6',
    professionalTitle: 'Ingeniera civil',
    professionalRegistrationNumber: 'CIP-12345',
    professionalRegistrationIssuer: 'Colegio de Ingenieros del Peru',
    ...overrides,
  });

  const professionalCategory = (overrides: Record<string, unknown> = {}) => ({
    id: 71,
    parentId: 70,
    forType: 'PROFESIONAL',
    parent: { forType: 'PROFESIONAL' },
    ...overrides,
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    minio = {
      uploadFile: jest.fn().mockResolvedValue('https://r2/provider.jpg'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      assertManagedImageUrl: jest.fn(),
      isSameImageReference: jest.fn().mockReturnValue(false),
    };
    service = new AdminService(
      prisma as any,
      {} as any,
      minio as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.providerCoverage.findMany.mockResolvedValue([]);
  });

  it('crea el perfil profesional para el mismo Provider creado', async () => {
    prisma.category.findMany.mockResolvedValue([professionalCategory()]);
    prisma.user.create.mockResolvedValue({ id: 41 });
    prisma.provider.create.mockResolvedValue({ id: 92 });

    const result = await service.createProvider(professionalInput(), []);

    expect(prisma.provider.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'PROFESIONAL',
          providerCategories: {
            create: [{ categoryId: 71, isPrimary: true }],
          },
        }),
      }),
    );
    expect(prisma.professionalProfile.create).toHaveBeenCalledWith({
      data: {
        providerId: 92,
        specialty: 'Ingenieria civil',
        institution: 'Universidad Nacional del Centro',
        yearsExperience: 6,
        professionalTitle: 'Ingeniera civil',
        registrationNumber: 'CIP-12345',
        registrationIssuer: 'Colegio de Ingenieros del Peru',
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        provider: { id: 92 },
        userId: 41,
        tempPassword: expect.any(String),
      }),
    );
  });

  it('rechaza categoria de otro tipo antes de subir archivos', async () => {
    prisma.category.findMany.mockResolvedValue([
      professionalCategory({
        forType: 'OFICIO',
        parent: { forType: 'OFICIO' },
      }),
    ]);
    const file = {
      buffer: Buffer.from('imagen'),
      originalname: 'perfil.jpg',
    } as Express.Multer.File;

    await expect(
      service.createProvider(professionalInput(), [file]),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(minio.uploadFile).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.provider.create).not.toHaveBeenCalled();
  });

  it('limpia la primera imagen si falla la segunda subida', async () => {
    prisma.category.findMany.mockResolvedValue([professionalCategory()]);
    minio.uploadFile
      .mockResolvedValueOnce('https://r2/primera.jpg')
      .mockRejectedValueOnce(new Error('R2 no disponible'));
    const files = [
      { buffer: Buffer.from('primera'), originalname: 'primera.jpg' },
      { buffer: Buffer.from('segunda'), originalname: 'segunda.jpg' },
    ] as Express.Multer.File[];

    await expect(
      service.createProvider(professionalInput(), files),
    ).rejects.toThrow('R2 no disponible');

    expect(minio.deleteFile).toHaveBeenCalledWith('https://r2/primera.jpg');
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.provider.create).not.toHaveBeenCalled();
  });

  it('rechaza reemplazar especialidades profesionales por categorias de oficio', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 92,
      type: 'PROFESIONAL',
      subscription: { plan: 'PREMIUM' },
    });
    prisma.category.findMany.mockResolvedValue([
      professionalCategory({
        id: 12,
        forType: 'OFICIO',
        parent: { forType: 'OFICIO' },
      }),
    ]);

    await expect(
      service.updateProvider(92, { categoryIds: [12] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.providerCategory.deleteMany).not.toHaveBeenCalled();
    expect(prisma.providerCategory.createMany).not.toHaveBeenCalled();
    expect(prisma.provider.update).not.toHaveBeenCalled();
  });

  it('actualiza especialidades profesionales compatibles', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 92,
      type: 'PROFESIONAL',
      subscription: { plan: 'PREMIUM' },
    });
    prisma.category.findMany.mockResolvedValue([
      professionalCategory({ id: 72 }),
    ]);
    prisma.provider.update.mockResolvedValue({ id: 92 });

    await service.updateProvider(92, {
      categoryIds: [72],
      primaryCategoryId: 72,
    });

    expect(prisma.providerCategory.deleteMany).toHaveBeenCalledWith({
      where: { providerId: 92 },
    });
    expect(prisma.providerCategory.createMany).toHaveBeenCalledWith({
      data: [{ providerId: 92, categoryId: 72, isPrimary: true }],
    });
  });
});
