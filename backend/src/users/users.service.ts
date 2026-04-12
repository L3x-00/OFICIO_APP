import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { EventsGateway } from '../events/events.gateway.js';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  // Devuelve TODOS los perfiles de proveedor del usuario (OFICIO y/o NEGOCIO)
  async getMyProviderStatus(userId: number) {
    const providers = await this.prisma.provider.findMany({
      where: { userId },
      select: {
        id:                 true,
        businessName:       true,
        type:               true, // OFICIO | NEGOCIO — tipo real de registro
        verificationStatus: true,
        isVerified:         true,
        createdAt:          true,
        notifications: {
          where:   { isRead: false },
          select:  { id: true, type: true, message: true, sentAt: true },
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
      },
    });

    if (providers.length === 0) {
      return { hasProvider: false, profiles: [] };
    }

    return {
      hasProvider: true,
      profiles: providers.map((p) => ({
        providerId:          p.id,
        businessName:        p.businessName,
        type:                p.type,           // 'OFICIO' | 'NEGOCIO'
        verificationStatus:  p.verificationStatus,
        isVerified:          p.isVerified,
        createdAt:           p.createdAt,
        pendingNotifications: p.notifications,
      })),
    };
  }

  // ── OBTENER PERFIL PROPIO ────────────────────────────────
  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatarUrl: true, role: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  // ── ACTUALIZAR PERFIL ────────────────────────────────────
  async updateProfile(
    userId: number,
    data: { firstName?: string; lastName?: string; phone?: string },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName  !== undefined && { lastName:  data.lastName  }),
        ...(data.phone     !== undefined && { phone:     data.phone     }),
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatarUrl: true, role: true,
      },
    });
    return user;
  }

  // ── ACTUALIZAR FOTO DE PERFIL ────────────────────────────
  async updateProfilePicture(userId: number, avatarUrl: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatarUrl: true, role: true,
      },
    });
    return user;
  }

  // ── CAMBIAR CONTRASEÑA (usuario autenticado) ─────────────
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Invalidar todos los refresh tokens activos
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    // Notificar al usuario
    this.eventsGateway.emitNotification({
      type: 'PASSWORD_CHANGED',
      title: 'Contraseña actualizada',
      body: 'Cambiaste tu contraseña exitosamente. Si no fuiste tú, contacta a soporte.',
      targetUserId: userId,
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}
