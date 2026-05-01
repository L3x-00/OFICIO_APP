import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { PushNotificationsService } from '../firebase/push-notifications.service.js';

const INVITER_REWARD_COINS = 50;
const INVITED_WELCOME_COINS = 5;

const PLAN_COSTS: Record<string, number> = {
  ESTANDAR: 500,
  PREMIUM:  1000,
};

const PLAN_DURATION_MONTHS: Record<string, number> = {
  ESTANDAR: 1,
  PREMIUM:  2,
};

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private push: PushNotificationsService,
  ) {}

  // ── CÓDIGO DE REFERIDO ─────────────────────────────────────

  /** Devuelve el código del usuario; lo crea bajo demanda. */
  async getMyCode(userId: number) {
    let code = await this.prisma.referralCode.findUnique({ where: { userId } });
    if (!code) {
      code = await this.prisma.referralCode.create({
        data: { userId, code: await this.generateUniqueCode(userId) },
      });
    }
    return code;
  }

  /** Genera un código de 8 caracteres único en la BD. */
  private async generateUniqueCode(userId: number): Promise<string> {
    const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusión
    for (let attempt = 0; attempt < 8; attempt++) {
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
      const exists = await this.prisma.referralCode.findUnique({ where: { code } });
      if (!exists) return code;
    }
    // Fallback determinístico si la lotería falla 8 veces (improbable)
    return `USR${userId}${Date.now().toString(36).toUpperCase()}`.slice(0, 8);
  }

  // ── ESTADÍSTICAS DEL USUARIO ───────────────────────────────

  async getMyStats(userId: number) {
    const [code, user, history, totalSent, totalApproved] = await Promise.all([
      this.getMyCode(userId),
      this.prisma.user.findUnique({ where: { id: userId }, select: { coins: true } }),
      this.prisma.referral.findMany({
        where: { inviterId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          invitedUser: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          invitedProvider: {
            select: { id: true, businessName: true, type: true, verificationStatus: true },
          },
        },
      }),
      this.prisma.referral.count({ where: { inviterId: userId } }),
      this.prisma.referral.count({ where: { inviterId: userId, status: 'APPROVED' } }),
    ]);

    return {
      code: code.code,
      coins: user?.coins ?? 0,
      totalInvited: totalSent,
      approvedInvited: totalApproved,
      pendingInvited: totalSent - totalApproved,
      history,
    };
  }

  // ── APLICAR CÓDIGO ─────────────────────────────────────────

  /** El usuario actual usa un código de referido. */
  async applyCode(userId: number, code: string) {
    if (!code || code.trim().length === 0) {
      throw new BadRequestException('Código requerido');
    }
    const trimmed = code.trim().toUpperCase();

    const owner = await this.prisma.referralCode.findUnique({
      where: { code: trimmed },
    });
    if (!owner) throw new NotFoundException('Código de referido no válido');
    if (owner.userId === userId) {
      throw new BadRequestException('No puedes aplicar tu propio código');
    }

    const existing = await this.prisma.referral.findUnique({
      where: { invitedUserId: userId },
    });
    if (existing) {
      throw new ConflictException('Ya aplicaste un código de referido anteriormente');
    }

    const referral = await this.prisma.$transaction(async (tx) => {
      const r = await tx.referral.create({
        data: {
          inviterId:     owner.userId,
          invitedUserId: userId,
          status:        'PENDING',
        },
      });
      await tx.referralCode.update({
        where: { userId: owner.userId },
        data:  { totalInvites: { increment: 1 } },
      });
      return r;
    });

    // Notificar al inviter en tiempo real
    this.events.emitNotification({
      type:         'REFERRAL_PENDING',
      title:        'Nuevo invitado pendiente',
      body:         'Alguien aplicó tu código. Las monedas se entregarán al aprobarse su perfil.',
      targetUserId: owner.userId,
    });

    return { success: true, referralId: referral.id };
  }

  // ── ENGANCHE CON LA APROBACIÓN DE UN PROVEEDOR ─────────────

  /**
   * Llamado desde admin.service tras aprobar un proveedor.
   * Si el dueño del provider tiene un Referral PENDING, lo marca APPROVED,
   * vincula el provider, entrega monedas al inviter y al invitado, y emite
   * notificaciones (websocket + push).
   */
  async onProviderApproved(providerId: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        userId: true,
        businessName: true,
        type: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (!provider) return null;

    const referral = await this.prisma.referral.findUnique({
      where: { invitedUserId: provider.userId },
      include: {
        inviter: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!referral || referral.status !== 'PENDING') return null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const ref = await tx.referral.update({
        where: { id: referral.id },
        data: {
          status: 'APPROVED',
          coinsAwarded: INVITER_REWARD_COINS,
          invitedCoinsAwarded: INVITED_WELCOME_COINS,
          invitedProviderId: providerId,
          approvedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: referral.inviterId },
        data:  { coins: { increment: INVITER_REWARD_COINS } },
      });
      await tx.user.update({
        where: { id: referral.invitedUserId },
        data:  { coins: { increment: INVITED_WELCOME_COINS } },
      });
      await tx.referralCode.update({
        where: { userId: referral.inviterId },
        data:  { successfulInvites: { increment: 1 } },
      });
      return ref;
    });

    const invitedName =
      provider.user?.firstName && provider.user?.lastName
        ? `${provider.user.firstName} ${provider.user.lastName}`
        : provider.businessName;

    // Inviter
    this.events.emitNotification({
      type:         'REFERRAL_APPROVED',
      title:        '¡Invitación aceptada!',
      body:         `El perfil de ${invitedName} ha sido aprobado. Has ganado ${INVITER_REWARD_COINS} monedas.`,
      targetUserId: referral.inviterId,
    });
    this.push.sendToUser(
      referral.inviterId,
      '¡Invitación aceptada! 🎉',
      `Has ganado ${INVITER_REWARD_COINS} monedas porque ${invitedName} fue aprobado.`,
      { type: 'REFERRAL_APPROVED', referralId: String(updated.id) },
    );

    // Invitado
    this.events.emitNotification({
      type:         'REFERRAL_WELCOME',
      title:        '¡Perfil aprobado!',
      body:         `Tu perfil ha sido aprobado. Has recibido ${INVITED_WELCOME_COINS} monedas de bienvenida.`,
      targetUserId: referral.invitedUserId,
    });
    this.push.sendToUser(
      referral.invitedUserId,
      'Bienvenido a OficioApp 🪙',
      `Tu perfil fue aprobado y recibiste ${INVITED_WELCOME_COINS} monedas de bienvenida.`,
      { type: 'REFERRAL_WELCOME' },
    );

    // Admin
    const inviterFullName = referral.inviter
      ? `${referral.inviter.firstName} ${referral.inviter.lastName}`
      : `Usuario #${referral.inviterId}`;
    this.events.emitNotification({
      type:       'REFERRAL_ADMIN_APPROVED',
      title:      'Nuevo referido aprobado',
      body:       `${inviterFullName} ha referido exitosamente a ${invitedName}.`,
      targetRole: 'ADMIN',
    });

    return updated;
  }

  // ── RECOMPENSAS (catálogo público) ─────────────────────────

  async listActiveRewards() {
    return this.prisma.referralReward.findMany({
      where: { isActive: true },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            whatsapp: true,
            averageRating: true,
            type: true,
            category: { select: { name: true } },
            images: { select: { url: true, isCover: true, order: true } },
          },
        },
      },
      orderBy: [{ coinsCost: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // ── CANJE DE MONEDAS ───────────────────────────────────────

  async redeem(
    userId: number,
    payload: { rewardId?: number; plan?: string },
  ) {
    const { rewardId, plan } = payload;
    if (!rewardId && !plan) {
      throw new BadRequestException('Debes elegir una recompensa o un plan');
    }
    if (rewardId && plan) {
      throw new BadRequestException('Solo puedes canjear una cosa a la vez');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // ── Canje de plan ─────────────────────────────────────
    if (plan) {
      const upper = plan.toUpperCase();
      const cost = PLAN_COSTS[upper];
      if (!cost) throw new BadRequestException('Plan no canjeable');
      if (user.coins < cost) {
        throw new BadRequestException(
          `Necesitas ${cost} monedas y solo tienes ${user.coins}.`,
        );
      }

      const provider = await this.prisma.provider.findFirst({
        where: { userId, verificationStatus: 'APROBADO' },
        include: { subscription: true },
      });
      if (!provider) {
        throw new BadRequestException(
          'Solo proveedores aprobados pueden canjear monedas por planes',
        );
      }

      const months = PLAN_DURATION_MONTHS[upper] ?? 1;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      const redemption = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data:  { coins: { decrement: cost } },
        });
        if (provider.subscription) {
          await tx.subscription.update({
            where: { providerId: provider.id },
            data:  { plan: upper as any, status: 'ACTIVA', endDate },
          });
        } else {
          await tx.subscription.create({
            data: {
              providerId: provider.id,
              plan:       upper as any,
              status:     'ACTIVA',
              endDate,
            },
          });
        }
        return tx.coinRedemption.create({
          data: { userId, plan: upper, coinsSpent: cost, status: 'COMPLETED' },
        });
      });

      this.events.emitNotification({
        type:         'PLAN_REDEEMED',
        title:        '¡Plan activado!',
        body:         `Has canjeado ${cost} monedas por el plan ${upper} (${months} ${months === 1 ? 'mes' : 'meses'}).`,
        targetUserId: userId,
      });

      return { success: true, redemption, planActivated: upper, months };
    }

    // ── Canje de recompensa ────────────────────────────────
    const reward = await this.prisma.referralReward.findUnique({
      where: { id: rewardId! },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            whatsapp: true,
          },
        },
      },
    });
    if (!reward) throw new NotFoundException('Recompensa no encontrada');
    if (!reward.isActive) {
      throw new BadRequestException('Esta recompensa ya no está disponible');
    }
    if (user.coins < reward.coinsCost) {
      throw new BadRequestException(
        `Necesitas ${reward.coinsCost} monedas y solo tienes ${user.coins}.`,
      );
    }

    const redemption = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data:  { coins: { decrement: reward.coinsCost } },
      });
      return tx.coinRedemption.create({
        data: {
          userId,
          rewardId: reward.id,
          coinsSpent: reward.coinsCost,
          status: 'PENDING',  // proveedor debe coordinar entrega
        },
      });
    });

    this.events.emitNotification({
      type:         'REWARD_REDEEMED',
      title:        '¡Canje exitoso!',
      body:         `Has canjeado "${reward.title}". Contacta a ${reward.provider.businessName} para coordinar.`,
      targetUserId: userId,
    });

    return {
      success: true,
      redemption,
      reward: {
        title:       reward.title,
        description: reward.description,
        provider:    reward.provider,
      },
    };
  }

  async listMyRedemptions(userId: number) {
    return this.prisma.coinRedemption.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reward: {
          include: {
            provider: {
              select: { id: true, businessName: true, phone: true, whatsapp: true },
            },
          },
        },
      },
    });
  }

  // ── ADMIN: ESTADÍSTICAS ────────────────────────────────────

  async getAdminStats() {
    const [total, approved, totalCoinsAgg, topInviters, monthly] = await Promise.all([
      this.prisma.referral.count(),
      this.prisma.referral.count({ where: { status: 'APPROVED' } }),
      this.prisma.referral.aggregate({
        _sum: { coinsAwarded: true, invitedCoinsAwarded: true },
      }),
      this.prisma.referralCode.findMany({
        orderBy: [{ successfulInvites: 'desc' }, { totalInvites: 'desc' }],
        take: 10,
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, email: true, coins: true,
            },
          },
        },
      }),
      this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month,
               COUNT(*) AS count
          FROM "referrals"
         WHERE "createdAt" > NOW() - INTERVAL '12 months'
         GROUP BY 1
         ORDER BY 1 ASC
      `,
    ]);

    const totalCoins =
      (totalCoinsAgg._sum.coinsAwarded ?? 0) +
      (totalCoinsAgg._sum.invitedCoinsAwarded ?? 0);

    return {
      totalInvitations: total,
      totalApproved:    approved,
      conversionRate:   total === 0 ? 0 : Math.round((approved / total) * 1000) / 10,
      totalCoinsDistributed: totalCoins,
      topInviters: topInviters.map((c) => ({
        userId:           c.user.id,
        firstName:        c.user.firstName,
        lastName:         c.user.lastName,
        email:            c.user.email,
        code:             c.code,
        totalInvites:     c.totalInvites,
        successfulInvites: c.successfulInvites,
        coinsBalance:     c.user.coins,
      })),
      monthlyInvites: monthly.map((m) => ({
        month: m.month,
        count: Number(m.count),
      })),
    };
  }

  // ── ADMIN: CRUD DE RECOMPENSAS ─────────────────────────────

  async listAllRewards() {
    return this.prisma.referralReward.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: { id: true, businessName: true, type: true, phone: true },
        },
        _count: { select: { redemptions: true } },
      },
    });
  }

  async createReward(data: {
    providerId: number;
    title: string;
    description: string;
    coinsCost: number;
  }) {
    if (!data.title?.trim() || !data.description?.trim()) {
      throw new BadRequestException('Título y descripción son obligatorios');
    }
    if (!Number.isFinite(data.coinsCost) || data.coinsCost <= 0) {
      throw new BadRequestException('coinsCost debe ser un entero positivo');
    }
    const provider = await this.prisma.provider.findUnique({
      where: { id: data.providerId },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    if (provider.verificationStatus !== 'APROBADO') {
      throw new BadRequestException(
        'Solo proveedores APROBADOS pueden ofrecer recompensas',
      );
    }
    return this.prisma.referralReward.create({ data });
  }

  async updateReward(
    id: number,
    data: Partial<{
      title: string;
      description: string;
      coinsCost: number;
      isActive: boolean;
    }>,
  ) {
    const exists = await this.prisma.referralReward.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Recompensa no encontrada');
    return this.prisma.referralReward.update({ where: { id }, data });
  }

  async deleteReward(id: number) {
    const exists = await this.prisma.referralReward.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Recompensa no encontrada');
    await this.prisma.referralReward.delete({ where: { id } });
    return { success: true };
  }
}
