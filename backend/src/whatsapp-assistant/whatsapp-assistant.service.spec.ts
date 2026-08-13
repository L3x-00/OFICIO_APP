import { createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { WhatsappAssistantService } from './whatsapp-assistant.service.js';
import { WhatsappPolicyService } from './whatsapp-policy.service.js';
import { OpenWaSendError } from './openwa.client.js';
import { HUMAN_HANDOVER_REPLY, OUT_OF_SCOPE_REPLY } from './whatsapp-faq.js';
import {
  LINK_FAILURE_REPLY,
  LINK_SUCCESS_REPLY,
} from './whatsapp-link.service.js';

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
    linkOperational: false,
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

  it('HUMANO pausa y registra un handover opaco cuando F4 está encendida', async () => {
    const operations = {
      recordHandover: jest.fn().mockResolvedValue(undefined),
    };
    const withOperations = new WhatsappAssistantService(
      prisma,
      config,
      new WhatsappPolicyService(),
      openwa as any,
      undefined,
      undefined,
      operations as any,
    );
    const [raw, sig] = bodyAndSig(payload({ body: 'HUMANO' }));

    await expect(withOperations.handleWebhook(raw, sig)).resolves.toEqual({
      status: 200,
    });

    expect(operations.recordHandover).toHaveBeenCalledWith(
      prisma,
      SESSION,
      expect.any(String),
    );
    expect(openwa.sendText).toHaveBeenCalledTimes(1);
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

  describe('F2 — fallback a Ofi (solo lectura)', () => {
    let aiBridge: { tryAnswer: jest.Mock };
    let withAi: WhatsappAssistantService;

    beforeEach(() => {
      aiBridge = { tryAnswer: jest.fn().mockResolvedValue(null) };
      withAi = new WhatsappAssistantService(
        prisma,
        config,
        new WhatsappPolicyService(),
        openwa as any,
        aiBridge as any,
      );
    });

    it('consulta Servi reconocida + IA con respuesta → envía la respuesta de Ofi', async () => {
      aiBridge.tryAnswer.mockResolvedValue('Ofi puede ayudarte con Servi.');
      const [raw, sig] = bodyAndSig(
        payload({ body: 'quiero buscar gasfiteros en El Tambo' }),
      );
      await expect(withAi.handleWebhook(raw, sig)).resolves.toEqual({
        status: 200,
      });
      const [, , , text] = openwa.sendText.mock.calls[0];
      expect(text).toBe('Ofi puede ayudarte con Servi.');
      // A la IA solo va el texto; el contacto va como HMAC, nunca el teléfono.
      const [sentText, contactHash] = aiBridge.tryAnswer.mock.calls[0];
      expect(sentText).toBe('quiero buscar gasfiteros en El Tambo');
      expect(contactHash).not.toContain('51999888777');
    });

    it('fuera de alcance → rechazo determinista sin tocar la IA', async () => {
      const [raw, sig] = bodyAndSig(payload({ body: 'quien gano la copa' }));
      await expect(withAi.handleWebhook(raw, sig)).resolves.toEqual({
        status: 200,
      });
      const [, , , text] = openwa.sendText.mock.calls[0];
      expect(text).toBe(OUT_OF_SCOPE_REPLY);
      expect(aiBridge.tryAnswer).not.toHaveBeenCalled();
    });

    it('FAQ conocida + Ofi sin respuesta → conserva fallback determinista', async () => {
      const [raw, sig] = bodyAndSig(payload({ body: '¿cómo me registro?' }));
      await expect(withAi.handleWebhook(raw, sig)).resolves.toEqual({
        status: 200,
      });
      expect(aiBridge.tryAnswer).toHaveBeenCalledTimes(1);
    });

    it('STOP y HUMANO nunca llegan a la IA', async () => {
      const [rawStop, sigStop] = bodyAndSig(payload({ body: 'STOP' }));
      await withAi.handleWebhook(rawStop, sigStop);
      const [rawHum, sigHum] = bodyAndSig(
        payload({ id: 'otro-id', body: 'quiero un humano' }),
      );
      await withAi.handleWebhook(rawHum, sigHum);
      expect(aiBridge.tryAnswer).not.toHaveBeenCalled();
    });

    it('contacto dado de baja → no responde ni consulta la IA', async () => {
      prisma.whatsappContactPreference.findUnique.mockResolvedValue({
        optedOutAt: new Date(),
        humanHandoverAt: null,
      });
      const [raw, sig] = bodyAndSig(payload({ body: 'una duda cualquiera' }));
      await expect(withAi.handleWebhook(raw, sig)).resolves.toEqual({
        status: 204,
      });
      expect(aiBridge.tryAnswer).not.toHaveBeenCalled();
      expect(openwa.sendText).not.toHaveBeenCalled();
    });

    it('duplicado (P2002) → no consulta la IA ni reenvía', async () => {
      prisma.whatsappInboundMessage.create.mockRejectedValueOnce({
        code: 'P2002',
      });
      const [raw, sig] = bodyAndSig(payload({ body: 'una duda cualquiera' }));
      await expect(withAi.handleWebhook(raw, sig)).resolves.toEqual({
        status: 204,
      });
      expect(aiBridge.tryAnswer).not.toHaveBeenCalled();
      expect(openwa.sendText).not.toHaveBeenCalled();
    });
  });

  describe('F3 — vínculo seguro y contexto vivo', () => {
    let aiBridge: { tryAnswer: jest.Mock; tryAnswerLinked: jest.Mock };
    let links: { consumeCode: jest.Mock; resolveIdentity: jest.Mock };
    let withF3: WhatsappAssistantService;

    beforeEach(() => {
      aiBridge = {
        tryAnswer: jest.fn().mockResolvedValue(null),
        tryAnswerLinked: jest.fn().mockResolvedValue(null),
      };
      links = {
        consumeCode: jest.fn().mockResolvedValue(false),
        resolveIdentity: jest.fn().mockResolvedValue(null),
      };
      withF3 = new WhatsappAssistantService(
        prisma,
        buildConfig({ linkOperational: true }),
        new WhatsappPolicyService(),
        openwa as any,
        aiBridge as any,
        links as any,
      );
    });

    it('VINCULAR válido consume una vez y responde confirmación', async () => {
      links.consumeCode.mockResolvedValue(true);
      const [raw, sig] = bodyAndSig(payload({ body: 'VINCULAR ABCDEFGHJK' }));

      await expect(withF3.handleWebhook(raw, sig)).resolves.toEqual({
        status: 200,
      });
      expect(links.consumeCode).toHaveBeenCalledWith(
        expect.any(String),
        'ABCDEFGHJK',
      );
      expect(openwa.sendText.mock.calls[0][3]).toBe(LINK_SUCCESS_REPLY);
      expect(aiBridge.tryAnswer).not.toHaveBeenCalled();
      expect(aiBridge.tryAnswerLinked).not.toHaveBeenCalled();
    });

    it('F3 apagada → no consume código y conserva respuesta determinista F1', async () => {
      const withLinkDisabled = new WhatsappAssistantService(
        prisma,
        buildConfig({ linkOperational: false }),
        new WhatsappPolicyService(),
        openwa as any,
        aiBridge as any,
        links as any,
      );
      const [raw, sig] = bodyAndSig(payload({ body: 'VINCULAR ABCDEFGHJK' }));

      await withLinkDisabled.handleWebhook(raw, sig);

      expect(links.consumeCode).not.toHaveBeenCalled();
      expect(openwa.sendText.mock.calls[0][3]).toBe(OUT_OF_SCOPE_REPLY);
    });

    it('VINCULAR inválido usa respuesta genérica sin llamar a Ofi', async () => {
      const [raw, sig] = bodyAndSig(payload({ body: 'VINCULAR ABCDEFGHJK' }));

      await withF3.handleWebhook(raw, sig);

      expect(openwa.sendText.mock.calls[0][3]).toBe(LINK_FAILURE_REPLY);
      expect(aiBridge.tryAnswer).not.toHaveBeenCalled();
      expect(aiBridge.tryAnswerLinked).not.toHaveBeenCalled();
    });

    it('STOP y HUMANO no consumen vínculo', async () => {
      const [rawStop, sigStop] = bodyAndSig(
        payload({ body: 'STOP VINCULAR ABCDEFGHJK' }),
      );
      await withF3.handleWebhook(rawStop, sigStop);
      const [rawHuman, sigHuman] = bodyAndSig(
        payload({ id: 'f3-human', body: 'humano VINCULAR ABCDEFGHJK' }),
      );
      await withF3.handleWebhook(rawHuman, sigHuman);

      expect(links.consumeCode).not.toHaveBeenCalled();
    });

    it('vínculo vivo usa ruta Ofi vinculada, no persona pública', async () => {
      links.resolveIdentity.mockResolvedValue({
        role: 'PROVEEDOR',
        providerType: 'OFICIO',
      });
      aiBridge.tryAnswerLinked.mockResolvedValue('Respuesta segura de Ofi');
      const [raw, sig] = bodyAndSig(
        payload({ body: 'quiero buscar un gasfitero' }),
      );

      await withF3.handleWebhook(raw, sig);

      expect(aiBridge.tryAnswerLinked).toHaveBeenCalledWith(
        'quiero buscar un gasfitero',
        expect.any(String),
        { role: 'PROVEEDOR', providerType: 'OFICIO' },
      );
      expect(aiBridge.tryAnswer).not.toHaveBeenCalled();
    });

    it('sin vínculo no puede llamar la ruta personalizada', async () => {
      const [raw, sig] = bodyAndSig(
        payload({ body: 'quiero un electricista' }),
      );

      await withF3.handleWebhook(raw, sig);

      expect(aiBridge.tryAnswerLinked).not.toHaveBeenCalled();
      expect(aiBridge.tryAnswer).toHaveBeenCalledTimes(1);
    });
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
