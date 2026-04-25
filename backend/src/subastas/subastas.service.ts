import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { SubmitOfferDto } from './dto/submit-offer.dto.js';
import { AcceptOfferDto } from './dto/accept-offer.dto.js';
import { ArrivedDto } from './dto/arrived.dto.js';

// Prisma enum values — kept as string constants so the module compiles
// before `prisma generate` is run after the migration.
const ServiceRequestStatus = {
  OPEN:      'OPEN',
  CLOSED:    'CLOSED',
  EXPIRED:   'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

const OfferStatus = {
  PENDING:   'PENDING',
  ACCEPTED:  'ACCEPTED',
  REJECTED:  'REJECTED',
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

    return request;
  }

  // ── OBTENER SOLICITUDES ACTIVAS (usuario cliente) ────────────
  async getMyRequests(userId: number) {
    return this.prisma.serviceRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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
                user: { select: { firstName: true, lastName: true, avatarUrl: true } },
              },
            },
          },
          orderBy: { price: 'asc' },
        },
      },
    });
  }

  // ── OPORTUNIDADES PARA PROVEEDOR ─────────────────────────────
  async getOpportunities(providerId: number) {
    // Obtener datos del proveedor para filtrar por ubicación y categoría
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        categoryId: true,
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

  // ── ENVIAR OFERTA ────────────────────────────────────────────
  async submitOffer(providerId: number, dto: SubmitOfferDto) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: dto.serviceRequestId },
      include: { _count: { select: { offers: true } } },
    });

    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== ServiceRequestStatus.OPEN)
      throw new BadRequestException('La solicitud ya no está activa');
    if (request._count.offers >= request.maxOffers)
      throw new BadRequestException('Esta solicitud ya alcanzó el máximo de ofertas');
    if (new Date() > request.expiresAt)
      throw new BadRequestException('La solicitud ha expirado');

    // Verificar que no tenga oferta previa
    const existing = await this.prisma.offer.findUnique({
      where: { serviceRequestId_providerId: { serviceRequestId: dto.serviceRequestId, providerId } },
    });
    if (existing) throw new BadRequestException('Ya enviaste una oferta para esta solicitud');

    const offer = await this.prisma.offer.create({
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

    // Cerrar la solicitud si alcanzó el límite
    const newCount = request._count.offers + 1;
    if (newCount >= request.maxOffers) {
      await this.prisma.serviceRequest.update({
        where: { id: dto.serviceRequestId },
        data: { status: ServiceRequestStatus.CLOSED },
      });
    }

    // Notificar al usuario que tiene una nueva oferta
    this.events.emitNotification({
      type: 'NEW_OFFER',
      title: '¡Nueva oferta recibida!',
      body: `${offer.provider.businessName} ofreció S/ ${dto.price.toFixed(2)}`,
      targetUserId: request.userId,
    });

    return offer;
  }

  // ── ACEPTAR OFERTA (transacción atómica) ─────────────────────
  async acceptOffer(userId: number, dto: AcceptOfferDto) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: dto.offerId },
      include: { serviceRequest: true },
    });

    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.serviceRequest.userId !== userId)
      throw new ForbiddenException('No tienes permiso para aceptar esta oferta');
    if (offer.serviceRequest.status !== ServiceRequestStatus.OPEN &&
        offer.serviceRequest.status !== ServiceRequestStatus.CLOSED)
      throw new BadRequestException('Esta solicitud ya no permite cambios');

    // Transacción atómica
    await this.prisma.$transaction([
      // 1. Aceptar oferta elegida
      this.prisma.offer.update({
        where: { id: dto.offerId },
        data: { status: OfferStatus.ACCEPTED },
      }),
      // 2. Rechazar todas las demás ofertas
      this.prisma.offer.updateMany({
        where: {
          serviceRequestId: offer.serviceRequestId,
          id: { not: dto.offerId },
          status: OfferStatus.PENDING,
        },
        data: { status: OfferStatus.REJECTED },
      }),
      // 3. Cerrar la solicitud
      this.prisma.serviceRequest.update({
        where: { id: offer.serviceRequestId },
        data: { status: ServiceRequestStatus.CLOSED },
      }),
    ]);

    // Notificar al proveedor ganador
    const winningProvider = await this.prisma.provider.findUnique({
      where: { id: offer.providerId },
      select: { userId: true, businessName: true },
    });

    if (winningProvider) {
      this.events.emitNotification({
        type: 'OFFER_ACCEPTED',
        title: '¡Felicidades! Tu oferta fue aceptada',
        body: 'El cliente eligió tu propuesta. ¡Contáctalo ahora!',
        targetUserId: winningProvider.userId,
      });
    }

    return { success: true, offerId: dto.offerId };
  }

  // ── MARCAR LLEGADA GPS ───────────────────────────────────────
  async markArrived(providerId: number, dto: ArrivedDto) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: dto.offerId },
    });

    if (!offer || offer.providerId !== providerId)
      throw new ForbiddenException('Oferta no válida');
    if (offer.status !== OfferStatus.ACCEPTED)
      throw new BadRequestException('Solo puedes marcar llegada en ofertas aceptadas');

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

    for (const req of expired) {
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

      // Penalizar si tenía ofertas y no eligió nadie
      if (hadOffers) {
        await this._incrementNoPick(req.userId);
      }
    }

    return { expired: expired.length };
  }

  // ── WRAPPERS userId → providerId ─────────────────────────────

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
    if (!provider) throw new ForbiddenException('No tienes un perfil de proveedor activo');
    return provider;
  }

  // ── RETIRAR OFERTA ───────────────────────────────────────────
  async withdrawOffer(providerId: number, offerId: number) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId } });
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
    const penalty = await this.prisma.userPenalty.findUnique({ where: { userId } });
    if (penalty?.blockedUntil && penalty.blockedUntil > new Date()) {
      const date = penalty.blockedUntil.toLocaleDateString('es-PE');
      throw new ForbiddenException(
        `Función bloqueada hasta ${date} por no elegir proveedores en subastas anteriores.`,
      );
    }
  }

  private async _incrementNoPick(userId: number) {
    const penalty = await this.prisma.userPenalty.upsert({
      where: { userId },
      create: { userId, noPickCount: 1 },
      update: { noPickCount: { increment: 1 } },
    });

    if (penalty.noPickCount >= NO_PICK_THRESHOLD) {
      const blockedUntil = new Date(Date.now() + BLOCK_DAYS * 24 * 60 * 60 * 1000);
      await this.prisma.userPenalty.update({
        where: { userId },
        data: { blockedUntil, noPickCount: 0 },
      });
    }
  }

  private _haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
