import { UnauthorizedException } from '@nestjs/common';
import { WhatsappAssistantController } from './whatsapp-assistant.controller.js';

function fakeRes() {
  const res: any = {
    statusCode: undefined,
    status: jest.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    send: jest.fn(),
  };
  return res;
}

describe('WhatsappAssistantController', () => {
  it('mapea el outcome del service al status HTTP (204)', async () => {
    const service = {
      handleWebhook: jest.fn().mockResolvedValue({ status: 204 }),
    };
    const controller = new WhatsappAssistantController(service as any);
    const req: any = { rawBody: Buffer.from('{}') };
    const res = fakeRes();

    await controller.webhook(req, 'sha256=abc', res);

    expect(service.handleWebhook).toHaveBeenCalledWith(
      req.rawBody,
      'sha256=abc',
    );
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  it('mapea 200 cuando hubo salida', async () => {
    const service = {
      handleWebhook: jest.fn().mockResolvedValue({ status: 200 }),
    };
    const controller = new WhatsappAssistantController(service as any);
    const res = fakeRes();

    await controller.webhook(
      { rawBody: Buffer.from('{}') } as any,
      undefined,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('propaga UnauthorizedException sin tocar la respuesta', async () => {
    const service = {
      handleWebhook: jest.fn().mockRejectedValue(new UnauthorizedException()),
    };
    const controller = new WhatsappAssistantController(service as any);
    const res = fakeRes();

    await expect(
      controller.webhook({ rawBody: Buffer.from('{}') } as any, 'bad', res),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('genera código de vínculo solo para el userId del JWT', async () => {
    const links = {
      createLinkCode: jest
        .fn()
        .mockResolvedValue({ code: 'ABCDEFGHJK', expiresAt: new Date() }),
    };
    const controller = new WhatsappAssistantController({} as any, links as any);

    const out = await controller.createLinkCode({
      user: { userId: 42 },
    } as any);

    expect(links.createLinkCode).toHaveBeenCalledWith(42);
    expect(out.instruction).toContain('VINCULAR ABCDEFGHJK');
  });

  it('estado y desvínculo no exponen contacto', async () => {
    const links = {
      isLinked: jest.fn().mockResolvedValue(true),
      unlink: jest.fn().mockResolvedValue(true),
    };
    const controller = new WhatsappAssistantController({} as any, links as any);
    const req = { user: { userId: 42 } } as any;

    await expect(controller.linkStatus(req)).resolves.toEqual({ linked: true });
    await expect(controller.unlink(req)).resolves.toEqual({ ok: true });
    expect(links.isLinked).toHaveBeenCalledWith(42);
    expect(links.unlink).toHaveBeenCalledWith(42);
  });
});
