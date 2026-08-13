import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { hashLinkCode } from './whatsapp-signature.js';
import { WhatsappAssistantConfig } from './whatsapp-assistant.config.js';

const LINK_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LINK_CODE_LENGTH = 10;

export const LINK_SUCCESS_REPLY =
  'Listo. Vinculamos este WhatsApp a tu cuenta de Servi. Ofi puede orientarte según tu perfil, sin realizar cambios en tu cuenta.';

// Misma respuesta para código inválido, vencido, usado, contacto ocupado o
// configuración incompleta. No habilita enumeración de retos ni cuentas.
export const LINK_FAILURE_REPLY =
  'No pude vincular este WhatsApp. Genera un código nuevo desde tu cuenta de Servi e inténtalo otra vez.';

export interface LinkedWhatsappIdentity {
  role: 'USUARIO' | 'PROVEEDOR';
  providerType: 'OFICIO' | 'PROFESIONAL' | 'NEGOCIO' | null;
}

interface LinkChallengeRow {
  id: number;
  userId: number;
}

interface LinkContactRow {
  userId: number;
}

interface LinkUserRow {
  id: number;
  role: string;
  isActive: boolean;
  deletedAt: Date | null;
  providers: Array<{ type: string }>;
}

/**
 * Delegate tipado a mano hasta el siguiente `prisma generate`. El cliente
 * generado nunca se versiona; CI lo regenera antes de compilar. Mantiene F3
 * compilable en un worktree que aún contiene el cliente de F2.
 */
interface LinkStore {
  whatsappLinkChallenge: {
    create(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<LinkChallengeRow | null>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  whatsappLinkedContact: {
    findUnique(args: unknown): Promise<LinkContactRow | null>;
    deleteMany(args: unknown): Promise<unknown>;
    upsert(args: unknown): Promise<unknown>;
  };
  user: {
    findFirst(args: unknown): Promise<LinkUserRow | null>;
  };
  $transaction<T>(callback: (tx: LinkStore) => Promise<T>): Promise<T>;
}

/**
 * F3: desafío efímero y vínculo actual de un contacto HMAC a una cuenta.
 *
 * No conoce OpenWA ni envía mensajes. El controller entrega el código solo al
 * JWT dueño; el webhook consume el comando exacto después de HMAC, dedup,
 * STOP/HUMANO y preferencias. Nunca registra código, teléfono, JID o texto.
 */
@Injectable()
export class WhatsappLinkService {
  private readonly logger = new Logger(WhatsappLinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: WhatsappAssistantConfig,
  ) {}

  private get store(): LinkStore {
    return this.prisma as unknown as LinkStore;
  }

  /** Genera un código de 50 bits para el usuario autenticado actual. */
  async createLinkCode(
    userId: number,
  ): Promise<{ code: string; expiresAt: Date } | null> {
    if (!this.config.linkOperational) return null;

    const user = await this.activeUser(this.store, userId);
    if (!user) return null;

    // Solo un desafío vigente por cuenta/sesión: solicitar uno nuevo invalida
    // los anteriores. No se borra ningún vínculo existente.
    await this.store.whatsappLinkChallenge.deleteMany({
      where: {
        sessionId: this.config.sessionId,
        userId,
        consumedAt: null,
      },
    });

    const expiresAt = new Date(Date.now() + this.config.linkTtlMs);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = this.generateCode();
      const codeHash = hashLinkCode(
        this.config.sessionId,
        code,
        this.config.linkSecret,
      );
      try {
        await this.store.whatsappLinkChallenge.create({
          data: {
            sessionId: this.config.sessionId,
            codeHash,
            userId,
            expiresAt,
          },
        });
        return { code, expiresAt };
      } catch (error) {
        if (!this.isUniqueViolation(error)) {
          this.logger.warn('No se pudo crear un desafío de vínculo');
          return null;
        }
      }
    }

    // Colisión de 50 bits es extraordinaria; no exponer ni registrar detalles.
    this.logger.warn('No se pudo reservar un código de vínculo');
    return null;
  }

  /** Estado opaco para la cuenta autenticada: jamás devuelve contacto/JID. */
  async isLinked(userId: number): Promise<boolean> {
    if (!this.config.linkOperational) return false;
    const link = await this.store.whatsappLinkedContact.findUnique({
      where: {
        sessionId_userId: { sessionId: this.config.sessionId, userId },
      },
      select: { userId: true },
    });
    return link != null;
  }

  /** Desvincula únicamente el contacto de la cuenta JWT actual. */
  async unlink(userId: number): Promise<boolean> {
    if (!this.config.linkOperational) return false;
    await this.store.whatsappLinkedContact.deleteMany({
      where: { sessionId: this.config.sessionId, userId },
    });
    return true;
  }

  /**
   * Consume el código una vez y vincula el contacto que lo presentó. Devuelve
   * false para TODO fallo; el webhook usa siempre la misma respuesta genérica.
   */
  async consumeCode(contactHash: string, code: string): Promise<boolean> {
    if (!this.config.linkOperational) return false;

    const now = new Date();
    const sessionId = this.config.sessionId;
    const codeHash = hashLinkCode(sessionId, code, this.config.linkSecret);

    try {
      return await this.store.$transaction(async (tx) => {
        const challenge = await tx.whatsappLinkChallenge.findFirst({
          where: {
            sessionId,
            codeHash,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          select: { id: true, userId: true },
        });
        if (!challenge) return false;

        // La cuenta se comprueba dentro de la transacción y en cada inbound.
        const user = await this.activeUser(tx, challenge.userId);
        if (!user) return false;

        const occupied = await tx.whatsappLinkedContact.findUnique({
          where: { sessionId_contactHash: { sessionId, contactHash } },
          select: { userId: true },
        });
        // Nunca reemplazar el contacto de otra cuenta, ni con un código válido.
        if (occupied && occupied.userId !== challenge.userId) return false;

        // Consume atómicamente: dos webhooks concurrentes con el mismo código
        // no pueden completar más de una transacción.
        const consumed = await tx.whatsappLinkChallenge.updateMany({
          where: {
            id: challenge.id,
            sessionId,
            codeHash,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) return false;

        // Reemplazo permitido SOLO para el vínculo anterior del MISMO usuario.
        await tx.whatsappLinkedContact.deleteMany({
          where: {
            sessionId,
            userId: challenge.userId,
            NOT: { contactHash },
          },
        });
        await tx.whatsappLinkedContact.upsert({
          where: { sessionId_contactHash: { sessionId, contactHash } },
          create: { sessionId, contactHash, userId: challenge.userId },
          update: { linkedAt: now },
        });
        return true;
      });
    } catch {
      // Sin detalle: una excepción de BD jamás filtra estado del código/cuenta.
      this.logger.warn('No se pudo consumir un desafío de vínculo');
      return false;
    }
  }

  /** Resuelve contexto vivo. ADMIN siempre cae a USUARIO para WhatsApp. */
  async resolveIdentity(
    contactHash: string,
  ): Promise<LinkedWhatsappIdentity | null> {
    if (!this.config.linkOperational) return null;

    try {
      const link = await this.store.whatsappLinkedContact.findUnique({
        where: {
          sessionId_contactHash: {
            sessionId: this.config.sessionId,
            contactHash,
          },
        },
        select: { userId: true },
      });
      if (!link) return null;

      const user = await this.activeUser(this.store, link.userId);
      if (!user) return null;

      const rawType =
        user.providers.find((provider) => provider.type !== 'NEGOCIO')?.type ??
        user.providers[0]?.type ??
        null;
      const providerType =
        rawType === 'OFICIO' ||
        rawType === 'PROFESIONAL' ||
        rawType === 'NEGOCIO'
          ? rawType
          : null;
      return {
        role: user.role === 'PROVEEDOR' ? 'PROVEEDOR' : 'USUARIO',
        providerType,
      };
    } catch {
      this.logger.warn('No se pudo resolver un vínculo de WhatsApp');
      return null;
    }
  }

  private async activeUser(
    store: Pick<LinkStore, 'user'>,
    userId: number,
  ): Promise<LinkUserRow | null> {
    return store.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
      select: {
        id: true,
        role: true,
        isActive: true,
        deletedAt: true,
        providers: { select: { type: true }, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  private generateCode(): string {
    const bytes = randomBytes(LINK_CODE_LENGTH);
    let code = '';
    for (const byte of bytes) {
      // El alfabeto tiene 32 símbolos: máscara de 5 bits sin sesgo por módulo.
      code += LINK_CODE_ALPHABET[byte & 31];
    }
    return code;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }
}
