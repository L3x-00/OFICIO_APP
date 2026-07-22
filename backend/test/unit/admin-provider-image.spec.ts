import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from '../../src/admin/admin.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('AdminService.addProviderImageIfEmpty', () => {
  let prisma: PrismaMock;
  let minio: {
    uploadFile: jest.Mock;
    deleteFile: jest.Mock;
  };
  let service: AdminService;
  const file = {
    buffer: Buffer.from('image'),
    originalname: 'perfil.jpg',
  } as Express.Multer.File;

  beforeEach(() => {
    prisma = createPrismaMock();
    minio = {
      uploadFile: jest.fn().mockResolvedValue('https://r2/provider.jpg'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
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
  });

  it('exige un archivo', async () => {
    await expect(service.addProviderImageIfEmpty(7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(minio.uploadFile).not.toHaveBeenCalled();
  });

  it('rechaza un proveedor inexistente antes de subir', async () => {
    prisma.provider.findUnique.mockResolvedValue(null);

    await expect(
      service.addProviderImageIfEmpty(7, file),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(minio.uploadFile).not.toHaveBeenCalled();
  });

  it('rechaza reemplazar una foto existente', async () => {
    prisma.provider.findUnique.mockResolvedValue({
      id: 7,
      images: [{ id: 11 }],
    });

    await expect(
      service.addProviderImageIfEmpty(7, file),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(minio.uploadFile).not.toHaveBeenCalled();
  });

  it('crea la única foto como portada e invalida caché', async () => {
    const created = {
      id: 12,
      providerId: 7,
      url: 'https://r2/provider.jpg',
      isCover: true,
      order: 0,
    };
    prisma.provider.findUnique.mockResolvedValue({ id: 7, images: [] });
    prisma.providerImage.findFirst.mockResolvedValue(null);
    prisma.providerImage.create.mockResolvedValue(created);

    await expect(service.addProviderImageIfEmpty(7, file)).resolves.toEqual(
      created,
    );
    expect(prisma.provider.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 } }),
    );
    expect(prisma.providerImage.create).toHaveBeenCalledWith({
      data: {
        providerId: 7,
        url: 'https://r2/provider.jpg',
        isCover: true,
        order: 0,
      },
    });
    expect(minio.deleteFile).not.toHaveBeenCalled();
  });

  it('limpia el archivo si otra carga gana la carrera', async () => {
    prisma.provider.findUnique.mockResolvedValue({ id: 7, images: [] });
    prisma.providerImage.findFirst.mockResolvedValue({ id: 13 });

    await expect(
      service.addProviderImageIfEmpty(7, file),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.providerImage.create).not.toHaveBeenCalled();
    expect(minio.deleteFile).toHaveBeenCalledWith('https://r2/provider.jpg');
  });
});
