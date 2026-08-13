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
});
