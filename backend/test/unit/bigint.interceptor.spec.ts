/**
 * UNIT — BigintInterceptor.
 * Serializa TODA respuesta: bigint→string (JSON no soporta bigint → si no,
 * crash), Date→ISO, recursivo en objetos/arrays. Toda la API pasa por aquí.
 */
import { of, firstValueFrom } from 'rxjs';
import { BigintInterceptor } from '../../src/common/interceptors/bigint.interceptor.js';

describe('BigintInterceptor (unit)', () => {
  const interceptor = new BigintInterceptor();
  const run = (data: unknown) =>
    firstValueFrom(
      interceptor.intercept({} as any, { handle: () => of(data) } as any),
    );

  it('bigint → string', async () => {
    await expect(run(123n)).resolves.toBe('123');
  });

  it('Date → ISO string (no {} vacío)', async () => {
    const d = new Date('2026-06-24T00:00:00.000Z');
    await expect(run(d)).resolves.toBe('2026-06-24T00:00:00.000Z');
  });

  it('recursivo en objetos y arrays anidados', async () => {
    const res: any = await run({
      id: 7n,
      nested: { count: 99n, when: new Date('2026-01-01T00:00:00.000Z') },
      list: [1n, 2n],
    });
    expect(res).toEqual({
      id: '7',
      nested: { count: '99', when: '2026-01-01T00:00:00.000Z' },
      list: ['1', '2'],
    });
  });

  it('valores normales y null pasan sin tocar', async () => {
    await expect(run({ a: 'x', b: 3, c: null, d: true })).resolves.toEqual({
      a: 'x',
      b: 3,
      c: null,
      d: true,
    });
  });
});
