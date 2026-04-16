import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = config.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET no está definida en el archivo .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Token inválido o incompleto');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { 
        id: true,       // Cambiamos sub por id para mayor claridad
        isActive: true, 
        role: true      // Asegurémonos de traer el rol real de la DB por seguridad
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tu cuenta ha sido desactivada');
    }

    // LOG DE DEPURACIÓN (Míralo en la terminal de tu backend)
    console.log('--- JWT VALIDATE SUCCESS ---');
    console.log('Payload Role:', payload.role);
    console.log('DB User Role:', user.role);

    // Devolvemos el objeto que NestJS pondrá en request.user
   // Devolvemos el objeto que NestJS pondrá en request.user
    return {
      userId: user.id, // <--- Volvemos a llamarlo userId para mantener compatibilidad
      id: user.id,     // <--- Dejamos id también por si acaso (no molesta)
      email: payload.email,
      role: user.role, 
    };
  }
}
