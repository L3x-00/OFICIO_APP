import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { PushNotificationsService } from '../firebase/push-notifications.service.js';
import { SubmitYapeDto } from './dto/submit-yape.dto.js';

const YapePaymentStatus = {
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

const PLAN_PRIORITY: Record<string, number> = {
  PREMIUM:  1,
  ESTANDAR: 2,
  GRATIS:   3,
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private push:   PushNotificationsService,
  ) {}

  /**
   * Expira suscripciones vencidas. Corre cada hora:
   *
   * - ESTANDAR/PREMIUM en GRACIA o ACTIVA con endDate pasada → degrada a
   *   GRATIS + status VENCIDA. El proveedor pierde los beneficios de pago
   *   y queda en plan gratuito hasta que pague una nueva suscripción.
   *
   * - Ajusta `planPriority` para que el proveedor caiga al final del
   *   ranking público de listado.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.subscription.findMany({
      where: {
        endDate: { lt: now },
        status:  { in: ['GRACIA', 'ACTIVA'] },
        plan:    { in: ['ESTANDAR', 'PREMIUM'] },
      },
      select: { id: true, providerId: true },
    });
    if (expired.length === 0) return;

    await this.prisma.$transaction([
      this.prisma.subscription.updateMany({
        where: { id: { in: expired.map(s => s.id) } },
        data:  { plan: 'GRATIS', status: 'VENCIDA' },
      }),
      this.prisma.provider.updateMany({
        where: { id: { in: expired.map(s => s.providerId) } },
        data:  { planPriority: PLAN_PRIORITY.GRATIS },
      }),
    ]);
    this.logger.log(`[subs-cron] ${expired.length} suscripciones expiradas → GRATIS`);
  }

  // ── PROVEEDOR: enviar comprobante ───────────────────────────
  async submitYapePayment(userId: number, dto: SubmitYapeDto) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId, isVisible: true },
      select: { id: true },
    });
    if (!provider) throw new ForbiddenException('No tienes un perfil de proveedor activo');

    // Limitar a 1 pago PENDING por proveedor a la vez
    const pending = await this.prisma.yapePayment.findFirst({
      where: { providerId: provider.id, status: YapePaymentStatus.PENDING },
    });
    if (pending) throw new BadRequestException('Ya tienes un pago pendiente de validación');

    const payment = await this.prisma.yapePayment.create({
      data: {
        providerId:       provider.id,
        plan:             dto.plan as any,
        amount:           dto.amount,
        voucherUrl:       dto.voucherUrl,
        verificationCode: dto.verificationCode,
        note:             dto.note,
      },
    });

    // Notificar al admin: broadcast notification + adminEvent
    this.events.emitNotification({
      type:        'NEW_YAPE_PAYMENT',
      title:       'Nuevo pago Yape',
      body:        `Plan ${dto.plan} · S/ ${dto.amount.toFixed(2)}`,
      targetRole:  'ADMIN',
    });
    this.events.emitAdminEvent('NEW_YAPE_PAYMENT', {
      paymentId:  payment.id,
      plan:       dto.plan,
      amount:     dto.amount,
    });

    return payment;
  }

  // ── PROVEEDOR: historial ─────────────────────────────────────
  // Antes filtraba `isVisible: true` y solo tomaba el primer provider
  // del usuario — eso vaciaba el historial para perfiles PENDIENTE o
  // RECHAZADO y para usuarios con doble perfil OFICIO+NEGOCIO. Ahora se
  // listan los pagos de TODOS los provider IDs asociados al usuario.
  async getMyPayments(userId: number) {
    const providers = await this.prisma.provider.findMany({
      where: { userId },
      select: { id: true },
    });
    if (providers.length === 0) return [];

    return this.prisma.yapePayment.findMany({
      where: { providerId: { in: providers.map((p) => p.id) } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── ADMIN: listar pagos ──────────────────────────────────────
  async adminList(status?: string) {
    return this.prisma.yapePayment.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            type: true,
            user: { select: { firstName: true, lastName: true, email: true } },
            subscription: { select: { plan: true, status: true, endDate: true } },
          },
        },
      },
    });
  }

  // ── ADMIN: aprobar ───────────────────────────────────────────
  async approvePayment(paymentId: number, adminId: number) {
    const payment = await this.prisma.yapePayment.findUnique({
      where: { id: paymentId },
      include: {
        provider: {
          select: {
            userId: true,
            type:   true, // necesario para `targetProfileType` del push
            subscription: { select: { id: true } },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== YapePaymentStatus.PENDING)
      throw new BadRequestException('Este pago ya fue procesado');

    const priority = PLAN_PRIORITY[payment.plan] ?? 4;
    const endDate  = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    await this.prisma.$transaction(async (tx) => {
      // 1. Marcar pago aprobado
      await tx.yapePayment.update({
        where: { id: paymentId },
        data: {
          status:             YapePaymentStatus.APPROVED,
          reviewedAt:         new Date(),
          reviewedByAdminId:  adminId,
        },
      });

      // 2. Activar / actualizar suscripción
      if (payment.provider.subscription) {
        await tx.subscription.update({
          where: { providerId: payment.providerId },
          data: { plan: payment.plan as any, status: 'ACTIVA', endDate },
        });
      } else {
        await tx.subscription.create({
          data: {
            providerId: payment.providerId,
            plan:       payment.plan as any,
            status:     'ACTIVA' as any,
            endDate,
            priceUSD:   payment.amount,
          },
        });
      }

      // 3. Actualizar prioridad de ranking
      await tx.provider.update({
        where: { id: payment.providerId },
        data: { planPriority: priority },
      });

      // 4. Registrar en tabla payments histórica
      if (payment.provider.subscription) {
        const sub = await tx.subscription.findUnique({
          where: { providerId: payment.providerId },
          select: { id: true },
        });
        if (sub) {
          await tx.payment.create({
            data: {
              subscriptionId: sub.id,
              amount:         payment.amount,
              currency:       'PEN',
              method:         'yape',
              reference:      payment.verificationCode,
              confirmedAt:    new Date(),
            },
          });
        }
      }
    });

    // 5. Notificar al proveedor — `PLAN_APROBADO` dispara el modal de
    // bienvenida con beneficios del plan en la app. El push asegura
    // que llegue al device aunque la app esté en background/cerrada.
    const planLabel = payment.plan.charAt(0) + payment.plan.slice(1).toLowerCase();
    const title = '¡Pago aprobado con éxito!';
    const body  = `Tu plan ${planLabel} ha sido activado con éxito.`;

    this.events.emitNotification({
      type:         'PLAN_APROBADO',
      title,
      body,
      targetUserId: payment.provider.userId,
      // Plan exacto + tipo de perfil. El cliente usa `plan` para elegir
      // el set de slides del carrousel (ESTANDAR vs PREMIUM).
      targetProfileType: payment.provider.type,
      plan:         payment.plan,
    });

    this.push.sendToUser(
      payment.provider.userId,
      title,
      body,
      { type: 'PLAN_APROBADO', plan: payment.plan },
    );

    return { success: true };
  }

  // ── PROVEEDOR: cancelar plan ─────────────────────────────────
  async cancelPlan(userId: number) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId, isVisible: true },
      select: {
        id: true, businessName: true, type: true,
        subscription: { select: { id: true, plan: true, status: true } },
      },
    });
    if (!provider) throw new NotFoundException('Perfil de proveedor no encontrado');
    if (!provider.subscription || provider.subscription.status !== 'ACTIVA') {
      throw new BadRequestException('No tienes un plan activo que cancelar');
    }

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { providerId: provider.id },
        data: { status: 'CANCELADA', plan: 'GRATIS' },
      }),
      this.prisma.provider.update({
        where: { id: provider.id },
        data: { planPriority: 3 },
      }),
    ]);

    const planLabel = provider.subscription.plan.charAt(0) + provider.subscription.plan.slice(1).toLowerCase();
    this.events.emitNotification({
      type:       'PLAN_CANCELADO',
      title:      'Plan cancelado',
      body:       `${provider.businessName} canceló su plan ${planLabel}.`,
      targetRole: 'ADMIN',
    });
    this.events.emitAdminEvent('PLAN_CANCELADO', {
      providerId:   provider.id,
      businessName: provider.businessName,
      plan:         provider.subscription.plan,
    });

    return { success: true };
  }

  // ── ADMIN: rechazar ──────────────────────────────────────────
  async rejectPayment(paymentId: number, adminId: number, reason?: string) {
    const payment = await this.prisma.yapePayment.findUnique({
      where: { id: paymentId },
      include: {
        provider: { select: { userId: true } },
      },
    });

    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status !== YapePaymentStatus.PENDING)
      throw new BadRequestException('Este pago ya fue procesado');

    await this.prisma.yapePayment.update({
      where: { id: paymentId },
      data: {
        status:             YapePaymentStatus.REJECTED,
        rejectionReason:    reason ?? null,
        reviewedAt:         new Date(),
        reviewedByAdminId:  adminId,
      },
    });

    this.events.emitNotification({
      type:         'PLAN_RECHAZADO' as any,
      title:        'Pago no verificado',
      body:         reason ?? 'Tu comprobante de pago no pudo ser verificado. Contáctanos para más información.',
      targetUserId: payment.provider.userId,
    });

    return { success: true };
  }
}
