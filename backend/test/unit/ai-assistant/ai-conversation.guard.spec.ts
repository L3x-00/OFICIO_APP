/**
 * UNIT — AiConversationService.getOrCreate (auditoría null-constraint).
 *
 * EVIDENCIA EJECUTABLE de QUÉ campo provoca la violación NOT NULL en
 * `prisma.aiConversation.create()`.
 *
 * Schema `AiConversation`:
 *   id            Int      @id @default(autoincrement())   ← DB
 *   userId        Int                                       ← NOT NULL, SIN default
 *   promptVersion String   @default("v1")                   ← NOT NULL, con default
 *   createdAt     DateTime @default(now())                  ← con default
 *
 * El payload del create es `{ userId, promptVersion }`. `promptVersion` jamás
 * llega null (flags `|| 'v1'` + coerción a AI_PROMPT_VERSION) y además tiene
 * default. ⇒ el ÚNICO campo capaz de romper la restricción es `userId`.
 *
 * El guard degrada a null (NO inserta) cuando userId no es entero positivo,
 * en lugar de fabricar un id hardcodeado.
 */
jest.mock('@sentry/nestjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

import { AiConversationService } from '../../../src/ai-assistant/ai-conversation.service.js';
import { AI_PROMPT_VERSION } from '../../../src/ai-assistant/ai-assistant.constants.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';

function makePrismaMock() {
  const create = jest.fn(async (_args?: any) => ({ id: 123 }));
  const findFirst = jest.fn(async (_args?: any) => null);
  const prisma = {
    aiConversation: { create, findFirst },
  } as unknown as PrismaService;
  return { prisma, create, findFirst };
}

describe('AiConversationService.getOrCreate (guard null-constraint)', () => {
  it('userId = 0 → null y NUNCA llama create (evita el NOT NULL)', async () => {
    const { prisma, create, findFirst } = makePrismaMock();
    const svc = new AiConversationService(prisma);

    const r = await svc.getOrCreate(0, 'v1');

    expect(r).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    NaN,
    -1,
    1.5,
    undefined as unknown as number,
    null as unknown as number,
  ])('userId no-entero-positivo (%p) → null sin insertar', async (bad) => {
    const { prisma, create } = makePrismaMock();
    const svc = new AiConversationService(prisma);

    const r = await svc.getOrCreate(bad, 'v1');

    expect(r).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('userId válido → create recibe { userId, promptVersion } NO nulos', async () => {
    const { prisma, create } = makePrismaMock();
    const svc = new AiConversationService(prisma);

    const r = await svc.getOrCreate(7, 'v2');

    expect(r).toBe(123);
    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data.userId).toBe(7);
    expect(data.promptVersion).toBe('v2');
    // Ningún campo del payload llega null/undefined → no hay infractor.
    expect(data.userId).not.toBeNull();
    expect(data.userId).not.toBeUndefined();
    expect(data.promptVersion).not.toBeNull();
  });

  it('promptVersion vacío → usa AI_PROMPT_VERSION (constante, no hardcode)', async () => {
    const { prisma, create } = makePrismaMock();
    const svc = new AiConversationService(prisma);

    await svc.getOrCreate(7, '   ');

    const data = create.mock.calls[0][0].data;
    expect(data.promptVersion).toBe(AI_PROMPT_VERSION);
    expect(typeof data.promptVersion).toBe('string');
    expect(data.promptVersion).not.toBe('');
  });

  it('reusa la conversación existente sin volver a crear', async () => {
    const { prisma, create, findFirst } = makePrismaMock();
    findFirst.mockResolvedValueOnce({ id: 55 } as never);
    const svc = new AiConversationService(prisma);

    const r = await svc.getOrCreate(7, 'v1');

    expect(r).toBe(55);
    expect(create).not.toHaveBeenCalled();
  });
});
