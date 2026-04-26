import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: BrevoClient | null = null;
  private senderEmail: string;
  private senderName: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('BREVO_API_KEY');

    if (!apiKey) {
      this.logger.warn('[EMAIL SKIP] BREVO_API_KEY no configurada. Los correos no se enviarán.');
    } else {
      this.client = new BrevoClient({ apiKey });
    }

    const emailFrom = this.config.get<string>('EMAIL_FROM') ?? 'noreply@oficioapp.pe';
    // EMAIL_FROM puede ser "Nombre <email>" o solo "email"
    const match = emailFrom.match(/^(.+?)\s*<(.+?)>$/);
    this.senderEmail = match ? match[2].trim() : emailFrom.trim();
    this.senderName  = match ? match[1].trim() : 'OficioApp';
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    if (!this.client) {
      this.logger.warn(`[EMAIL SKIP] BREVO_API_KEY no configurada. OTP para ${to}: ${otp}`);
      return;
    }

    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender:      { email: this.senderEmail, name: this.senderName },
        to:          [{ email: to }],
        subject:     'Tu código de verificación',
        htmlContent: `
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
      this.logger.log(`OTP enviado a ${to}`);
    } catch (error) {
      this.logger.error(`Error al enviar OTP a ${to}: ${(error as Error).message ?? error}`);
      throw new Error(`Error al enviar email: ${(error as Error).message}`);
    }
  }
}
