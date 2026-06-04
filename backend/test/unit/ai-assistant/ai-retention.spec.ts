/**
 * UNIT — AiRetentionService (retención automática de IA).
 *
 *   • Purga mensajes con > RETENTION_DAYS días (cutoff correcto).
 *   • Expira conversaciones antiguas que quedaron vacías (messages none).
 *   • NO toca mensajes recientes (WHERE acotado por fecha).
 *   • Resiliente: un fallo de Prisma → retorna 0 sin lanzar.
 *   • scheduledPurge dispara la purga.
 */
import { AiRetentionService } from '../../../src/ai-assistant/ai-retention.service.js';
import { RETENTION_DAYS } from '../../../src/ai-assistant/ai-assistant.constants.js';

const DAY = 24 * 60 * 60 * 1000;

function makePrisma(over: Record<string, unknown> = {}) {
  return {
    aiMessage: { deleteMany: jest.fn(async () => ({ count: 5 })) },
    aiConversation: { deleteMany: jest.fn(async () => ({ count: 2 })) },
    ...over,
  } as any;
}

describe('AiRetentionService', () => {
  it('RETENTION_DAYS = 3 (política de 3 días)', () => {
    expect(RETENTION_DAYS).toBe(3);
  });

  it('purga mensajes > RETENTION_DAYS y conversaciones vacías; retorna total', async () => {
    const prisma = makePrisma();
    const svc = new AiRetentionService(prisma);

    const before = Date.now();
    const total = await svc.purgeOldConversations();

    expect(total).toBe(7); // 5 mensajes + 2 conversaciones

    // (1) Mensajes: solo los anteriores al cutoff (hoy - RETENTION_DAYS).
    const msgArg = prisma.aiMessage.deleteMany.mock.calls[0][0];
    const lt = msgArg.where.createdAt.lt as Date;
    expect(lt).toBeInstanceOf(Date);
    expect(Math.abs(lt.getTime() - (before - RETENTION_DAYS * DAY))).toBeLessThan(
      5000,
    );

    // (2) Conversaciones: antiguas Y sin mensajes restantes.
    const convArg = prisma.aiConversation.deleteMany.mock.calls[0][0];
    expect(convArg.where.createdAt.lt).toBeInstanceOf(Date);
    expect(convArg.where.messages).toEqual({ none: {} });
  });

  it('sin coincidencias → total 0, sin borrar de más', async () => {
    const prisma = makePrisma({
      aiMessage: { deleteMany: jest.fn(async () => ({ count: 0 })) },
      aiConversation: { deleteMany: jest.fn(async () => ({ count: 0 })) },
    });
    const svc = new AiRetentionService(prisma);

    expect(await svc.purgeOldConversations()).toBe(0);
  });

  it('resiliente: si Prisma falla retorna 0 sin lanzar', async () => {
    const prisma = makePrisma({
      aiMessage: {
        deleteMany: jest.fn(async () => {
          throw new Error('db down');
        }),
      },
    });
    const svc = new AiRetentionService(prisma);

    await expect(svc.purgeOldConversations()).resolves.toBe(0);
  });

  it('scheduledPurge ejecuta la purga', async () => {
    const prisma = makePrisma();
    const svc = new AiRetentionService(prisma);
    const spy = jest.spyOn(svc, 'purgeOldConversations');

    await svc.scheduledPurge();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
