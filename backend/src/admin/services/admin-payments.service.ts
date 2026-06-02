import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EventsGateway } from '../../events/events.gateway.js';
import { PushNotificationsService } from '../../firebase/push-notifications.service.js';
import { planToPriority } from './admin-shared.js';

/**
 * Solicitudes de plan (pagos por Yape) y su aprobación/rechazo. Extraído del
 * god object AdminService — AdminService delega aquí vía Facade; el
 * controller no cambia.
 *
 * El proveedor sube su comprobante de Yape al crear el PlanRequest (flujo
 * fuera de admin); aquí el ADMIN valida el pago y activa/rechaza el plan,
 * persiste la notificación y avisa en tiempo real + push.
 */
@Injectable()
export class AdminPaymentsService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private push: PushNotificationsService,
  ) {}

  async getPlanRequests(status?: string) {
    return this.prisma.planRequest.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            type: true,
            phone: true,
            subscription: { select: { plan: true, status: true } },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async approvePlanRequest(requestId: number) {
    const req = await this.prisma.planRequest.findUnique({
      where: { id: requestId },
      include: { provider: { include: { subscription: true, user: true } } },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.status !== 'PENDIENTE')
      throw new BadRequestException('La solicitud ya fue procesada');

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const priority = planToPriority(req.plan, 'ACTIVA');

    // Update or create subscription + actualizar prioridad (transacción atómica)
    await this.prisma.$transaction(async (tx) => {
      if (req.provider.subscription) {
        await tx.subscription.update({
          where: { providerId: req.providerId },
          data: { plan: req.plan, status: 'ACTIVA', endDate },
        });
      } else {
        await tx.subscription.create({
          data: {
            providerId: req.providerId,
            plan: req.plan,
            status: 'ACTIVA',
            endDate,
          },
        });
      }

      // Subir en el ranking de listado
      await tx.provider.update({
        where: { id: req.providerId },
        data: { planPriority: priority },
      });

      // Mark request approved
      await tx.planRequest.update({
        where: { id: requestId },
        data: { status: 'APROBADO' },
      });
    });

    // Persist notification for provider
    await this.prisma.adminNotification.create({
      data: {
        providerId: req.providerId,
        type: 'PLAN_APROBADO',
        title: `¡Plan ${req.plan} aprobado!`,
        message: `¡Felicidades! Tu solicitud para el plan ${req.plan} ha sido aprobada. Ya puedes disfrutar de todos los beneficios.`,
        isRead: false,
        targetUserId: req.provider.userId,
        targetProfileType: req.provider.type,
      },
    });

    // Real-time notification to provider
    this.eventsGateway.emitNotification({
      type: 'PLAN_APROBADO',
      title: `¡Plan ${req.plan} aprobado!`,
      body: `¡Felicidades! Tu plan ${req.plan} ha sido aprobado.`,
      targetUserId: req.provider.userId,
      targetProfileType: req.provider.type,
    });
    this.eventsGateway.emitAdminEvent('PLAN_APPROVED', {
      requestId,
      plan: req.plan,
    });

    this.push.sendToUser(
      req.provider.userId,
      `¡Plan ${req.plan} aprobado!`,
      `¡Felicidades! Tu plan ${req.plan} ha sido aprobado. Ya disfrutas de todos sus beneficios.`,
      { type: 'PLAN_APROBADO', plan: req.plan },
    );

    return { success: true };
  }

  async rejectPlanRequest(requestId: number, reason?: string) {
    const req = await this.prisma.planRequest.findUnique({
      where: { id: requestId },
      include: {
        provider: { select: { userId: true, businessName: true, type: true } },
      },
    });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.status !== 'PENDIENTE')
      throw new BadRequestException('La solicitud ya fue procesada');

    await this.prisma.planRequest.update({
      where: { id: requestId },
      data: { status: 'RECHAZADO', reason: reason ?? null },
    });

    const msg = reason
      ? `Tu solicitud de plan ${req.plan} fue rechazada. Motivo: ${reason}`
      : `Tu solicitud de plan ${req.plan} fue rechazada.`;

    await this.prisma.adminNotification.create({
      data: {
        providerId: req.providerId,
        type: 'PLAN_RECHAZADO',
        title: `Solicitud de plan ${req.plan} rechazada`,
        message: msg,
        isRead: false,
        targetUserId: req.provider.userId,
        targetProfileType: req.provider.type,
      },
    });

    this.eventsGateway.emitNotification({
      type: 'PLAN_RECHAZADO',
      title: 'Solicitud rechazada',
      body: msg,
      targetUserId: req.provider.userId,
      targetProfileType: req.provider.type,
    });

    this.push.sendToUser(
      req.provider.userId,
      `Solicitud de plan ${req.plan} rechazada`,
      msg,
      { type: 'PLAN_RECHAZADO', plan: req.plan },
    );

    return { success: true };
  }
}
