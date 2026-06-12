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
      this.logger.warn(
        '[EMAIL SKIP] BREVO_API_KEY no configurada. Los correos no se enviarán.',
      );
    } else {
      this.client = new BrevoClient({ apiKey });
    }

    const emailFrom =
      this.config.get<string>('EMAIL_FROM') ?? 'noreply@oficioapp.pe';
    // EMAIL_FROM puede ser "Nombre <email>" o solo "email"
    const match = emailFrom.match(/^(.+?)\s*<(.+?)>$/);
    this.senderEmail = match ? match[2].trim() : emailFrom.trim();
    this.senderName = match ? match[1].trim() : 'Servi';
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    if (!this.client) {
      this.logger.warn(
        `[EMAIL SKIP] BREVO_API_KEY no configurada. OTP para ${to}: ${otp}`,
      );
      return;
    }

    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: 'Tu código de verificación',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">
            <h2 style="color:#1a1a1a;margin-bottom:8px">Código de verificación</h2>
            <p style="color:#555;margin-bottom:24px">Usa el siguiente código para completar tu registro en Servi:</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
              <span style="font-size:48px;font-weight:700;letter-spacing:12px;color:#E07B39">${otp}</span>
            </div>
            <p style="color:#888;font-size:13px">Este código expira en 10 minutos. Si no solicitaste este código, ignora este mensaje.</p>
          </div>
        `,
      });
      this.logger.log(`OTP enviado a ${to}`);
    } catch (error) {
      this.logger.error(
        `Error al enviar OTP a ${to}: ${(error as Error).message ?? error}`,
      );
      throw new Error(`Error al enviar email: ${(error as Error).message}`);
    }
  }

  /**
   * Email de restablecimiento por ENLACE (flujo iniciado por el admin). A
   * diferencia del código de 6 dígitos, lleva un link con token seguro para
   * que el proveedor cambie su contraseña él mismo.
   */
  async sendAdminPasswordResetEmail(
    to: string,
    resetUrl: string,
    firstName?: string,
  ): Promise<void> {
    if (!this.client) {
      this.logger.warn(
        `[EMAIL SKIP] BREVO_API_KEY no configurada. Reset URL para ${to}: ${resetUrl}`,
      );
      return;
    }
    const hello = firstName ? `Hola ${firstName},` : 'Hola,';
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: 'Restablece tu contraseña — Servi',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">
            <h2 style="color:#1a1a1a;margin-bottom:8px">Restablecer contraseña</h2>
            <p style="color:#555;margin-bottom:8px">${hello}</p>
            <p style="color:#555;margin-bottom:24px">El equipo de Servi inició un restablecimiento de contraseña para tu cuenta. Haz clic en el botón para crear una nueva contraseña:</p>
            <div style="text-align:center;margin-bottom:24px">
              <a href="${resetUrl}" style="display:inline-block;background:#F97316;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px">Crear nueva contraseña</a>
            </div>
            <p style="color:#888;font-size:13px">Este enlace expira en 1 hora. Si no esperabas este correo, ignóralo: tu contraseña no cambiará.</p>
            <p style="color:#bbb;font-size:11px;word-break:break-all">Si el botón no funciona, copia este enlace: ${resetUrl}</p>
          </div>
        `,
      });
      this.logger.log(`Reset link enviado a ${to}`);
    } catch (error) {
      this.logger.error(
        `Error al enviar reset link a ${to}: ${(error as Error).message ?? error}`,
      );
      throw new Error(`Error al enviar email: ${(error as Error).message}`);
    }
  }

  async sendPasswordResetEmail(to: string, code: string): Promise<void> {
    if (!this.client) {
      this.logger.warn(
        `[EMAIL SKIP] BREVO_API_KEY no configurada. Reset code para ${to}: ${code}`,
      );
      return;
    }

    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { email: this.senderEmail, name: this.senderName },
        to: [{ email: to }],
        subject: 'Restablecer tu contraseña — Servi',
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px">
            <h2 style="color:#1a1a1a;margin-bottom:8px">Restablecer contraseña</h2>
            <p style="color:#555;margin-bottom:24px">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código:</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
              <span style="font-size:48px;font-weight:700;letter-spacing:12px;color:#E07B39">${code}</span>
            </div>
            <p style="color:#888;font-size:13px">Este código expira en 15 minutos. Si no solicitaste esto, ignora este mensaje.</p>
          </div>
        `,
      });
      this.logger.log(`Reset code enviado a ${to}`);
    } catch (error) {
      this.logger.error(
        `Error al enviar reset code a ${to}: ${(error as Error).message ?? error}`,
      );
      throw new Error(`Error al enviar email: ${(error as Error).message}`);
    }
  }
}
