/**
 * UNIT — SignImagesInterceptor.
 * Recorre toda respuesta JSON y firma cualquier URL de R2 (bucket privado).
 * Seguridad: si dejara pasar una URL sin firmar, Flutter recibe un 403; si
 * firmara URLs ajenas, gastaría HMAC de más. Solo r2.cloudflarestorage.com.
 */
import { of, firstValueFrom } from 'rxjs';
import { SignImagesInterceptor } from '../../src/common/sign-images.interceptor.js';

describe('SignImagesInterceptor (unit)', () => {
  let minio: { signUrl: jest.Mock };
  let interceptor: SignImagesInterceptor;

  beforeEach(() => {
    minio = { signUrl: jest.fn(async (u: string) => `${u}?X-Amz-Signature=ok`) };
    interceptor = new SignImagesInterceptor(minio as any);
  });

  const run = (data: unknown) =>
    firstValueFrom(
      interceptor.intercept({} as any, { handle: () => of(data) } as any),
    );

  it('URL de R2 → la firma', async () => {
    const url = 'https://bucket.r2.cloudflarestorage.com/img/a.jpg';
    await expect(run(url)).resolves.toBe(`${url}?X-Amz-Signature=ok`);
    expect(minio.signUrl).toHaveBeenCalledWith(url);
  });

  it('URL ajena (no R2) → sin tocar, sin firmar', async () => {
    const url = 'https://cdn.otrolado.com/img/a.jpg';
    await expect(run(url)).resolves.toBe(url);
    expect(minio.signUrl).not.toHaveBeenCalled();
  });

  it('firma URLs de R2 en objetos y arrays anidados', async () => {
    const res: any = await run({
      avatar: 'https://x.r2.cloudflarestorage.com/a.jpg',
      images: [
        'https://x.r2.cloudflarestorage.com/b.jpg',
        'https://cdn.publico.com/c.jpg',
      ],
      name: 'Ana',
    });
    expect(res.avatar).toContain('X-Amz-Signature');
    expect(res.images[0]).toContain('X-Amz-Signature');
    expect(res.images[1]).toBe('https://cdn.publico.com/c.jpg'); // ajena intacta
    expect(res.name).toBe('Ana');
  });

  it('null y números pasan sin tocar', async () => {
    await expect(run({ a: null, b: 42 })).resolves.toEqual({ a: null, b: 42 });
  });
});
