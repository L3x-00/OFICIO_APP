import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';

/**
 * Helpers compartidos por AuthService (Facade) y los servicios extraídos del
 * god object (registration / account).
 */

export interface TokenDeps {
  jwtService: JwtService;
  config: ConfigService;
  prisma: PrismaService;
}

/**
 * Firma access + refresh token y persiste el refresh en BD (7 días).
 * Recibe las dependencias por parámetro para no duplicar la lógica ni
 * introducir un servicio DI extra. Lo usan login/refresh/social (AuthService)
 * y verifyOtp (AuthRegistrationService).
 */
export async function generateTokens(
  deps: TokenDeps,
  userId: number,
  email: string,
  role: string,
) {
  const { jwtService, config, prisma } = deps;
  const payload = { sub: userId, email, role };

  const accessToken = jwtService.sign(payload, {
    secret: config.get('JWT_SECRET'),
    expiresIn: config.get('JWT_EXPIRES_IN'),
  });

  const refreshToken = jwtService.sign(payload, {
    secret: config.get('JWT_REFRESH_SECRET'),
    expiresIn: config.get('JWT_REFRESH_EXPIRES_IN'),
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId, expiresAt },
  });

  return { accessToken, refreshToken, userId, role };
}
