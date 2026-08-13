import { createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { WhatsappAssistantService } from './whatsapp-assistant.service.js';
import { WhatsappPolicyService } from './whatsapp-policy.service.js';
import { OpenWaSendError } from './openwa.client.js';
import { HUMAN_HANDOVER_REPLY, OUT_OF_SCOPE_REPLY } from './whatsapp-faq.js';

const SECRET = 'webhook-secret';
const SESSION = 'servi-session-1';
const BASE_URL = 'https://openwa.local';

function buildConfig(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    webhookSecret: SECRET,
    sessionId: SESSION,
    contactHashSecret: 'contact-secret',
    apiKey: 'api-key',
    baseUrl: BASE_URL,
    assertEnabledConfig: jest.fn(() => BASE_URL),
    ...overrides,
  } as any;
}

function buildPrisma() {
  const prisma: any = {
    whatsappInboundMessage: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    whatsappContactPreference: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
  prisma.$transaction = jest.fn(
    async (callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
  );
  return prisma;
}

function payload(
  dataOverrides: Record<string, unknown> = {},
  top: Record<string, unknown> = {},
) {
  return {
    event: 'message.received',
    sessionId: SESSION,
    timestamp: '2026-08-12T00:00:00.000Z',
    data: {
      id: 'true_51999888777@c.us_ABCDEF',
      from: '51999888777@c.us',
      chatId: '51999888777@c.us',
      body: 'hola',
      type: 'text',
      timestamp: 1,
      fromMe: false,
      isGroup: false,
      ...dataOverrides,
    },
    ...top,
  };
}

function bodyAndSig(obj: unknown, secret = SECRET): [Buffer, string] {
  const raw = Buffer.from(JSON.stringify(obj));
  const sig = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
  return [raw, sig];
}

describe('WhatsappAssistantService', () => {
  let prisma: any;
  let config: any;
  let openwa: { sendText: jest.Mock };
  let service: WhatsappAssistantService;

  beforeEach(() => {
    prisma = buildPrisma();
    config = buildConfig();
    openwa = { sendText: jest.fn().mockResolvedValue(undefined) };
    service = new WhatsappAssistantService(
      prisma,
      config,
      new WhatsappPolicyService(),
      openwa as any,
    );
  });

  it('flag apagado → 204, sin BD ni envío ni verificación', async () => {
    config.enabled = false;
    const [raw, sig] = bodyAndSig(payload());
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(config.assertEnabledConfig).not.toHaveBeenCalled();
    expect(prisma.whatsappInboundMessage.create).not.toHaveBeenCalled();
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('firma inválida → 401', async () => {
    const [raw] = bodyAndSig(payload());
    await expect(
      service.handleWebhook(raw, 'sha256=' + '0'.repeat(64)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('firma ausente → 401', async () => {
    const [raw] = bodyAndSig(payload());
    await expect(service.handleWebhook(raw, undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('evento distinto de message.received → 204 sin efectos', async () => {
    const [raw, sig] = bodyAndSig(payload({}, { event: 'message.ack' }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(prisma.whatsappInboundMessage.create).not.toHaveBeenCalled();
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('sessionId distinto → 204 sin efectos', async () => {
    const [raw, sig] = bodyAndSig(payload({}, { sessionId: 'otra-sesion' }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(prisma.whatsappInboundMessage.create).not.toHaveBeenCalled();
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('fromMe=true → 204 sin efectos', async () => {
    const [raw, sig] = bodyAndSig(payload({ fromMe: true }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('grupo (isGroup / @g.us) → 204 sin efectos', async () => {
    const [raw, sig] = bodyAndSig(
      payload({ isGroup: true, chatId: '12036@g.us', from: '12036@g.us' }),
    );
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('texto vacío → 204 sin efectos', async () => {
    const [raw, sig] = bodyAndSig(payload({ body: '   ' }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('messageId ausente → 204 sin efectos', async () => {
    const [raw, sig] = bodyAndSig(payload({ id: '' }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('FAQ válida → crea clave, SEND_STARTED, envía y marca SENT (200)', async () => {
    const [raw, sig] = bodyAndSig(payload({ body: '¿cómo me registro?' }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 200,
    });
    expect(prisma.whatsappInboundMessage.create).toHaveBeenCalledTimes(1);
    const created = prisma.whatsappInboundMessage.create.mock.calls[0][0].data;
    expect(created.messageIdHash).toEqual(expect.any(String));
    expect(created.messageIdHash).not.toContain('51999888777');
    // SEND_STARTED antes de enviar.
    expect(prisma.whatsappInboundMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SEND_STARTED' }),
      }),
    );
    expect(openwa.sendText).toHaveBeenCalledTimes(1);
    const [, sessionId, chatId] = openwa.sendText.mock.calls[0];
    expect(sessionId).toBe(SESSION);
    expect(chatId).toBe('51999888777@c.us');
    expect(prisma.whatsappInboundMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SENT' }),
      }),
    );
  });

  it('duplicado / concurrencia (P2002) → 204 y NO reenvía', async () => {
    prisma.whatsappInboundMessage.create.mockRejectedValueOnce({
      code: 'P2002',
    });
    const [raw, sig] = bodyAndSig(payload({ body: '¿cómo me registro?' }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('STOP → persiste opt-out, marca SUPPRESSED y NO envía (204)', async () => {
    const [raw, sig] = bodyAndSig(payload({ body: 'STOP' }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(prisma.whatsappContactPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ optedOutAt: expect.any(Date) }),
      }),
    );
    expect(prisma.whatsappInboundMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUPPRESSED' }),
      }),
    );
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('HUMANO → persiste pausa y envía UNA sola confirmación (200)', async () => {
    const [raw, sig] = bodyAndSig(
      payload({ body: 'quiero hablar con un humano' }),
    );
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 200,
    });
    expect(prisma.whatsappContactPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ humanHandoverAt: expect.any(Date) }),
      }),
    );
    expect(openwa.sendText).toHaveBeenCalledTimes(1);
    const [, , , text] = openwa.sendText.mock.calls[0];
    expect(text).toBe(HUMAN_HANDOVER_REPLY);
  });

  it('contacto en pausa (handover previo) → 204 y NO responde', async () => {
    prisma.whatsappContactPreference.findUnique.mockResolvedValue({
      optedOutAt: null,
      humanHandoverAt: new Date(),
    });
    const [raw, sig] = bodyAndSig(payload({ body: '¿cómo me registro?' }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('contacto con opt-out previo → 204 y NO responde', async () => {
    prisma.whatsappContactPreference.findUnique.mockResolvedValue({
      optedOutAt: new Date(),
      humanHandoverAt: null,
    });
    const [raw, sig] = bodyAndSig(payload({ body: 'quiero un plan premium' }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 204,
    });
    expect(openwa.sendText).not.toHaveBeenCalled();
  });

  it('fuera de alcance → envía rechazo corto (200)', async () => {
    const [raw, sig] = bodyAndSig(
      payload({ body: 'cuánto cuesta un iphone en el extranjero' }),
    );
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 200,
    });
    expect(openwa.sendText).toHaveBeenCalledTimes(1);
    const [, , , text] = openwa.sendText.mock.calls[0];
    expect(text).toBe(OUT_OF_SCOPE_REPLY);
  });

  it('fallo de envío → marca FAILED con código seguro y no reintenta (200)', async () => {
    openwa.sendText.mockRejectedValueOnce(new OpenWaSendError('SEND_TIMEOUT'));
    const [raw, sig] = bodyAndSig(payload({ body: '¿cómo me registro?' }));
    await expect(service.handleWebhook(raw, sig)).resolves.toEqual({
      status: 200,
    });
    expect(openwa.sendText).toHaveBeenCalledTimes(1);
    expect(prisma.whatsappInboundMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          errorCode: 'SEND_TIMEOUT',
        }),
      }),
    );
  });
});
