import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';
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
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

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
  async getMyPayments(userId: number) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId, isVisible: true },
      select: { id: true },
    });
    if (!provider) return [];

    return this.prisma.yapePayment.findMany({
      where: { providerId: provider.id },
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

    // 5. Notificar al proveedor
    const planLabel = payment.plan.charAt(0) + payment.plan.slice(1).toLowerCase();
    this.events.emitNotification({
      type:         'OFFER_ACCEPTED',
      title:        `¡Plan ${planLabel} activado!`,
      body:         `Tu pago fue verificado. Ya tienes acceso a todas las funciones del plan ${planLabel}.`,
      targetUserId: payment.provider.userId,
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
