/**
 * UNIT — MinioService.publicThumbUrl (Opción C: thumbnails en listados).
 *
 * Función pura/estática: dada una URL del CDN público devuelve la del
 * thumbnail; cualquier otra URL (legacy R2 firmada, privada, o modo público
 * apagado) la deja intacta. Es la pieza que hace que los listados sirvan
 * imágenes ~90% más livianas SIN exponer nada del bucket privado.
 *
 * `sharp` se mockea: estos tests no procesan imágenes y no queremos cargar el
 * binario nativo en el runner de CI.
 */
jest.mock('sharp', () => jest.fn());

import { MinioService } from '../../src/common/minio.service.js';

describe('MinioService.publicThumbUrl (unit)', () => {
  const ORIGINAL = process.env.MINIO_PUBLIC_URL;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.MINIO_PUBLIC_URL;
    else process.env.MINIO_PUBLIC_URL = ORIGINAL;
  });

  it('sin MINIO_PUBLIC_URL → URL sin cambios (modo firmado)', () => {
    delete process.env.MINIO_PUBLIC_URL;
    const u = 'https://acc.r2.cloudflarestorage.com/b/providers/1.jpg';
    expect(MinioService.publicThumbUrl(u)).toBe(u);
  });

  it('URL del CDN → deriva el thumbnail _thumb.webp', () => {
    process.env.MINIO_PUBLIC_URL = 'https://img.oficioapp.org.pe';
    expect(
      MinioService.publicThumbUrl(
        'https://img.oficioapp.org.pe/providers/gallery/abc.jpg',
      ),
    ).toBe('https://img.oficioapp.org.pe/providers/gallery/abc_thumb.webp');
  });

  it('URL legacy R2 firmada (NO CDN) → sin cambios', () => {
    process.env.MINIO_PUBLIC_URL = 'https://img.oficioapp.org.pe';
    const legacy =
      'https://acc.r2.cloudflarestorage.com/b/providers/1.jpg?X-Amz-Signature=Z';
    expect(MinioService.publicThumbUrl(legacy)).toBe(legacy);
  });

  it('ignora query params al derivar el thumb', () => {
    process.env.MINIO_PUBLIC_URL = 'https://img.oficioapp.org.pe';
    expect(
      MinioService.publicThumbUrl(
        'https://img.oficioapp.org.pe/offer-posts/x.png?v=1',
      ),
    ).toBe('https://img.oficioapp.org.pe/offer-posts/x_thumb.webp');
  });

  it('normaliza la barra final del CDN', () => {
    process.env.MINIO_PUBLIC_URL = 'https://img.oficioapp.org.pe/';
    expect(
      MinioService.publicThumbUrl('https://img.oficioapp.org.pe/users/a.jpg'),
    ).toBe('https://img.oficioapp.org.pe/users/a_thumb.webp');
  });

  it('vacío → vacío', () => {
    expect(MinioService.publicThumbUrl('')).toBe('');
  });
});
