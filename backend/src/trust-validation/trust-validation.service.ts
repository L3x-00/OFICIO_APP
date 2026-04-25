import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsGateway } from '../events/events.gateway.js';
import { MinioService } from '../common/minio.service.js';

@Injectable()
export class TrustValidationService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private minio: MinioService,
  ) {}

  // ── PROVEEDOR: Enviar solicitud ──────────────────────────
  async submitRequest(
    userId: number,
    providerType: string,
    fields: {
      dniNumber?: string;
      dniFirstName?: string;
      dniLastName?: string;
      dniAddress?: string;
      rucNumber?: string;
      businessAddress?: string;
    },
    files: {
      dniPhotoFront?: Express.Multer.File[];
      dniPhotoBack?: Express.Multer.File[];
      selfieWithDni?: Express.Multer.File[];
      businessPhoto?: Express.Multer.File[];
      ownerDniPhoto?: Express.Multer.File[];
    },
  ) {
    const type = providerType === 'NEGOCIO' ? 'NEGOCIO' : 'OFICIO';

    const provider = await this.prisma.provider.findFirst({
      where: { userId, type: type as any },
      select: { id: true, trustStatus: true, verificationStatus: true },
    });
    if (!provider) throw new NotFoundException('Perfil de proveedor no encontrado');
    if (provider.verificationStatus !== 'APROBADO') {
      throw new BadRequestException('Tu perfil debe estar aprobado antes de solicitar validación de confianza');
    }
    if (provider.trustStatus === 'PENDING') {
      throw new BadRequestException('Ya tienes una solicitud de validación pendiente');
    }

    const uploadOpt = async (f?: Express.Multer.File) =>
      f ? this.minio.uploadFile(f.buffer, f.originalname, 'trust-validation') : undefined;

    const [dniPhotoFrontUrl, dniPhotoBackUrl, selfieWithDniUrl, businessPhotoUrl, ownerDniPhotoUrl] =
      await Promise.all([
        uploadOpt(files.dniPhotoFront?.[0]),
        uploadOpt(files.dniPhotoBack?.[0]),
        uploadOpt(files.selfieWithDni?.[0]),
        uploadOpt(files.businessPhoto?.[0]),
        uploadOpt(files.ownerDniPhoto?.[0]),
      ]);

    const request = await this.prisma.trustValidationRequest.create({
      data: {
        providerId:      provider.id,
        status:          'PENDING',
        dniNumber:       fields.dniNumber,
        dniFirstName:    fields.dniFirstName,
        dniLastName:     fields.dniLastName,
        dniAddress:      fields.dniAddress,
        rucNumber:       fields.rucNumber,
        businessAddress: fields.businessAddress,
        dniPhotoFrontUrl,
        dniPhotoBackUrl,
        selfieWithDniUrl,
        businessPhotoUrl,
        ownerDniPhotoUrl,
      },
    });

    await this.prisma.provider.update({
      where: { id: provider.id },
      data: { trustStatus: 'PENDING' },
    });

    // Notificar al admin
    this.eventsGateway.emitNotification({
      type:   'TRUST_VALIDATION_REQUEST',
      title:  'Nueva solicitud de validación',
      body:   `Un profesional/negocio solicita validación de confianza.`,
      targetRole: 'ADMIN',
    });

    return { success: true, requestId: request.id };
  }

  // ── PROVEEDOR: Ver su estado de confianza ────────────────
  async getMyTrustStatus(userId: number, providerType: string) {
    const type = providerType === 'NEGOCIO' ? 'NEGOCIO' : 'OFICIO';
    const provider = await this.prisma.provider.findFirst({
      where: { userId, type: type as any },
      select: {
        id: true, trustStatus: true, isTrusted: true,
        trustValidations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true, status: true, rejectionReason: true, createdAt: true, reviewedAt: true,
          },
        },
      },
    });
    if (!provider) throw new NotFoundException('Perfil no encontrado');

    return {
      trustStatus:    provider.trustStatus,
      isTrusted:      provider.isTrusted,
      latestRequest:  provider.trustValidations[0] ?? null,
    };
  }

  // ── ADMIN: Listar solicitudes pendientes ─────────────────
  async listPendingRequests(status?: string) {
    const where = status ? { status: status as any } : { status: 'PENDING' as any };

    const requests = await this.prisma.trustValidationRequest.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, status: true, createdAt: true,
        provider: {
          select: {
            id: true, businessName: true, type: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    return requests.map((r) => ({
      id:           r.id,
      status:       r.status,
      createdAt:    r.createdAt,
      providerId:   r.provider.id,
      businessName: r.provider.businessName,
      providerType: r.provider.type,
      ownerName:    `${r.provider.user.firstName} ${r.provider.user.lastName}`,
      email:        r.provider.user.email,
    }));
  }

  // ── ADMIN: Detalle de una solicitud (comparativa) ────────
  async getRequestDetail(requestId: number) {
    const request = await this.prisma.trustValidationRequest.findUnique({
      where: { id: requestId },
      include: {
        provider: {
          select: {
            id: true, type: true, businessName: true,
            description: true, dni: true, ruc: true,
            nombreComercial: true, razonSocial: true,
            phone: true, address: true, isTrusted: true, trustStatus: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!request) throw new NotFoundException('Solicitud no encontrada');

    return {
      request: {
        id:               request.id,
        status:           request.status,
        createdAt:        request.createdAt,
        rejectionReason:  request.rejectionReason,
        reviewedAt:       request.reviewedAt,
        // Datos del formulario de validación
        dniNumber:        request.dniNumber,
        dniFirstName:     request.dniFirstName,
        dniLastName:      request.dniLastName,
        dniAddress:       request.dniAddress,
        rucNumber:        request.rucNumber,
        businessAddress:  request.businessAddress,
        dniPhotoFrontUrl: request.dniPhotoFrontUrl,
        dniPhotoBackUrl:  request.dniPhotoBackUrl,
        selfieWithDniUrl: request.selfieWithDniUrl,
        businessPhotoUrl: request.businessPhotoUrl,
        ownerDniPhotoUrl: request.ownerDniPhotoUrl,
      },
      // Datos de registro del proveedor (para comparar)
      provider: {
        id:             request.provider.id,
        type:           request.provider.type,
        businessName:   request.provider.businessName,
        description:    request.provider.description,
        dni:            request.provider.dni,
        ruc:            request.provider.ruc,
        nombreComercial: request.provider.nombreComercial,
        razonSocial:    request.provider.razonSocial,
        phone:          request.provider.phone,
        address:        request.provider.address,
        ownerName:      `${request.provider.user.firstName} ${request.provider.user.lastName}`,
        email:          request.provider.user.email,
        trustStatus:    request.provider.trustStatus,
        isTrusted:      request.provider.isTrusted,
      },
    };
  }

  // ── ADMIN: Aprobar solicitud ─────────────────────────────
  async approveRequest(requestId: number) {
    const request = await this.prisma.trustValidationRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, providerId: true, provider: { select: { userId: true, type: true, businessName: true } } },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== 'PENDING') throw new BadRequestException('Solicitud ya procesada');

    await this.prisma.$transaction([
      this.prisma.trustValidationRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      }),
      this.prisma.provider.update({
        where: { id: request.providerId },
        data: { trustStatus: 'APPROVED', isTrusted: true },
      }),
    ]);

    // Notificar al proveedor
    this.eventsGateway.emitNotification({
      type:         'TRUST_APPROVED',
      title:        '¡Validación aprobada!',
      body:         `Tu perfil "${request.provider.businessName}" ha sido validado como confiable.`,
      targetUserId: request.provider.userId,
      targetProfileType: request.provider.type,
    });

    return { success: true };
  }

  // ── ADMIN: Rechazar solicitud ────────────────────────────
  async rejectRequest(requestId: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Debes indicar el motivo del rechazo');

    const request = await this.prisma.trustValidationRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, providerId: true, provider: { select: { userId: true, type: true, businessName: true } } },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== 'PENDING') throw new BadRequestException('Solicitud ya procesada');

    await this.prisma.$transaction([
      this.prisma.trustValidationRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', rejectionReason: reason.trim(), reviewedAt: new Date() },
      }),
      this.prisma.provider.update({
        where: { id: request.providerId },
        data: { trustStatus: 'REJECTED', isTrusted: false },
      }),
    ]);

    // Notificar al proveedor en tiempo real
    this.eventsGateway.emitNotification({
      type:         'TRUST_REJECTED',
      title:        'Solicitud de validación rechazada',
      body:         reason.trim(),
      targetUserId: request.provider.userId,
      targetProfileType: request.provider.type,
    });

    return { success: true };
  }
}
