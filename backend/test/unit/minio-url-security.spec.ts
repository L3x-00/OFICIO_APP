import { BadRequestException } from '@nestjs/common';
import { MinioService } from '../../src/common/minio.service.js';

describe('MinioService managed image URLs', () => {
  let service: MinioService;

  beforeEach(() => {
    service = new MinioService();
    Object.assign(service as unknown as Record<string, unknown>, {
      bucket: 'private-bucket',
      publicBucket: 'public-bucket',
      r2BaseUrl: 'https://r2.test/private-bucket',
      cdnBaseUrl: 'https://img.test',
    });
  });

  it('acepta URL R2 canonica, R2 firmada y CDN de la carpeta esperada', () => {
    expect(
      service.assertManagedImageUrl(
        'https://r2.test/private-bucket/providers/gallery/a.jpg',
        ['providers/gallery'],
      ),
    ).toBe('https://r2.test/private-bucket/providers/gallery/a.jpg');

    const signed =
      'https://r2.test/private-bucket/providers/gallery/a.jpg' +
      '?X-Amz-Signature=abc&X-Amz-Expires=604800';
    expect(service.assertManagedImageUrl(signed, ['providers/gallery'])).toBe(
      signed,
    );

    expect(
      service.assertManagedImageUrl(
        'https://img.test/providers/gallery/a.jpg',
        ['providers/gallery'],
      ),
    ).toBe('https://img.test/providers/gallery/a.jpg');
  });

  it.each([
    'https://evil.example/providers/gallery/a.jpg',
    'https://img.test.evil.example/providers/gallery/a.jpg',
    'https://img.test/catalog/a.jpg',
    'https://user@img.test/providers/gallery/a.jpg',
    'https://img.test/providers/gallery/a.jpg#fragment',
  ])('rechaza origen o carpeta no permitidos: %s', (url) => {
    expect(() =>
      service.assertManagedImageUrl(url, ['providers/gallery']),
    ).toThrow(BadRequestException);
  });

  it.each([
    'https://img.test/providers%2Fgallery/a.jpg',
    'https://img.test/providers/gallery/%252e%252e/admin/a.jpg',
    'https://img.test/providers/gallery//a.jpg',
  ])('rechaza rutas ambiguas o codificadas: %s', (url) => {
    expect(() =>
      service.assertManagedImageUrl(url, ['providers/gallery']),
    ).toThrow(BadRequestException);
  });

  it('impide referenciar contenido privado mediante el CDN publico', () => {
    expect(() =>
      service.assertManagedImageUrl(
        'https://img.test/payments/vouchers/a.jpg',
        ['payments/vouchers'],
      ),
    ).toThrow(BadRequestException);

    expect(
      service.assertManagedImageUrl(
        'https://r2.test/private-bucket/payments/vouchers/a.jpg',
        ['payments/vouchers'],
      ),
    ).toBe('https://r2.test/private-bucket/payments/vouchers/a.jpg');
  });

  it('compara el objeto real sin confundir queries de URLs externas', () => {
    expect(
      service.isSameImageReference(
        'https://r2.test/private-bucket/providers/gallery/a.jpg',
        'https://r2.test/private-bucket/providers/gallery/a.jpg?X-Amz-Signature=abc',
      ),
    ).toBe(true);
    expect(
      service.isSameImageReference(
        'https://r2.test/private-bucket/providers/gallery/a.jpg',
        'https://img.test/providers/gallery/a.jpg',
      ),
    ).toBe(true);
    expect(
      service.isSameImageReference(
        'https://legacy.example/a.jpg',
        'https://legacy.example/a.jpg',
      ),
    ).toBe(true);
    expect(
      service.isSameImageReference(
        'https://legacy.example/a.jpg?version=1',
        'https://legacy.example/a.jpg?version=2',
      ),
    ).toBe(false);
  });
});
