import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`[EMAIL SKIP] RESEND_API_KEY no configurada. OTP para ${to}: ${otp}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.config.get<string>('EMAIL_FROM') ?? 'noreply@tudominio.com',
      to,
      subject: 'Tu código de verificación',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">
          <h2 style="color:#1a1a1a;margin-bottom:8px">Código de verificación</h2>
          <p style="color:#555;margin-bottom:24px">Usa el siguiente código para completar tu registro en OficioApp:</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
            <span style="font-size:48px;font-weight:700;letter-spacing:12px;color:#E07B39">${otp}</span>
          </div>
          <p style="color:#888;font-size:13px">Este código expira en 10 minutos. Si no solicitaste este código, ignora este mensaje.</p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`Error al enviar OTP a ${to}: ${JSON.stringify(error)}`);
      throw new Error(`Error al enviar email: ${error.message}`);
    }

    this.logger.log(`OTP enviado a ${to}`);
  }
}
