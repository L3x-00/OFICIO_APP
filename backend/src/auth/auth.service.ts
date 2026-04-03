import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ── REGISTRO DE USUARIO NORMAL ──────────────────────────
  async registerUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (exists) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'USUARIO',
      },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  // ── LOGIN ────────────────────────────────────────────────
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Incluir datos del usuario para que Flutter los guarde localmente
    return {
      ...tokens,
      firstName: user.firstName,
      lastName:  user.lastName,
      phone:     user.phone,
      avatarUrl: user.avatarUrl,
    };
  }

  // ── GET ME (perfil completo del usuario autenticado) ─────
  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:        true,
        email:     true,
        firstName: true,
        lastName:  true,
        phone:     true,
        avatarUrl: true,
        role:      true,
        provider: {
          select: {
            id:           true,
            businessName: true,
            isVerified:   true,
            isVisible:    true,
            availability: true,
            subscription: {
              select: { plan: true, status: true, endDate: true },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return user;
  }

  // ── REFRESH TOKEN ────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Token expirado');
      }

      await this.prisma.refreshToken.delete({ where: { token: refreshToken } });

      return this.generateTokens(
        storedToken.user.id,
        storedToken.user.email,
        storedToken.user.role,
      );
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }

  // ── LOGOUT ──────────────────────────────────────────────
  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { message: 'Sesión cerrada' };
  }

  // ── HELPER: GENERAR TOKENS ───────────────────────────────
  private async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret:    this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:    this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken, userId, role };
  }
}
