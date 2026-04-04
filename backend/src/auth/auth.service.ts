import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
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

  // ── REGISTRO DE PROVEEDOR ────────────────────────────────
  async registerProvider(
    userId: number,
    data: {
      businessName: string;
      phone: string;
      dni?: string;
      description?: string;
      address?: string;
      type: 'OFICIO' | 'NEGOCIO';
      categoryId?: number;
      localityId?: number;
    },
  ) {
    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    // Verificar que no tenga ya un perfil de proveedor
    const existing = await this.prisma.provider.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Este usuario ya tiene un perfil de proveedor');

    // Validar unicidad del DNI si se proporciona
    if (data.dni?.trim()) {
      const dniTaken = await this.prisma.provider.findUnique({
        where: { dni: data.dni.trim() },
      });
      if (dniTaken) {
        throw new ConflictException('Este DNI ya está registrado en la plataforma');
      }
    }

    // Valores por defecto para categoryId y localityId
    const categoryId = data.categoryId ?? 1;
    const localityId = data.localityId ?? 1;

    const provider = await this.prisma.$transaction(async (tx) => {
      // Actualizar rol del usuario a PROVEEDOR
      await tx.user.update({
        where: { id: userId },
        data: { role: 'PROVEEDOR' },
      });

      // Crear proveedor
      const newProvider = await tx.provider.create({
        data: {
          userId,
          businessName: data.businessName,
          phone:        data.phone,
          dni:          data.dni?.trim() || null,
          description:  data.description || null,
          address:      data.address || null,
          type:         data.type,
          categoryId,
          localityId,
          scheduleJson: {
            lun: '8:00-18:00', mar: '8:00-18:00',
            mie: '8:00-18:00', jue: '8:00-18:00',
            vie: '8:00-18:00', sab: '9:00-13:00',
            dom: 'Cerrado',
          },
        },
      });

      // Crear suscripción de gracia por 2 meses
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2);
      await tx.subscription.create({
        data: {
          providerId: newProvider.id,
          plan:       'GRATIS',
          status:     'GRACIA',
          endDate,
        },
      });

      return newProvider;
    });

    return { success: true, providerId: provider.id, role: 'PROVEEDOR' };
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
