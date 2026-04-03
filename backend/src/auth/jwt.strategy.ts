import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const jwtSecret = config.get<string>('JWT_SECRET');
    
    // Verificación de seguridad en tiempo de compilación/arranque
    if (!jwtSecret) {
      throw new Error('JWT_SECRET no está definida en el archivo .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // Ahora TypeScript sabe que es un string seguro
    });
  }

  async validate(payload: any) {
    // Validamos que el payload tenga la estructura esperada
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Token inválido o incompleto');
    }

    // El objeto retornado se inyecta en req.user
    return { 
      userId: payload.sub, 
      email: payload.email, 
      role: payload.role 
    };
  }
}
