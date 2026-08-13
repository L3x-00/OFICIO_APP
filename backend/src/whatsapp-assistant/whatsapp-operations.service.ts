import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WhatsappAssistantConfig } from './whatsapp-assistant.config.js';

const MAX_PAGE_SIZE = 100;

type HandoverStatus = 'OPEN' | 'ACKNOWLEDGED';

type HandoverRow = {
  id: number;
  status: HandoverStatus;
  requestedAt: Date;
};

type DeliveryFailureRow = {
  id: number;
  errorCode: string | null;
  createdAt: Date;
};

/**
 * F4 se tipa de forma estructural mientras el cliente Prisma local aún refleja
 * F3. Tras aplicar el SQL y regenerar Prisma, el delegado real coincide con
 * este contrato. Así no se vuelve a generar ni se toca la BD en desarrollo.
 */
interface OperationsStore {
  whatsappHandover: {
    upsert(args: unknown): Promise<unknown>;
    count(args: unknown): Promise<number>;
    findMany(args: unknown): Promise<HandoverRow[]>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  whatsappInboundMessage: {
    count(args: unknown): Promise<number>;
    findMany(args: unknown): Promise<DeliveryFailureRow[]>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
}

export interface WhatsappOperationsSummary {
  handoversToday: number;
  openHandovers: number;
  pendingDeliveryFailures: number;
}

export interface WhatsappHandoverDto {
  id: number;
  status: HandoverStatus;
  requestedAt: Date;
}

export interface WhatsappDeliveryFailureDto {
  id: number;
  errorCode: string | null;
  createdAt: Date;
}

/** Inicio del día de Perú, sin depender de la zona horaria del proceso. */
function startOfPeruDay(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (kind: string) =>
    Number(parts.find((part) => part.type === kind)?.value);

  // Perú es UTC-5 sin DST. Medianoche local = 05:00 UTC.
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), 5));
}

/**
 * F4: operación sin contenido. El ledger sirve para que un humano tome un
 * handover y reconozca fallos de entrega. No hay replay: at-most-once exige no
 * reenviar y Servi no guarda chatId, texto ni teléfono para hacerlo posible.
 */
@Injectable()
export class WhatsappOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: WhatsappAssistantConfig,
  ) {}

  /** Se llama dentro de la misma transacción que pausa el bot. */
  async recordHandover(
    tx: unknown,
    sessionId: string,
    contactHash: string,
  ): Promise<void> {
    if (!this.config.operationsEnabled) return;

    const store = this.store(tx);
    await store.whatsappHandover.upsert({
      where: { sessionId_contactHash: { sessionId, contactHash } },
      create: { sessionId, contactHash, status: 'OPEN' },
      // Un mismo contacto queda una vez en la cola. Un bot pausado no abre
      // tickets repetidos ante mensajes posteriores.
      update: {},
    });
  }

  async getSummary(): Promise<WhatsappOperationsSummary> {
    this.assertEnabled();
    const store = this.store();
    const today = startOfPeruDay();
    const [handoversToday, openHandovers, pendingDeliveryFailures] =
      await Promise.all([
        store.whatsappHandover.count({
          where: { requestedAt: { gte: today } },
        }),
        store.whatsappHandover.count({ where: { status: 'OPEN' } }),
        store.whatsappInboundMessage.count({
          where: { status: 'FAILED', dlqAcknowledgedAt: null },
        }),
      ]);

    return { handoversToday, openHandovers, pendingDeliveryFailures };
  }

  async listOpenHandovers(limit: number): Promise<WhatsappHandoverDto[]> {
    this.assertEnabled();
    return this.store().whatsappHandover.findMany({
      where: { status: 'OPEN' },
      orderBy: { requestedAt: 'asc' },
      take: this.clampLimit(limit),
      // Deliberadamente no selecciona sessionId ni contactHash.
      select: { id: true, status: true, requestedAt: true },
    });
  }

  async listPendingDeliveryFailures(
    limit: number,
  ): Promise<WhatsappDeliveryFailureDto[]> {
    this.assertEnabled();
    return this.store().whatsappInboundMessage.findMany({
      where: { status: 'FAILED', dlqAcknowledgedAt: null },
      orderBy: { createdAt: 'asc' },
      take: this.clampLimit(limit),
      // Sin sessionId, messageIdHash, chatId, texto o detalles del proveedor.
      select: { id: true, errorCode: true, createdAt: true },
    });
  }

  async acknowledgeHandover(id: number, adminId: number): Promise<boolean> {
    this.assertEnabled();
    const updated = await this.store().whatsappHandover.updateMany({
      where: { id, status: 'OPEN' },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedByUserId: adminId,
      },
    });
    return updated.count === 1;
  }

  async acknowledgeDeliveryFailure(
    id: number,
    adminId: number,
  ): Promise<boolean> {
    this.assertEnabled();
    const updated = await this.store().whatsappInboundMessage.updateMany({
      where: { id, status: 'FAILED', dlqAcknowledgedAt: null },
      data: {
        dlqAcknowledgedAt: new Date(),
        dlqAcknowledgedByUserId: adminId,
      },
    });
    return updated.count === 1;
  }

  private store(source: unknown = this.prisma): OperationsStore {
    return source as OperationsStore;
  }

  private clampLimit(limit: number): number {
    if (!Number.isFinite(limit)) return 30;
    return Math.min(Math.max(Math.floor(limit), 1), MAX_PAGE_SIZE);
  }

  private assertEnabled(): void {
    if (!this.config.operationsEnabled) {
      throw new ServiceUnavailableException(
        'Las operaciones de WhatsApp no están disponibles.',
      );
    }
  }
}
