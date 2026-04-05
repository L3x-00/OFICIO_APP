import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Devuelve si el usuario tiene perfil de proveedor y su estado actual
  async getMyProviderStatus(userId: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      select: {
        id: true,
        businessName: true,
        providerType: true,
        verificationStatus: true,
        isVerified: true,
        createdAt: true,
        notifications: {
          where: { isRead: false },
          select: { id: true, type: true, message: true, sentAt: true },
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!provider) {
      return { hasProvider: false };
    }

    return {
      hasProvider: true,
      providerId: provider.id,
      businessName: provider.businessName,
      providerType: provider.providerType,
      verificationStatus: provider.verificationStatus,
      isVerified: provider.isVerified,
      createdAt: provider.createdAt,
      pendingNotifications: provider.notifications,
    };
  }
}
