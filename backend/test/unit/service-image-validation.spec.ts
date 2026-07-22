import { BadRequestException } from '@nestjs/common';
import { assertManagedServiceImageUrls } from '../../src/common/service-image-validation.js';

describe('service image URL validation', () => {
  let minio: {
    assertManagedImageUrl: jest.Mock;
    isSameImageReference: jest.Mock;
  };

  beforeEach(() => {
    minio = {
      assertManagedImageUrl: jest.fn((url: string) => url),
      isSameImageReference: jest.fn(
        (current: string | undefined, next: string) => current === next,
      ),
    };
  });

  it('valida una imagen nueva dentro de services', () => {
    assertManagedServiceImageUrls(minio as any, {
      services: [
        {
          id: 'service-1',
          imageUrl: 'https://img.test/providers/gallery/service.jpg',
        },
      ],
    });

    expect(minio.assertManagedImageUrl).toHaveBeenCalledWith(
      'https://img.test/providers/gallery/service.jpg',
      ['providers/gallery'],
    );
  });

  it('permite conservar una imagen historica del mismo servicio', () => {
    const schedule = {
      services: [
        {
          id: 'service-1',
          imageUrl: 'https://legacy.example/service.jpg',
        },
      ],
    };

    assertManagedServiceImageUrls(minio as any, schedule, schedule);

    expect(minio.assertManagedImageUrl).not.toHaveBeenCalled();
  });

  it('rechaza reemplazar una imagen historica por una URL externa', () => {
    minio.assertManagedImageUrl.mockImplementationOnce(() => {
      throw new BadRequestException('URL no permitida');
    });

    expect(() =>
      assertManagedServiceImageUrls(
        minio as any,
        {
          services: [
            {
              id: 'service-1',
              imageUrl: 'https://evil.example/service.jpg',
            },
          ],
        },
        {
          services: [
            {
              id: 'service-1',
              imageUrl: 'https://legacy.example/service.jpg',
            },
          ],
        },
      ),
    ).toThrow(BadRequestException);
  });
});
