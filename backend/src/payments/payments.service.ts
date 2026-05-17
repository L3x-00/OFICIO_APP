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
import { MercadoPagoService } from './mercadopago/mercadopago.service.js';
import type { PaidPlan } from './mercadopago/dto/create-preference.dto.js';

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
            type:   true,
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
      // Marcar al admin como autor de cambios de subscriptions dentro
      // de esta tx — el trigger subscriptions_audit_trg lee este GUC
      // para poblar subscription_audit_log.changedBy.
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${adminId.toString()}, true)`;

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
    const title = '¡Pago aprobado con éxito!';
    const body  = `Tu plan ${planLabel} ha sido activado con éxito.`;

    this.events.emitNotification({
      type:         'PLAN_APROBADO',
      title,
      body,
      targetUserId: payment.provider.userId,
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

    // El usuario inicia su propia cancelación: registramos su userId en
    // el audit log via SET LOCAL — distingue user-driven vs admin-driven
    // vs sistema-cron (que queda NULL).
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId.toString()}, true)`;
      await tx.subscription.update({
        where: { providerId: provider.id },
        data: { status: 'CANCELADA', plan: 'GRATIS' },
      });
      await tx.provider.update({
        where: { id: provider.id },
        data: { planPriority: 3 },
      });
    });

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

    // El reject no cambia subscriptions.status directamente, pero envolvemos
    // en tx + SET LOCAL por consistencia: si alguna lógica futura toca
    // subscriptions desde aquí, el audit log atribuye al admin correcto.
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${adminId.toString()}, true)`;
      await tx.yapePayment.update({
        where: { id: paymentId },
        data: {
          status:             YapePaymentStatus.REJECTED,
          rejectionReason:    reason ?? null,
          reviewedAt:         new Date(),
          reviewedByAdminId:  adminId,
        },
      });
    });

    this.events.emitNotification({
      type:         'PLAN_RECHAZADO' as any,
      title:        'Pago no verificado',
      body:         reason ?? 'Tu comprobante de pago no pudo ser verificado. Contáctanos para más información.',
      targetUserId: payment.provider.userId,
    });

    return { success: true };
  }

  /**
   * Activa una suscripción cuando se recibe un pago aprobado de MercadoPago.
   * Reemplaza el flujo manual de Yape.
   * 
   * Flujo:
   * 1. Busca el provider por userId.
   * 2. Crea o actualiza la suscripción con plan y fecha de expiración.
   * 3. Registra el pago en la tabla payments con el ID real de la suscripción.
   * 4. Actualiza planPriority del provider para el ranking público.
   * 5. Notifica al proveedor (WebSocket + Push) y al admin.
   */
  async activateSubscriptionFromPayment(params: {
    userId: number;
    plan: string; // 'ESTANDAR' | 'PREMIUM'
    /// Identifica a qué perfil aplicar el plan cuando el user tiene
    /// ambos (OFICIO + NEGOCIO). Undefined = pago legacy sin type en
    /// el external_reference; cae al findFirst histórico.
    providerType?: 'OFICIO' | 'NEGOCIO';
    amount: number;
    paymentMethod: string;
    paymentId: string;
    dateApproved: string;
  }) {
    const { userId, plan, providerType, amount, paymentMethod, paymentId, dateApproved } = params;

    // C-05: gate de idempotencia. MP reintenta el mismo webhook si
    // tarda > 22s o falla. Sin esto, cada reintento renovaba endDate
    // (robando días al user) y mandaba otra push notification.
    // Payment.reference @unique también atrapa este caso a nivel BD
    // — defensa en profundidad.
    const existing = await this.prisma.payment.findFirst({
      where: { reference: paymentId },
      select: { id: true },
    });
    if (existing) {
      this.logger.log(`Pago MP ${paymentId} ya procesado — skip (idempotencia)`);
      return;
    }

    // C-03 (refuerzo): validar monto contra catálogo server-side antes
    // de activar nada. Si el cliente hubiera bypasseado el DTO de
    // create-preference, el webhook aún rechaza el pago tampered.
    const validPlans: PaidPlan[] = ['ESTANDAR', 'PREMIUM'];
    if (validPlans.includes(plan as PaidPlan)) {
      const expected = MercadoPagoService.expectedPriceFor(plan as PaidPlan);
      // Tolerancia 1% por redondeo / fees del procesador.
      if (amount < expected * 0.99) {
        this.logger.error(
          `💸 Monto sospechoso: pagado=${amount}, esperado=${expected}, ` +
          `userId=${userId}, plan=${plan}, paymentId=${paymentId}`,
        );
        // No activamos — el admin debe reconciliar manualmente.
        return;
      }
    }

    // 1. Buscar el provider. Si vino providerType, lookup exacto via
    //    @@unique([userId, type]). Si no (legacy), findFirst.
    const provider = providerType
      ? await this.prisma.provider.findUnique({
          where: { userId_type: { userId, type: providerType as any } },
          select: { id: true, businessName: true, type: true },
        })
      : await this.prisma.provider.findFirst({
          where: { userId },
          select: { id: true, businessName: true, type: true },
        });

    if (!provider) {
      this.logger.error(`No se encontró provider para userId=${userId}, type=${providerType ?? 'legacy'}`);
      return;
    }

    // 2. Resolver fechas. A-03: 30 días exactos (en vez de setMonth+1
    //    que pierde días en fin de mes: 31 ene → 28 feb).
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const planPriority = plan === 'PREMIUM' ? 1 : plan === 'ESTANDAR' ? 2 : 4;

    // C-05 + A-04: TODO en una transacción atómica.
    //   - Si llegan 2 webhooks simultáneos, el segundo falla con
    //     P2002 en payment.create (reference @unique) → rollback
    //     limpio, no se duplica nada.
    //   - A-04: en UPDATE de subscription NO tocamos startDate
    //     (preservar fecha original de inicio para analytics).
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.subscription.upsert({
          where: { providerId: provider.id },
          update: {
            plan:   plan as any,
            status: 'ACTIVA',
            endDate,
            // NO actualizar startDate en renovación
          },
          create: {
            providerId: provider.id,
            plan:       plan as any,
            status:     'ACTIVA',
            startDate:  now,
            endDate,
          },
        });

        // El upsert puede crear OR actualizar; necesitamos el id
        // para Payment.subscriptionId.
        const sub = await tx.subscription.findUniqueOrThrow({
          where: { providerId: provider.id },
          select: { id: true },
        });

        await tx.payment.create({
          data: {
            subscriptionId: sub.id,
            amount,
            currency:    'PEN',
            method:      paymentMethod as any,
            reference:   paymentId,   // @unique → idempotencia
            confirmedAt: new Date(dateApproved),
          },
        });

        await tx.provider.update({
          where: { id: provider.id },
          data:  { planPriority },
        });
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Race condition: otro webhook simultáneo ganó la carrera.
        this.logger.log(`Pago MP ${paymentId} ya procesado por race condition — skip`);
        return;
      }
      throw e;
    }

    // 3. Notificaciones (fuera de la tx, no bloquean si fallan).
    const planLabel = plan.charAt(0) + plan.slice(1).toLowerCase();
    const title = '¡Pago aprobado con éxito!';
    const body  = `Tu plan ${planLabel} ha sido activado con éxito.`;

    this.events.emitNotification({
      type:              'PLAN_APROBADO',
      title,
      body,
      targetUserId:      userId,
      targetProfileType: provider.type,
      plan:              plan,
    });

    this.push.sendToUser(userId, title, body, { type: 'PLAN_APROBADO', plan });

    // M-03: admin event correcto (antes usaba NEW_YAPE_PAYMENT — el
    // panel admin mostraba pagos MP como si fueran Yape).
    this.events.emitAdminEvent('NEW_MP_PAYMENT', {
      paymentId,
      plan,
      amount,
      providerId:   provider.id,
      businessName: provider.businessName,
    });

    this.logger.log(`✅ Suscripción activada: providerId=${provider.id}, plan=${plan}`);
  }
}