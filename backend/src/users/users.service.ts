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
        type:               true,
        verificationStatus: true,
        isVerified:         true,
        trustStatus:        true,
        isTrusted:          true,
        createdAt:          true,
        phone:              true,
        whatsapp:           true,
        description:        true,
        dni:                true,
        ruc:                true,
        nombreComercial:    true,
        razonSocial:        true,
        hasDelivery:        true,
        plenaCoordinacion:  true,
        scheduleJson:       true,
        address:            true,
        providerCategories: {
          select: {
            category: {
              select: { id: true, name: true, slug: true, parentId: true, parent: { select: { id: true, name: true } } },
            },
          },
        },
        notifications: {
          where:   { isRead: false },
          select:  { id: true, type: true, message: true, sentAt: true },
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
        trustValidations: {
          where:   { status: 'REJECTED' },
          select:  { rejectionReason: true, reviewedAt: true },
          orderBy: { reviewedAt: 'desc' },
          take: 1,
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
        type:                p.type,
        verificationStatus:  p.verificationStatus,
        isVerified:          p.isVerified,
        trustStatus:         p.trustStatus,
        isTrusted:           p.isTrusted,
        trustRejectionReason: p.trustValidations[0]?.rejectionReason ?? null,
        createdAt:           p.createdAt,
        phone:               p.phone,
        whatsapp:            p.whatsapp,
        description:         p.description,
        dni:                 p.dni,
        ruc:                 p.ruc,
        nombreComercial:     p.nombreComercial,
        razonSocial:         p.razonSocial,
        hasDelivery:         p.hasDelivery,
        plenaCoordinacion:   p.plenaCoordinacion,
        scheduleJson:        p.scheduleJson,
        address:             p.address,
        categories:          p.providerCategories.map(pc => ({
          id:               pc.category.id,
          name:             pc.category.name,
          slug:             pc.category.slug,
          parentId:         pc.category.parentId,
          parentName:       pc.category.parent?.name ?? null,
        })),
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
        department: true, province: true, district: true,
        // coins se incluye para que el contador de monedas del header
        // de la pantalla principal se actualice tras un referral.
        coins: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  // ── ACTUALIZAR PERFIL ────────────────────────────────────
  async updateProfile(
    userId: number,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      department?: string;
      province?: string;
      district?: string;
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName  !== undefined && { firstName:  data.firstName  }),
        ...(data.lastName   !== undefined && { lastName:   data.lastName   }),
        ...(data.phone      !== undefined && { phone:      data.phone      }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.province   !== undefined && { province:   data.province   }),
        ...(data.district   !== undefined && { district:   data.district   }),
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatarUrl: true, role: true,
        department: true, province: true, district: true,
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

  // ── GUARDAR TOKEN FCM ────────────────────────────────────
  //
  // El token FCM es UNIQUE en BD (migración 20260518100000). Si otro
  // user tenía este token (cambio de cuenta en mismo device sin que el
  // clearToken anterior haya alcanzado a correr), lo "robamos" en
  // una transacción: NULL en el viejo + SET en el nuevo. Evita el
  // leak de push notifications cross-user.
  async saveFcmToken(userId: number, token: string) {
    await this.prisma.$transaction(async (tx) => {
      // 1. Liberar el token de cualquier otro user que lo tuviera.
      await tx.user.updateMany({
        where: { fcmToken: token, id: { not: userId } },
        data:  { fcmToken: null },
      });
      // 2. Asignarlo al user actual.
      await tx.user.update({
        where: { id: userId },
        data:  { fcmToken: token },
      });
    });
    return { success: true };
  }

  // ── BORRAR TOKEN FCM (logout) ────────────────────────────
  async clearFcmToken(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data:  { fcmToken: null },
    });
    return { success: true };
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
