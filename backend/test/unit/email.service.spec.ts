/**
 * UNIT — EmailService (Brevo).
 * Lo crítico: degradación elegante sin BREVO_API_KEY (default en test/dev →
 * NO debe crashear ningún flujo de auth), parseo de EMAIL_FROM, manejo de
 * errores (OTP/reset re-lanzan; los branded son best-effort y NO lanzan),
 * y el conteo/chunking del broadcast.
 */
jest.mock('@getbrevo/brevo', () => ({
  BrevoClient: jest.fn().mockImplementation(() => ({
    transactionalEmails: { sendTransacEmail: jest.fn() },
  })),
}));
import { BrevoClient } from '@getbrevo/brevo';
import { EmailService } from '../../src/email/email.service.js';
import { createConfigMock } from '../mocks/config.mock';

describe('EmailService (unit)', () => {
  describe('sin BREVO_API_KEY (degradación elegante)', () => {
    let service: EmailService;
    beforeEach(() => {
      jest.clearAllMocks();
      // createConfigMock no define BREVO_API_KEY → undefined → client null.
      service = new EmailService(createConfigMock() as any);
    });

    it('sendOtpEmail no envía ni lanza', async () => {
      await expect(
        service.sendOtpEmail('a@b.com', '123456'),
      ).resolves.toBeUndefined();
    });

    it('no escribe OTP, códigos, URLs ni destinatarios en logs de fallback', async () => {
      const warn = jest.spyOn((service as any).logger, 'warn');

      await service.sendOtpEmail('secret@example.com', '123456');
      await service.sendPasswordResetEmail('secret@example.com', '654321');
      await service.sendAdminPasswordResetEmail(
        'secret@example.com',
        'https://example.com/reset?token=super-secret',
      );

      const logs = warn.mock.calls.flat().join(' ');
      expect(logs).not.toContain('secret@example.com');
      expect(logs).not.toContain('123456');
      expect(logs).not.toContain('654321');
      expect(logs).not.toContain('super-secret');
    });

    it('sendWelcomeEmail no lanza', async () => {
      await expect(
        service.sendWelcomeEmail('a@b.com', 'Ana'),
      ).resolves.toBeUndefined();
    });

    it('sendBroadcastEmail devuelve 0 (no hay cliente)', async () => {
      await expect(
        service.sendBroadcastEmail(['a@b.com'], 's', 'm'),
      ).resolves.toBe(0);
    });
  });

  describe('con BREVO_API_KEY', () => {
    let service: EmailService;
    let sendTransac: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      sendTransac = jest.fn().mockResolvedValue(undefined);
      (BrevoClient as unknown as jest.Mock).mockImplementation(() => ({
        transactionalEmails: { sendTransacEmail: sendTransac },
      }));
      service = new EmailService(
        createConfigMock({
          BREVO_API_KEY: 'key',
          EMAIL_FROM: 'Servi Soporte <hi@servi.pe>',
        }) as any,
      );
    });

    it('sendOtpEmail: envía con el OTP en el cuerpo y el sender parseado de EMAIL_FROM', async () => {
      await service.sendOtpEmail('a@b.com', '987654');
      expect(sendTransac).toHaveBeenCalledTimes(1);
      const arg = sendTransac.mock.calls[0][0];
      expect(arg.sender).toEqual({
        email: 'hi@servi.pe',
        name: 'Servi Soporte',
      });
      expect(arg.to).toEqual([{ email: 'a@b.com' }]);
      expect(arg.htmlContent).toContain('987654');
    });

    it('sendOtpEmail: si el envío falla → re-lanza (el caller debe enterarse)', async () => {
      sendTransac.mockRejectedValue(new Error('brevo down'));
      await expect(service.sendOtpEmail('a@b.com', '1')).rejects.toThrow(
        /Error al enviar email/,
      );
    });

    it('sendWelcomeEmail (branded): si falla, NO lanza (best-effort)', async () => {
      sendTransac.mockRejectedValue(new Error('brevo down'));
      await expect(
        service.sendWelcomeEmail('a@b.com'),
      ).resolves.toBeUndefined();
    });

    it('sendBroadcastEmail: cuenta los exitosos y envía individualmente', async () => {
      const recipients = Array.from({ length: 25 }, (_, i) => `u${i}@b.com`);
      const sent = await service.sendBroadcastEmail(
        recipients,
        'Promo',
        'Hola',
      );
      expect(sent).toBe(25);
      expect(sendTransac).toHaveBeenCalledTimes(25);
    });

    it('sendBroadcastEmail: los que fallan no cuentan', async () => {
      sendTransac
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('x'))
        .mockResolvedValue(undefined);
      const sent = await service.sendBroadcastEmail(
        ['a@b.com', 'b@b.com', 'c@b.com'],
        's',
        'm',
      );
      expect(sent).toBe(2);
    });
  });
});
