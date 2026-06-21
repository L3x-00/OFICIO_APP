import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EventsGateway } from '../../events/events.gateway.js';
import { PushNotificationsService } from '../../firebase/push-notifications.service.js';
import { ReferralsService } from '../../referrals/referrals.service.js';
import {
  withCategoryAlias,
  planToPriority,
  clearProvidersCache,
} from './admin-shared.js';

/**
 * Validación de confianza / verificación documental de proveedores.
 * Extraído del god object AdminService — AdminService delega aquí vía
 * Facade; el controller no cambia.
 *
 * Cada cambio de estado de verificación invalida la caché de proveedores
 * y emite eventos en tiempo real + push al dueño del perfil.
 */
@Injectable()
export class AdminTrustService {
  private readonly logger = new Logger(AdminTrustService.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private push: PushNotificationsService,
    private referrals: ReferralsService,
    @Inject(CACHE_MANAGER) private cacheManager: any,
  ) {}

  async getPendingVerifications() {
    const providers = await this.prisma.provider.findMany({
      where: { verificationStatus: 'PENDIENTE' },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
        providerCategories: {
          select: { category: { select: { name: true } } },
        },
        locality: { select: { name: true } },
        verificationDocs: true,
        images: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return providers.map((p) => withCategoryAlias(p));
  }

  async approveVerification(id: number) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: { subscription: true, user: { select: { hasUsedTrial: true } } },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    // Anti freemium abuse: si el dueño ya consumió su mes de cortesía en
    // una cuenta previa (hasUsedTrial), el perfil arranca en GRATIS sin
    // gracia. Si es su primera vez, recibe ESTANDAR de cortesía por 1 mes
    // (al expirar, el cron de suscripciones lo degrada a GRATIS).
    const usedTrial = provider.user?.hasUsedTrial ?? false;
    const trialPlan = usedTrial ? 'GRATIS' : 'ESTANDAR';
    const trialStatus = usedTrial ? 'ACTIVA' : 'GRACIA';

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const [updated] = await this.prisma.$transaction(async (tx) => {
      // 1. Aprobar proveedor y hacerlo visible
      const updatedProvider = await tx.provider.update({
        where: { id },
        data: {
          isVerified: true,
          verificationStatus: 'APROBADO',
          isVisible: true,
          // Prioridad de listado según el plan inicial real del proveedor.
          planPriority: planToPriority(
            usedTrial ? 'GRATIS' : 'ESTANDAR',
            'ACTIVA',
          ),
        },
      });

      // 2. Cambiar rol del usuario a PROVEEDOR (ahora sí está aprobado)
      await tx.user.update({
        where: { id: provider.userId },
        data: { role: 'PROVEEDOR' },
      });

      // 3. Crear suscripción de cortesía (solo si no tiene una ya).
      // Plan ESTANDAR, status GRACIA — el dashboard del proveedor detecta esa
      // combinación y muestra el modal de bienvenida exclusivo de primera vez.
      if (!provider.subscription) {
        await tx.subscription.create({
          data: {
            providerId: id,
            plan: trialPlan,
            status: trialStatus,
            endDate,
          },
        });
      }

      // 4. Notificación en BD — un solo texto unificado. Antes había
      // DOS notifs distintas (una de "¡Felicidades verificado!" y otra
      // de "Perfil aprobado + Plan Estándar..."). El user veía duplicado
      // en su inbox: la persistida por BD + la in-memory por WS.
      // Ahora ambas comparten el MISMO título/cuerpo y el dedup por
      // (type+title+body+timestamp) del notifications_provider las
      // colapsa a una sola entrada.
      //
      // IMPORTANTE: usar `updatedProvider` (variable local de la tx), NO
      // `updated` — esa última es el resultado de la transacción y aún
      // no está inicializada acá dentro (TDZ → ReferenceError
      // "Cannot access 'updated' before initialization").
      const approveBody =
        `Tu perfil "${updatedProvider.businessName}" fue aprobado. ` +
        (usedTrial
          ? 'Ya estás activo en el plan Gratis.'
          : 'Plan Estándar activado gratis por 1 mes de bienvenida.');
      await tx.adminNotification.create({
        data: {
          providerId: id,
          type: 'APROBADO',
          title: '¡Perfil aprobado! ✅',
          message: approveBody,
          // Sin esto, la notif aparecía en ambos paneles del usuario
          // (OFICIO y NEGOCIO) porque el filtro por tipo dejaba pasar
          // las nulas. Bind explícito al perfil del provider.
          targetProfileType: updatedProvider.type,
          targetUserId: provider.userId,
        },
      });

      return [updatedProvider];
    });

    // Invalidar caché para que la app móvil vea al proveedor de inmediato
    await clearProvidersCache(this.cacheManager);

    // Notificar en tiempo real a todos los clientes conectados (admin panel)
    this.eventsGateway.emitProviderStatusChanged({
      id: updated.id,
      businessName: updated.businessName,
      verificationStatus: updated.verificationStatus,
      isVerified: updated.isVerified,
    });
    this.eventsGateway.emitAdminEvent('PROVIDER_APPROVED', {
      providerId: id,
      businessName: updated.businessName,
    });

    // Notificar al proveedor específico en la app móvil. Mismo texto que
    // se persistió en BD para que el dedup del cliente (type+title+body
    // dentro de ±60s) las trate como la misma entrada.
    const approveTitle = '¡Perfil aprobado! ✅';
    const approveBody =
      `Tu perfil "${updated.businessName}" fue aprobado. ` +
      (usedTrial
        ? 'Ya estás activo en el plan Gratis.'
        : 'Plan Estándar activado gratis por 1 mes de bienvenida.');

    this.eventsGateway.emitNotification({
      type: 'PROVIDER_APPROVED',
      title: approveTitle,
      body: approveBody,
      targetUserId: provider.userId,
      targetProfileType: updated.type,
    });

    this.push.sendToUser(provider.userId, approveTitle, approveBody, {
      type: 'PROVIDER_APPROVED',
      plan: trialPlan,
      trial: String(!usedTrial),
    });

    // Sistema de referidos: si este provider tiene un referral pendiente,
    // entrega monedas al inviter y al invitado y emite las notificaciones extra.
    // Falla en silencio para no romper la aprobación si algo va mal.
    try {
      await this.referrals.onProviderApproved(updated.id);
    } catch (err) {
      this.logger.error(
        `onProviderApproved error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return updated;
  }

  async rejectVerification(id: number, reason: string) {
    if (!reason?.trim())
      throw new BadRequestException('El motivo de rechazo es obligatorio');

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    const [updated] = await this.prisma.$transaction(async (tx) => {
      // 1. Marcar proveedor como rechazado y oculto
      const updatedProvider = await tx.provider.update({
        where: { id },
        data: {
          isVerified: false,
          verificationStatus: 'RECHAZADO',
          isVisible: false,
        },
      });

      // 2. Asegurar que el usuario quede como USUARIO (nunca PROVEEDOR si fue rechazado)
      await tx.user.update({
        where: { id: provider.userId },
        data: { role: 'USUARIO' },
      });

      // 3. Notificación en BD con el motivo exacto
      await tx.adminNotification.create({
        data: {
          providerId: id,
          type: 'RECHAZADO',
          message: `Tu solicitud de verificación fue rechazada. Motivo: ${reason}`,
          // Bind al perfil para que el filtro del panel no la mezcle.
          targetProfileType: updatedProvider.type,
          targetUserId: provider.userId,
        },
      });

      return [updatedProvider];
    });

    // Notificar en tiempo real (el proveedor dejará de aparecer si estaba visible)
    await clearProvidersCache(this.cacheManager);
    this.eventsGateway.emitProviderStatusChanged({
      id: updated.id,
      businessName: updated.businessName,
      verificationStatus: updated.verificationStatus,
      isVerified: updated.isVerified,
    });
    this.eventsGateway.emitAdminEvent('PROVIDER_REJECTED', {
      providerId: id,
      businessName: updated.businessName,
    });

    // Notificar al proveedor específico en la app móvil. Incluimos
    // `targetProfileType` para que el cliente sepa cuál perfil
    // (OFICIO/NEGOCIO) actualizar en su estado local.
    this.eventsGateway.emitNotification({
      type: 'PROVIDER_REJECTED',
      title: 'Perfil rechazado',
      body: `Tu perfil "${updated.businessName}" no fue aprobado. Motivo: ${reason}`,
      targetUserId: provider.userId,
      targetProfileType: updated.type,
    });

    this.push.sendToUser(
      provider.userId,
      'Perfil rechazado',
      `Tu perfil "${updated.businessName}" no fue aprobado. Motivo: ${reason}`,
      { type: 'PROVIDER_REJECTED' },
    );

    return updated;
  }

  async requestMoreInfo(id: number, reason: string) {
    if (!reason?.trim())
      throw new BadRequestException(
        'El detalle de la solicitud es obligatorio',
      );

    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    await this.prisma.adminNotification.create({
      data: {
        providerId: id,
        type: 'MAS_INFO',
        message: `Necesitamos más información para verificar tu perfil: ${reason}`,
        targetProfileType: provider.type,
        targetUserId: provider.userId,
      },
    });

    return { success: true, message: 'Solicitud de información enviada' };
  }

  async revokeVerification(id: number, reason?: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    if (!provider.isVerified)
      throw new BadRequestException('Este proveedor no está verificado');

    // Antes: Promise.all([update, create]) — dos queries disparadas en
    // paralelo. Las serializamos dentro de una transacción interactiva
    // (await secuencial) para (a) garantizar atomicidad update+notif y
    // (b) no solapar queries en la misma conexión (warning de pg
    // "client is already executing a query"). Mismo patrón que
    // approveVerification / rejectVerification.
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedProvider = await tx.provider.update({
        where: { id },
        data: { isVerified: false, verificationStatus: 'PENDIENTE' },
      });
      await tx.adminNotification.create({
        data: {
          providerId: id,
          type: 'VERIFICACION_REVOCADA',
          message: reason
            ? `Tu verificación ha sido revocada. Motivo: ${reason}`
            : 'Tu verificación ha sido revocada por el administrador.',
          targetProfileType: provider.type,
          targetUserId: provider.userId,
        },
      });
      return updatedProvider;
    });

    // Invalidar caché y notificar — el proveedor ya no aparecerá en la app
    await clearProvidersCache(this.cacheManager);
    this.eventsGateway.emitProviderStatusChanged({
      id: updated.id,
      businessName: updated.businessName,
      verificationStatus: updated.verificationStatus,
      isVerified: updated.isVerified,
    });

    return updated;
  }
}
