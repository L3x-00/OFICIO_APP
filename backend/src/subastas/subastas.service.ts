import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { PushNotificationsService } from '../firebase/push-notifications.service.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { SubmitOfferDto } from './dto/submit-offer.dto.js';
import { AcceptOfferDto } from './dto/accept-offer.dto.js';
import { ArrivedDto } from './dto/arrived.dto.js';

// Prisma enum values — kept as string constants so the module compiles
// before `prisma generate` is run after la nueva migration.
const ServiceRequestStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED', // Cupo lleno (5 ofertas) — sigue mostrándose para que el usuario elija
  AWARDED: 'AWARDED', // Usuario aceptó una oferta y se adjudicó
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

const OfferStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;

const MAX_OFFERS = 5;
const EXPIRY_HOURS = 24;
// 3 subastas sin elegir → bloqueo de 7 días
const NO_PICK_THRESHOLD = 3;
const BLOCK_DAYS = 7;

@Injectable()
export class SubastasService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private push: PushNotificationsService,
  ) {}

  // ── CREAR SOLICITUD ─────────────────────────────────────────
  async createRequest(userId: number, dto: CreateServiceRequestDto) {
    // Verificar penalización
    await this._checkPenalty(userId);

    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

    const request = await this.prisma.serviceRequest.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        description: dto.description,
        photoUrl: dto.photoUrl,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        desiredDate: dto.desiredDate ? new Date(dto.desiredDate) : undefined,
        latitude: dto.latitude,
        longitude: dto.longitude,
        department: dto.department,
        province: dto.province,
        district: dto.district,
        expiresAt,
        maxOffers: MAX_OFFERS,
        notifyRadiusKm: 5,
      },
      include: { category: true },
    });

    // Notificar a proveedores cercanos vía WebSocket
    this.events.emitSubastaNew({
      requestId: request.id,
      categoryId: request.categoryId,
      categoryName: request.category.name,
      description: request.description,
      photoUrl: request.photoUrl ?? null,
      budgetMin: request.budgetMin ?? null,
      budgetMax: request.budgetMax ?? null,
      latitude: request.latitude ?? null,
      longitude: request.longitude ?? null,
      department: request.department ?? null,
      expiresAt: request.expiresAt.toISOString(),
    });

    // Notificar a TODOS los proveedores aprobados que ofrecen la
    // Especialidad elegida — para que vean la oportunidad y postulen.
    // Se persiste en adminNotification (sobrevive cambios de cuenta) +
    // WebSocket en vivo + push.
    const matchingProviders = await this.prisma.provider.findMany({
      where: {
        isVisible: true,
        verificationStatus: 'APROBADO',
        providerCategories: { some: { categoryId: dto.categoryId } },
      },
      select: { id: true, userId: true, type: true },
    });

    if (matchingProviders.length > 0) {
      const notifTitle = 'Nueva oportunidad en tu categoría';
      const notifBody =
        `Un cliente publicó una necesidad de "${request.category.name}". ` +
        'Entra a Oportunidades y postula.';

      await this.prisma.adminNotification.createMany({
        data: matchingProviders.map((p) => ({
          providerId: p.id,
          type: 'NUEVA_OPORTUNIDAD' as const,
          title: notifTitle,
          message: notifBody,
          targetUserId: p.userId,
          targetProfileType: p.type,
        })),
      });

      for (const p of matchingProviders) {
        this.events.emitNotification({
          type: 'NUEVA_OPORTUNIDAD',
          title: notifTitle,
          body: notifBody,
          targetUserId: p.userId,
          targetProfileType: p.type,
        });
        void this.push
          .sendToUser(p.userId, notifTitle, notifBody, {
            type: 'NUEVA_OPORTUNIDAD',
            requestId: String(request.id),
          })
          .catch(() => {});
      }
    }

    return request;
  }

  // ── OBTENER SOLICITUDES ACTIVAS (usuario cliente) ────────────
  async getMyRequests(userId: number, page = 1, limit = 10) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          category: { select: { id: true, name: true, iconUrl: true } },
          offers: {
            include: {
              provider: {
                select: {
                  id: true,
                  businessName: true,
                  averageRating: true,
                  totalReviews: true,
                  isTrusted: true,
                  images: { where: { isCover: true }, select: { url: true } },
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
            orderBy: { price: 'asc' },
          },
        },
      }),
      this.prisma.serviceRequest.count({ where: { userId } }),
    ]);

    return {
      data,
      total,
      page: safePage,
      lastPage: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  // ── OPORTUNIDADES PARA PROVEEDOR ─────────────────────────────
  // PRIVADO a propósito: el id del provider NUNCA debe llegar desde la
  // request. Acceso autorizado vía getOpportunitiesByUser() que lo deriva
  // del JWT.
  private async getOpportunities(providerId: number) {
    // Obtener datos del proveedor para filtrar por ubicación y categoría
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        providerCategories: { select: { categoryId: true } },
        latitude: true,
        longitude: true,
        averageRating: true,
        isTrusted: true,
        subscription: { select: { plan: true } },
      },
    });

    if (!provider) throw new NotFoundException('Proveedor no encontrado');

    // Solo proveedores con rating >= 3 o confianza pueden participar
    const canParticipate = provider.averageRating >= 3 || provider.isTrusted;

    const requests = await this.prisma.serviceRequest.findMany({
      where: {
        status: ServiceRequestStatus.OPEN,
        expiresAt: { gt: new Date() },
        categoryId: {
          in: provider.providerCategories.map((pc) => pc.categoryId),
        },
        // No mostrar si el proveedor ya hizo oferta
        offers: { none: { providerId } },
      },
      include: {
        category: { select: { id: true, name: true, iconUrl: true } },
        user: { select: { firstName: true, district: true, province: true } },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular distancia (si el proveedor tiene coordenadas)
    return requests.map((req) => ({
      ...req,
      canParticipate,
      distanceKm:
        provider.latitude && provider.longitude && req.latitude && req.longitude
          ? this._haversineKm(
              provider.latitude,
              provider.longitude,
              req.latitude,
              req.longitude,
            )
          : null,
      offersCount: req._count.offers,
      isFull: req._count.offers >= req.maxOffers,
    }));
  }

  // ── ENVIAR OFERTA (transacción atómica) ─────────────────────
  async submitOffer(providerId: number, dto: SubmitOfferDto) {
    // Toda la lógica de validación + creación + cierre debe ejecutarse en una
    // sola transacción para evitar race conditions (cupo) y dobles ofertas.
    const { offer, requestUserId } = await this.prisma.$transaction(
      async (tx) => {
        const request = await tx.serviceRequest.findUnique({
          where: { id: dto.serviceRequestId },
        });

        if (!request) throw new NotFoundException('Solicitud no encontrada');
        if (request.status !== ServiceRequestStatus.OPEN)
          throw new BadRequestException('La solicitud ya no está activa');
        if (new Date() > request.expiresAt)
          throw new BadRequestException('La solicitud ha expirado');

        // Cupo: contar dentro de la transacción para que dos providers
        // simultáneos no superen el límite.
        const offersCount = await tx.offer.count({
          where: { serviceRequestId: dto.serviceRequestId },
        });
        if (offersCount >= request.maxOffers)
          throw new BadRequestException(
            'Esta solicitud ya alcanzó el máximo de ofertas',
          );

        // Verificar que el provider no tenga oferta previa
        const existing = await tx.offer.findUnique({
          where: {
            serviceRequestId_providerId: {
              serviceRequestId: dto.serviceRequestId,
              providerId,
            },
          },
        });
        if (existing)
          throw new BadRequestException(
            'Ya enviaste una oferta para esta solicitud',
          );

        const created = await tx.offer.create({
          data: {
            serviceRequestId: dto.serviceRequestId,
            providerId,
            price: dto.price,
            message: dto.message,
          },
          include: {
            provider: {
              select: {
                businessName: true,
                averageRating: true,
                isTrusted: true,
                user: { select: { avatarUrl: true } },
              },
            },
          },
        });

        // Cerrar la solicitud si la oferta recién creada llenó el cupo
        if (offersCount + 1 >= request.maxOffers) {
          await tx.serviceRequest.update({
            where: { id: dto.serviceRequestId },
            data: { status: ServiceRequestStatus.CLOSED },
          });
        }

        return { offer: created, requestUserId: request.userId };
      },
    );

    // Notificaciones FUERA de la transacción para no alargar el lock.
    this.events.emitNotification({
      type: 'NEW_OFFER',
      title: '¡Nueva oferta recibida!',
      body: `${offer.provider.businessName} ofreció S/ ${dto.price.toFixed(2)}`,
      targetUserId: requestUserId,
    });

    this.push.sendToUser(
      requestUserId,
      '¡Nueva oferta recibida!',
      `${offer.provider.businessName} ofreció S/ ${dto.price.toFixed(2)}`,
      { type: 'NEW_OFFER', requestId: String(dto.serviceRequestId) },
    );

    return offer;
  }

  // ── ACEPTAR OFERTA (transacción atómica) ─────────────────────
  async acceptOffer(userId: number, dto: AcceptOfferDto) {
    const winnerProviderId = await this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id: dto.offerId },
        include: { serviceRequest: true },
      });

      if (!offer) throw new NotFoundException('Oferta no encontrada');
      if (offer.serviceRequest.userId !== userId)
        throw new ForbiddenException(
          'No tienes permiso para aceptar esta oferta',
        );

      // Solo se permite aceptar si la solicitud está OPEN (todavía recibe
      // ofertas) o CLOSED (cupo lleno, esperando elección). Cualquier otro
      // estado (AWARDED, EXPIRED, CANCELLED) bloquea la operación.
      if (
        offer.serviceRequest.status !== ServiceRequestStatus.OPEN &&
        offer.serviceRequest.status !== ServiceRequestStatus.CLOSED
      ) {
        throw new BadRequestException('Esta solicitud ya no permite cambios');
      }

      // Guard estricto: verifica que NO exista ya una oferta ACCEPTED para
      // esta solicitud. Evita doble adjudicación si dos requests llegan
      // simultáneamente.
      const alreadyAccepted = await tx.offer.findFirst({
        where: {
          serviceRequestId: offer.serviceRequestId,
          status: OfferStatus.ACCEPTED,
        },
        select: { id: true },
      });
      if (alreadyAccepted) {
        throw new BadRequestException(
          'Ya hay una oferta aceptada para esta solicitud',
        );
      }

      // 1. Aceptar la oferta elegida
      await tx.offer.update({
        where: { id: dto.offerId },
        data: { status: OfferStatus.ACCEPTED },
      });
      // 2. Rechazar todas las demás pendientes
      await tx.offer.updateMany({
        where: {
          serviceRequestId: offer.serviceRequestId,
          id: { not: dto.offerId },
          status: OfferStatus.PENDING,
        },
        data: { status: OfferStatus.REJECTED },
      });
      // 3. Marcar la solicitud como ADJUDICADA
      await tx.serviceRequest.update({
        where: { id: offer.serviceRequestId },
        data: { status: ServiceRequestStatus.AWARDED },
      });

      return offer.providerId;
    });

    // Notificaciones fuera de la transacción.
    const winningProvider = await this.prisma.provider.findUnique({
      where: { id: winnerProviderId },
      select: { userId: true, businessName: true },
    });

    if (winningProvider) {
      const accTitle = '¡Felicidades! Tu oferta fue aceptada';
      const accBody = 'El cliente eligió tu propuesta. ¡Contáctalo ahora!';

      // Persistir — así sobrevive cambios de cuenta en el dispositivo.
      await this.prisma.adminNotification.create({
        data: {
          providerId: winnerProviderId,
          type: 'OFERTA_ACEPTADA',
          title: accTitle,
          message: accBody,
          targetUserId: winningProvider.userId,
        },
      });

      this.events.emitNotification({
        type: 'OFFER_ACCEPTED',
        title: accTitle,
        body: accBody,
        targetUserId: winningProvider.userId,
      });

      this.push.sendToUser(winningProvider.userId, accTitle, accBody, {
        type: 'OFFER_ACCEPTED',
        requestId: String(dto.offerId),
      });
    }

    return { success: true, offerId: dto.offerId };
  }

  // ── CLIENTE: Eliminar solicitud ──────────────────────────────
  // Si la solicitud tiene ofertas pendientes y el cliente la elimina sin
  // aceptar a nadie, cuenta como "no-pick" → penaliza su reputación
  // (mismo sistema que el expirado sin elección). Notifica a todos los
  // proveedores que ofertaron.
  async deleteRequest(userId: number, requestId: number) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        offers: {
          where: { status: OfferStatus.PENDING },
          include: { provider: { select: { userId: true } } },
        },
      },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.userId !== userId) {
      throw new ForbiddenException(
        'No puedes eliminar una solicitud que no es tuya',
      );
    }

    // userIds de los proveedores con oferta pendiente (a notificar).
    const offerUserIds = [
      ...new Set(request.offers.map((o) => o.provider.userId)),
    ];
    const hadOffers = offerUserIds.length > 0;

    // Penalización de reputación: eliminar con ofertas sin aceptar = no-pick.
    if (hadOffers) {
      await this._incrementNoPick(userId);
    }

    // Borrar la solicitud — el cascade del schema elimina sus ofertas.
    await this.prisma.serviceRequest.delete({ where: { id: requestId } });

    // Avisar a los proveedores que ofertaron.
    for (const uid of offerUserIds) {
      this.events.emitNotification({
        type: 'REQUEST_CANCELLED',
        title: 'Necesidad ya no disponible',
        body: 'La necesidad del cliente ya no está disponible. ¡Gracias por ofertar!',
        targetUserId: uid,
      });
      void this.push
        .sendToUser(
          uid,
          'Necesidad ya no disponible',
          'La necesidad del cliente ya no está disponible. ¡Gracias por ofertar!',
          { type: 'REQUEST_CANCELLED' },
        )
        .catch(() => {});
    }

    return { success: true, hadOffers };
  }

  // ── MARCAR LLEGADA GPS ───────────────────────────────────────
  async markArrived(providerId: number, dto: ArrivedDto) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: dto.offerId },
    });

    if (!offer || offer.providerId !== providerId)
      throw new ForbiddenException('Oferta no válida');
    if (offer.status !== OfferStatus.ACCEPTED)
      throw new BadRequestException(
        'Solo puedes marcar llegada en ofertas aceptadas',
      );

    return this.prisma.offer.update({
      where: { id: dto.offerId },
      data: {
        arrivedAt: new Date(),
        arrivedLat: dto.latitude,
        arrivedLng: dto.longitude,
      },
    });
  }

  // ── EXPIRAR SOLICITUDES VENCIDAS (llamado por cron/scheduler) ─
  async expireStaleRequests() {
    const expired = await this.prisma.serviceRequest.findMany({
      where: {
        status: ServiceRequestStatus.OPEN,
        expiresAt: { lte: new Date() },
      },
      include: { offers: { where: { status: OfferStatus.PENDING } } },
    });

    let processed = 0;
    let failed = 0;

    // Procesar cada solicitud en su propio try/catch para que un fallo
    // aislado no detenga el procesamiento del resto.
    for (const req of expired) {
      try {
        const hadOffers = req.offers.length > 0;

        await this.prisma.$transaction([
          this.prisma.serviceRequest.update({
            where: { id: req.id },
            data: { status: ServiceRequestStatus.EXPIRED },
          }),
          this.prisma.offer.updateMany({
            where: { serviceRequestId: req.id, status: OfferStatus.PENDING },
            data: { status: OfferStatus.REJECTED },
          }),
        ]);

        if (hadOffers) {
          await this._incrementNoPick(req.userId);
        }
        processed++;
      } catch (err) {
        failed++;
        // No re-lanzamos: log y seguimos con la siguiente solicitud.
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[expireStaleRequests] error procesando request ${req.id}: ${msg}`,
        );
      }
    }

    return { expired: processed, failed, total: expired.length };
  }

  // ── WRAPPERS userId → providerId ─────────────────────────────

  /**
   * Resuelve el provider activo desde el JWT y devuelve sus oportunidades.
   * Reemplaza al endpoint público getOpportunities(:providerId) que era
   * vulnerable a IDOR (cualquier usuario podía pedir las oportunidades
   * dirigidas a OTRO proveedor pasando su id).
   */
  async getOpportunitiesByUser(userId: number) {
    const provider = await this._getActiveProvider(userId);
    return this.getOpportunities(provider.id);
  }

  async submitOfferByUser(userId: number, dto: SubmitOfferDto) {
    const provider = await this._getActiveProvider(userId);
    return this.submitOffer(provider.id, dto);
  }

  async withdrawOfferByUser(userId: number, offerId: number) {
    const provider = await this._getActiveProvider(userId);
    return this.withdrawOffer(provider.id, offerId);
  }

  async markArrivedByUser(userId: number, dto: ArrivedDto) {
    const provider = await this._getActiveProvider(userId);
    return this.markArrived(provider.id, dto);
  }

  private async _getActiveProvider(userId: number) {
    // Obtiene el primer proveedor activo del usuario (OFICIO o NEGOCIO)
    const provider = await this.prisma.provider.findFirst({
      where: { userId, isVisible: true },
      select: { id: true },
    });
    if (!provider)
      throw new ForbiddenException('No tienes un perfil de proveedor activo');
    return provider;
  }

  // ── RETIRAR OFERTA ───────────────────────────────────────────
  async withdrawOffer(providerId: number, offerId: number) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });
    if (!offer || offer.providerId !== providerId)
      throw new ForbiddenException('Oferta no encontrada');
    if (offer.status !== OfferStatus.PENDING)
      throw new BadRequestException('Solo puedes retirar ofertas pendientes');

    return this.prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.WITHDRAWN },
    });
  }

  // ── HELPERS PRIVADOS ─────────────────────────────────────────

  private async _checkPenalty(userId: number) {
    const penalty = await this.prisma.userPenalty.findUnique({
      where: { userId },
    });
    if (penalty?.blockedUntil && penalty.blockedUntil > new Date()) {
      const date = penalty.blockedUntil.toLocaleDateString('es-PE');
      throw new ForbiddenException(
        `Función bloqueada hasta ${date} por no elegir proveedores en subastas anteriores.`,
      );
    }
  }

  private async _incrementNoPick(userId: number) {
    // 1) Asegura que la fila exista (insert idempotente sin tocar el contador
    //    si ya existía).
    await this.prisma.userPenalty.upsert({
      where: { userId },
      create: { userId, noPickCount: 0 },
      update: {},
    });

    // 2) Incremento atómico vía SQL crudo + RETURNING. Evita el patrón
    //    leer/calcular/escribir que es vulnerable a race conditions cuando
    //    varias subastas expiran simultáneamente para el mismo usuario.
    const rows = await this.prisma.$queryRaw<{ noPickCount: number }[]>`
      UPDATE "user_penalties"
         SET "noPickCount" = "noPickCount" + 1,
             "updatedAt"   = NOW()
       WHERE "userId" = ${userId}
       RETURNING "noPickCount"
    `;

    const newCount = rows[0]?.noPickCount ?? 0;

    if (newCount >= NO_PICK_THRESHOLD) {
      const blockedUntil = new Date(
        Date.now() + BLOCK_DAYS * 24 * 60 * 60 * 1000,
      );
      await this.prisma.userPenalty.update({
        where: { userId },
        data: { blockedUntil, noPickCount: 0 },
      });
    }
  }

  private _haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
