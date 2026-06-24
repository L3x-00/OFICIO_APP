import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProviderFeaturesService } from '../common/provider-features.service.js';
import { MinioService } from '../common/minio.service.js';
import { PushNotificationsService } from '../firebase/push-notifications.service.js';
import type { CreateQuotationDto } from './dto/create-quotation.dto.js';

const FEATURE = 'cotizacion';

/**
 * Cotización: canal de contacto (sin límite). Feature-gate "cotizacion". El
 * cliente describe lo que necesita (+ foto opcional) y el proveedor responde
 * con un presupuesto. Notifica por push en cada paso.
 */
@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly features: ProviderFeaturesService,
    private readonly minio: MinioService,
    private readonly push: PushNotificationsService,
  ) {}

  // ── CLIENTE ────────────────────────────────────────────────

  async create(userId: number, dto: CreateQuotationDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: dto.providerId },
      select: { id: true, userId: true, businessName: true },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado.');
    await this.features.assertProviderHasFeature(provider.id, FEATURE);

    const q = await this.prisma.quotationRequest.create({
      data: {
        providerId: provider.id,
        userId,
        description: dto.description.trim(),
        photoUrl: dto.photoUrl?.trim() || null,
      },
    });

    this.notify(
      provider.userId,
      'Nueva solicitud de cotización',
      'Un cliente te pidió una cotización. Revísala y responde con tu presupuesto.',
      { type: 'QUOTATION_REQUEST', quotationId: String(q.id) },
    );
    return q;
  }

  listMine(userId: number) {
    return this.prisma.quotationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            type: true,
            whatsapp: true,
            whatsappBiz: true,
            showWhatsapp: true,
          },
        },
      },
    });
  }

  /** Sube la foto del problema/proyecto (cualquier cliente autenticado). */
  async uploadPhoto(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen.');
    const url = await this.minio.uploadFile(
      file.buffer,
      file.originalname,
      'quotations',
    );
    return { url };
  }

  // ── PROVEEDOR ──────────────────────────────────────────────

  async listForProvider(userId: number) {
    const ids = await this.ownedProviderIds(userId);
    return this.prisma.quotationRequest.findMany({
      where: { providerId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });
  }

  async respond(
    userId: number,
    id: number,
    response: string,
    estimatedPrice?: number,
  ) {
    const q = await this.assertProviderOwns(userId, id);
    if (q.status !== 'PENDIENTE') {
      throw new BadRequestException('Esta cotización ya fue atendida.');
    }
    const updated = await this.prisma.quotationRequest.update({
      where: { id },
      data: {
        status: 'RESPONDIDA',
        response: response.trim(),
        estimatedPrice: estimatedPrice ?? null,
      },
    });
    this.notify(
      q.userId,
      'Cotización respondida',
      'Un proveedor respondió tu solicitud de cotización.',
      { type: 'QUOTATION_RESPONDED', quotationId: String(id) },
    );
    return updated;
  }

  async reject(userId: number, id: number) {
    const q = await this.assertProviderOwns(userId, id);
    if (q.status !== 'PENDIENTE') {
      throw new BadRequestException('Esta cotización ya fue atendida.');
    }
    const updated = await this.prisma.quotationRequest.update({
      where: { id },
      data: { status: 'RECHAZADA' },
    });
    this.notify(
      q.userId,
      'Cotización rechazada',
      'Un proveedor no pudo atender tu solicitud de cotización.',
      { type: 'QUOTATION_REJECTED', quotationId: String(id) },
    );
    return updated;
  }

  // ── Helpers ────────────────────────────────────────────────

  private notify(
    userId: number,
    title: string,
    body: string,
    data: Record<string, string>,
  ): void {
    void this.push.sendToUser(userId, title, body, data).catch(() => undefined);
  }

  private async assertProviderOwns(userId: number, id: number) {
    const q = await this.prisma.quotationRequest.findUnique({
      where: { id },
      include: { provider: { select: { userId: true } } },
    });
    if (!q) throw new NotFoundException('Cotización no encontrada.');
    if (q.provider.userId !== userId) {
      throw new ForbiddenException('No eres el proveedor de esta cotización.');
    }
    return q;
  }

  private async ownedProviderIds(userId: number): Promise<number[]> {
    const ps = await this.prisma.provider.findMany({
      where: { userId },
      select: { id: true },
    });
    if (!ps.length) {
      throw new NotFoundException('No tienes un perfil de proveedor.');
    }
    return ps.map((p) => p.id);
  }
}
