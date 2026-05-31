/**
 * INTEGRATION — Auditoría de conversación (persistencia + retención).
 *
 * BD real (oficio_test_db). Gemini + Sentry mockeados (ESM). Servicios de
 * persistencia REALES (AiConversationService, AiRetentionService). NO se
 * modifica lógica productiva.
 *
 *   1. Persistencia completa (userId, conversationId, tokens, flags, latencia).
 *   2. Historial largo (100) → solo los últimos 10 van a Gemini.
 *   3. Retención: conversaciones >90d se eliminan.
 *   4. Aislamiento: usuarios A y B nunca mezclan mensajes.
 *   5. Soft failure: Gemini falla → conversación auditada + error registrado.
 */
import {
  getTestPrisma,
  disconnectTestPrisma,
  truncateAll,
} from '../../utils/db.util';
import { createTestUser } from '../../utils/factories';
import type { PrismaService } from '../../../prisma/prisma.service.js';

const mockGenerateContent = jest.fn();
const sentryCaptureException = jest.fn();

(jest as any).unstable_mockModule('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  FunctionCallingConfigMode: { AUTO: 'AUTO' },
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
  },
}));
(jest as any).unstable_mockModule('@sentry/nestjs', () => ({
  captureMessage: jest.fn(),
  captureException: sentryCaptureException,
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
let AiAssistantService: any;
let AiConversationService: any;
let AiSanitizerService: any;
let AiGuardrailsService: any;
let AiRetentionService: any;

const DAY = 24 * 60 * 60 * 1000;

describe('Conversation audit (integration, BD real)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ AiAssistantService } = await import(
      '../../../src/ai-assistant/ai-assistant.service.js'
    ));
    ({ AiConversationService } = await import(
      '../../../src/ai-assistant/ai-conversation.service.js'
    ));
    ({ AiSanitizerService } = await import(
      '../../../src/ai-assistant/ai-sanitizer.service.js'
    ));
    ({ AiGuardrailsService } = await import(
      '../../../src/ai-assistant/ai-guardrails.service.js'
    ));
    ({ AiRetentionService } = await import(
      '../../../src/ai-assistant/ai-retention.service.js'
    ));
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "ai_messages", "ai_conversations" RESTART IDENTITY CASCADE;',
    );
    mockGenerateContent.mockReset();
    sentryCaptureException.mockReset();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  /** Service con conversación REAL (BD) + infra mockeada. */
  function build() {
    const mem = new Map<string, unknown>();
    const cache = {
      get: async (k: string) => mem.get(k),
      set: async (k: string, v: unknown) => {
        mem.set(k, v);
      },
    };
    const config = {
      get: (k: string) => (k === 'GEMINI_API_KEY' ? 'test-key' : undefined),
    };
    const flags = {
      promptVersion: () => 'v1',
      isToolEnabled: () => false,
      isEnabledForRole: () => true,
    };
    const breaker = {
      canRequest: async () => ({ allowed: true, state: 'CLOSED' }),
      recordSuccess: async () => {},
      recordFailure: async () => {},
    };
    const knowledge = { getKnowledgeContext: async () => '' };

    return new AiAssistantService(
      config as any,
      flags as any,
      breaker as any,
      new AiSanitizerService(),
      new AiGuardrailsService(),
      knowledge as any,
      {} as any, // data — sin tools
      new AiConversationService(prisma),
      cache as any,
    );
  }

  it('Case 1: persistencia completa (userId, conversationId, tokens, flags, latencia)', async () => {
    const u = await createTestUser(prisma);
    mockGenerateContent.mockResolvedValue({
      text: 'Hola, soy Ofi.',
      functionCalls: undefined,
      usageMetadata: { totalTokenCount: 7 },
    });

    await build().chat(
      { userId: u.id, role: 'USUARIO', providerType: null },
      '¿qué es Servi?',
    );

    const conv = await prisma.aiConversation.findFirst({ where: { userId: u.id } });
    expect(conv).not.toBeNull();
    expect(conv!.userId).toBe(u.id);
    expect(conv!.promptVersion).toBe('v1');

    const msgs = await prisma.aiMessage.findMany({
      where: { conversationId: conv!.id },
      orderBy: { id: 'asc' },
    });
    expect(msgs).toHaveLength(2); // user + model
    const userMsg = msgs.find((m) => m.role === 'user')!;
    const modelMsg = msgs.find((m) => m.role === 'model')!;

    expect(userMsg.conversationId).toBe(conv!.id);
    expect(userMsg.flagged).toBe(false);
    expect(userMsg.moderationPass).toBe(true);

    expect(modelMsg.tokensUsed).toBe(7);
    expect(typeof modelMsg.responseTimeMs).toBe('number');
    expect(modelMsg.responseTimeMs!).toBeGreaterThanOrEqual(0);
    expect(modelMsg.flagged).toBe(false);
    expect(modelMsg.moderationPass).toBe(true);
  });

  it('Case 2: 100 mensajes en historial → solo los últimos 10 viajan a Gemini', async () => {
    const u = await createTestUser(prisma);
    const conv = await prisma.aiConversation.create({
      data: { userId: u.id, promptVersion: 'v1' },
    });
    const base = Date.now() - 10_000_000;
    for (let i = 0; i < 100; i++) {
      await prisma.aiMessage.create({
        data: {
          conversationId: conv.id,
          role: i % 2 === 0 ? 'user' : 'model',
          content: `hist-${i}`,
          createdAt: new Date(base + i * 1000),
        },
      });
    }

    mockGenerateContent.mockResolvedValue({
      text: 'ok',
      functionCalls: undefined,
      usageMetadata: { totalTokenCount: 3 },
    });

    await build().chat(
      { userId: u.id, role: 'USUARIO', providerType: null },
      'mensaje nuevo',
    );

    const contents = mockGenerateContent.mock.calls[0][0].contents;
    expect(contents).toHaveLength(11); // 10 de historial + 1 actual
    expect(contents[contents.length - 1].parts[0].text).toBe('mensaje nuevo');

    const flat = JSON.stringify(contents);
    expect(flat).toContain('hist-99'); // el más reciente del historial
    expect(flat).toContain('hist-90');
    expect(flat).not.toContain('hist-89'); // el 11º más reciente NO viaja
    expect(flat).not.toContain('hist-0"'); // el más viejo tampoco
  });

  it('Case 3: conversaciones >90 días → AiRetentionService.purgeOldConversations las elimina', async () => {
    const u = await createTestUser(prisma);
    const old = await prisma.aiConversation.create({
      data: { userId: u.id, createdAt: new Date(Date.now() - 95 * DAY) },
    });
    await prisma.aiMessage.create({
      data: {
        conversationId: old.id,
        role: 'user',
        content: 'viejo',
        createdAt: new Date(Date.now() - 95 * DAY),
      },
    });
    const recent = await prisma.aiConversation.create({
      data: { userId: u.id, createdAt: new Date() },
    });

    const purged = await new AiRetentionService(prisma).purgeOldConversations();

    expect(purged).toBeGreaterThanOrEqual(1);
    expect(
      await prisma.aiConversation.findUnique({ where: { id: old.id } }),
    ).toBeNull(); // viejo eliminado
    expect(
      await prisma.aiConversation.findUnique({ where: { id: recent.id } }),
    ).not.toBeNull(); // reciente intacto
    expect(
      await prisma.aiMessage.count({ where: { conversationId: old.id } }),
    ).toBe(0); // mensajes viejos por cascade
  });

  it('Case 4: usuarios A y B → conversaciones aisladas, nunca mezclan mensajes', async () => {
    const a = await createTestUser(prisma);
    const b = await createTestUser(prisma);
    mockGenerateContent.mockResolvedValue({
      text: 'ok',
      functionCalls: undefined,
      usageMetadata: { totalTokenCount: 2 },
    });
    const service = build();

    await service.chat({ userId: a.id, role: 'USUARIO', providerType: null }, 'soy A');
    await service.chat({ userId: b.id, role: 'USUARIO', providerType: null }, 'soy B');

    const convA = await prisma.aiConversation.findFirst({ where: { userId: a.id } });
    const convB = await prisma.aiConversation.findFirst({ where: { userId: b.id } });
    expect(convA!.id).not.toBe(convB!.id);

    const msgsA = await prisma.aiMessage.findMany({
      where: { conversationId: convA!.id },
    });
    const msgsB = await prisma.aiMessage.findMany({
      where: { conversationId: convB!.id },
    });
    expect(msgsA.some((m) => m.content === 'soy A')).toBe(true);
    expect(msgsA.some((m) => m.content === 'soy B')).toBe(false);
    expect(msgsB.some((m) => m.content === 'soy B')).toBe(true);
    expect(msgsB.some((m) => m.content === 'soy A')).toBe(false);
  });

  it('Case 5: Gemini falla → conversación auditada (user msg persiste) + error registrado', async () => {
    const u = await createTestUser(prisma);
    mockGenerateContent.mockRejectedValue(new Error('gemini caído'));

    const result = await build().chat(
      { userId: u.id, role: 'USUARIO', providerType: null },
      'hola con fallo',
    );

    // Respuesta controlada.
    expect(result.meta.blocked).toBe(true);
    expect(result.meta.reason).toBe('circuit');

    // Conversación auditada: el mensaje del usuario quedó persistido.
    const conv = await prisma.aiConversation.findFirst({ where: { userId: u.id } });
    expect(conv).not.toBeNull();
    const msgs = await prisma.aiMessage.findMany({
      where: { conversationId: conv!.id },
    });
    expect(
      msgs.some((m) => m.role === 'user' && m.content === 'hola con fallo'),
    ).toBe(true);
    // El modelo NO alcanzó a persistir (falló antes).
    expect(msgs.some((m) => m.role === 'model')).toBe(false);

    // Error registrado en Sentry.
    expect(sentryCaptureException).toHaveBeenCalled();
  });
});
