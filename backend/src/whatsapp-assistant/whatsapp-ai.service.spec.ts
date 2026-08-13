import { WhatsappAiService, toWhatsappText } from './whatsapp-ai.service.js';

function buildConfig(overrides: Record<string, unknown> = {}) {
  return {
    aiEnabled: true,
    aiDailyPerContact: 10,
    aiTimeoutMs: 12000,
    aiMaxInputChars: 600,
    aiMaxReplyChars: 900,
    ...overrides,
  } as any;
}

function buildQuota(overrides: Record<string, unknown> = {}) {
  return {
    available: true,
    incrementWithLimit: jest.fn().mockResolvedValue({ allowed: true, count: 1 }),
    ...overrides,
  } as any;
}

describe('WhatsappAiService', () => {
  let ai: { chatPublicReadOnly: jest.Mock };

  beforeEach(() => {
    ai = {
      chatPublicReadOnly: jest.fn().mockResolvedValue({ reply: 'Hola desde Ofi' }),
    };
  });

  it('flag apagado → no llama a la IA', async () => {
    const quota = buildQuota();
    const svc = new WhatsappAiService(
      buildConfig({ aiEnabled: false }),
      ai as any,
      quota,
    );
    await expect(svc.tryAnswer('algo raro', 'hash')).resolves.toBeNull();
    expect(ai.chatPublicReadOnly).not.toHaveBeenCalled();
    expect(quota.incrementWithLimit).not.toHaveBeenCalled();
  });

  it('sin AiAssistantService inyectado → null', async () => {
    const svc = new WhatsappAiService(buildConfig(), undefined, buildQuota());
    await expect(svc.tryAnswer('algo raro', 'hash')).resolves.toBeNull();
  });

  it('texto vacío → null sin consumir cuota', async () => {
    const quota = buildQuota();
    const svc = new WhatsappAiService(buildConfig(), ai as any, quota);
    await expect(svc.tryAnswer('   ', 'hash')).resolves.toBeNull();
    expect(quota.incrementWithLimit).not.toHaveBeenCalled();
    expect(ai.chatPublicReadOnly).not.toHaveBeenCalled();
  });

  it('texto más largo que el máximo → null sin llamar a la IA', async () => {
    const quota = buildQuota();
    const svc = new WhatsappAiService(
      buildConfig({ aiMaxInputChars: 20 }),
      ai as any,
      quota,
    );
    await expect(svc.tryAnswer('x'.repeat(21), 'hash')).resolves.toBeNull();
    expect(quota.incrementWithLimit).not.toHaveBeenCalled();
    expect(ai.chatPublicReadOnly).not.toHaveBeenCalled();
  });

  it('sin contador atómico (Redis caído) → FAIL-CLOSED, no gasta IA', async () => {
    const svc = new WhatsappAiService(
      buildConfig(),
      ai as any,
      buildQuota({ available: false }),
    );
    await expect(svc.tryAnswer('consulta', 'hash')).resolves.toBeNull();
    expect(ai.chatPublicReadOnly).not.toHaveBeenCalled();
  });

  it('sin AiQuotaService inyectado → FAIL-CLOSED', async () => {
    const svc = new WhatsappAiService(buildConfig(), ai as any, undefined);
    await expect(svc.tryAnswer('consulta', 'hash')).resolves.toBeNull();
    expect(ai.chatPublicReadOnly).not.toHaveBeenCalled();
  });

  it('tope diario del contacto alcanzado → null sin llamar a la IA', async () => {
    const quota = buildQuota({
      incrementWithLimit: jest
        .fn()
        .mockResolvedValue({ allowed: false, count: 11 }),
    });
    const svc = new WhatsappAiService(buildConfig(), ai as any, quota);
    await expect(svc.tryAnswer('consulta', 'hash-abc')).resolves.toBeNull();
    expect(quota.incrementWithLimit).toHaveBeenCalledWith(
      'wa:ai:daily:hash-abc',
      10,
      expect.any(Number),
    );
    expect(ai.chatPublicReadOnly).not.toHaveBeenCalled();
  });

  it('respuesta de Ofi → texto formateado, y sólo viaja el mensaje', async () => {
    ai.chatPublicReadOnly.mockResolvedValue({
      reply: '**Servi** es un marketplace.\n\n\n¿Buscas algo?',
    });
    const svc = new WhatsappAiService(buildConfig(), ai as any, buildQuota());
    await expect(svc.tryAnswer('¿qué es esto?', 'hash-abc')).resolves.toBe(
      '*Servi* es un marketplace.\n\n¿Buscas algo?',
    );
    expect(ai.chatPublicReadOnly).toHaveBeenCalledWith('¿qué es esto?', {
      timeoutMs: 12000,
    });
    // El contacto (aunque ya sea HMAC) nunca se pasa a la IA.
    expect(JSON.stringify(ai.chatPublicReadOnly.mock.calls[0])).not.toContain(
      'hash-abc',
    );
  });

  it('IA bloqueada / sin respuesta (null) → null', async () => {
    ai.chatPublicReadOnly.mockResolvedValue(null);
    const svc = new WhatsappAiService(buildConfig(), ai as any, buildQuota());
    await expect(svc.tryAnswer('consulta', 'hash')).resolves.toBeNull();
  });

  it('respuesta vacía tras formatear → null', async () => {
    ai.chatPublicReadOnly.mockResolvedValue({ reply: '   \n  ' });
    const svc = new WhatsappAiService(buildConfig(), ai as any, buildQuota());
    await expect(svc.tryAnswer('consulta', 'hash')).resolves.toBeNull();
  });

  it('excepción inesperada de la IA → null (nunca propaga)', async () => {
    ai.chatPublicReadOnly.mockRejectedValue(new Error('boom'));
    const svc = new WhatsappAiService(buildConfig(), ai as any, buildQuota());
    await expect(svc.tryAnswer('consulta', 'hash')).resolves.toBeNull();
  });
});

describe('toWhatsappText', () => {
  it('convierte markdown de chat web a formato WhatsApp', () => {
    const out = toWhatsappText(
      '## Título\n**negrita** y `código`\n> cita',
      900,
    );
    expect(out).toBe('Título\n*negrita* y código\ncita');
  });

  it('recorta al máximo sin partir palabras y agrega elipsis', () => {
    const out = toWhatsappText('palabra '.repeat(50), 30);
    expect(out.length).toBeLessThanOrEqual(31);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('palab…');
  });

  it('respeta textos cortos sin tocarlos', () => {
    expect(toWhatsappText('Hola', 900)).toBe('Hola');
  });
});
