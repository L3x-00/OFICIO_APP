/**
 * Mock determinístico de `JwtService` de @nestjs/jwt.
 *
 * `sign(payload, opts)` codifica el payload + opts en base64 para que
 * los tests puedan inspeccionar qué se firmó. `verify` lo decodifica.
 * No es JWT real — es solo una huella determinística suficiente para
 * validar la lógica de generación/verificación del AuthService sin
 * importar el algoritmo HS256 real.
 */
export type JwtMock = {
  sign: jest.Mock;
  verify: jest.Mock;
};

export function createJwtMock(): JwtMock {
  const sign = jest.fn(
    (payload: object, opts?: { secret?: string; expiresIn?: string }) => {
      const blob = JSON.stringify({ payload, opts });
      return Buffer.from(blob).toString('base64url');
    },
  );
  const verify = jest.fn((token: string, _opts?: { secret?: string }) => {
    try {
      const decoded = JSON.parse(
        Buffer.from(token, 'base64url').toString('utf8'),
      );
      return decoded.payload;
    } catch {
      throw new Error('invalid token');
    }
  });
  return { sign, verify };
}
