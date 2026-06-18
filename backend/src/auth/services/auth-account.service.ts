import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EmailService } from '../../email/email.service.js';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

/**
 * Gestión de cuenta: recuperación y cambio de contraseña + eliminación
 * (soft delete) de cuenta. Extraído del god object AuthService — AuthService
 * delega aquí vía Facade; el AuthController no cambia.
 */
@Injectable()
export class AuthAccountService {
  private readonly logger = new Logger(AuthAccountService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  // ── FORGOT PASSWORD ─────────────────────────────────────
  // Siempre responde con éxito (no revela si el email existe)
  async forgotPassword(email: string) {
    // Búsqueda case-insensitive: los usuarios sociales (Google) guardan el
    // email con el casing que devuelve Firebase; si el usuario lo tipea
    // distinto, un findUnique exacto no matchearía y nunca recibiría el código.
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (user) {
      // Generar token de 6 dígitos numérico y guardarlo como refreshToken temporal
      // En producción se enviaría por email; aquí lo devolvemos solo en desarrollo
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      // Reutilizamos la tabla refreshToken con prefijo "RESET_"
      await this.prisma.refreshToken.create({
        data: { token: `RESET_${resetToken}`, userId: user.id, expiresAt },
      });

      // Enviar email con el código de recuperación
      try {
        await this.emailService.sendPasswordResetEmail(user.email, resetToken);
      } catch {
        this.logger.warn(`No se pudo enviar email de reset a ${user.email}`);
      }

      if (this.config.get('NODE_ENV') !== 'production') {
        return {
          message: 'Si el correo existe recibirás un código de recuperación',
          _devToken: resetToken,
        };
      }
    }

    return {
      message: 'Si el correo existe recibirás un código de recuperación',
    };
  }

  // ── RESET PASSWORD ───────────────────────────────────────
  async resetPassword(email: string, token: string, newPassword: string) {
    // Mismo criterio case-insensitive que forgotPassword (usuarios sociales).
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (!user) throw new UnauthorizedException('Código incorrecto');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: `RESET_${token}` },
    });

    // 1. Si el token no existe o no pertenece a este usuario → Código incorrecto
    if (!stored || stored.userId !== user.id) {
      throw new UnauthorizedException('Código incorrecto');
    }

    // 2. Si el token sí existe y pertenece al usuario, pero ya venció → Código expirado
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('El código ha expirado');
    }

    // Consumir el token de reset
    await this.prisma.refreshToken.delete({
      where: { token: `RESET_${token}` },
    });

    // Cambiar contraseña e invalidar todos los refresh tokens
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { message: 'Contraseña restablecida correctamente' };
  }

  // ── ADMIN: solicitar restablecimiento de contraseña ─────────
  /// El admin dispara un reset para ayudar a un proveedor que olvidó su
  /// contraseña, SIN verla ni cambiarla. Genera un token seguro (1h) y envía
  /// un enlace por Brevo; el proveedor crea su nueva contraseña él mismo
  /// (reusa el flujo `resetPassword` existente vía ?token=&email=).
  async adminRequestPasswordReset(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await this.prisma.refreshToken.create({
      data: { token: `RESET_${token}`, userId: user.id, expiresAt },
    });

    const base = (
      this.config.get<string>('WEB_APP_URL') ??
      this.config.get<string>('FRONTEND_URL') ??
      'https://oficioapp.org.pe'
    ).replace(/\/$/, '');
    const resetUrl = `${base}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    try {
      await this.emailService.sendAdminPasswordResetEmail(
        user.email,
        resetUrl,
        user.firstName,
      );
    } catch {
      this.logger.warn(`No se pudo enviar reset link a ${user.email}`);
    }

    return {
      message: 'Enlace de restablecimiento enviado al proveedor',
      ...(this.config.get('NODE_ENV') !== 'production'
        ? { _devUrl: resetUrl }
        : {}),
    };
  }

  // ── SETUP PASSWORD (usuarios sociales sin contraseña propia) ──
  /// Permite que un usuario que se registró por login social
  /// (Google/Facebook) establezca una contraseña real por primera vez.
  /// Solo válido si:
  ///   - el user tiene `firebaseUid` (es decir, vino de social login), y
  ///   - su `passwordHash` actual es el dummy (`FIREBASE_SOCIAL_<uid>`).
  /// Tras setear, el user puede hacer login manual o usar el endpoint
  /// `change-password` normal con la nueva contraseña.
  async setupPassword(userId: number, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres',
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.firebaseUid) {
      // Usuario manual — debe usar change-password con la contraseña actual.
      throw new BadRequestException(
        'Esta cuenta ya tiene contraseña. Usa "cambiar contraseña" para modificarla.',
      );
    }
    const isDummy = await bcrypt.compare(
      `FIREBASE_SOCIAL_${user.firebaseUid}`,
      user.passwordHash,
    );
    if (!isDummy) {
      // Ya estableció su contraseña antes — debe usar change-password.
      throw new BadRequestException(
        'Ya estableciste tu contraseña. Usa "cambiar contraseña" para modificarla.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { message: 'Contraseña establecida correctamente' };
  }

  // ── DELETE ACCOUNT (soft delete — anti freemium abuse) ───
  async deleteAccount(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Usuario no encontrado');

    // Soft delete: NO borramos el usuario — así su email/teléfono quedan
    // "reservados" y un re-registro con el mismo email se detecta como
    // reactivación SIN renovar el mes de prueba (anti freemium abuse).
    //
    // Sí borramos sus perfiles de Provider — el cascade del schema
    // limpia subscription, payments, images, analytics, reviews del
    // proveedor, etc. — para que no sigan visibles en el catálogo.
    // También invalidamos sus sesiones (refreshTokens).
    await this.prisma.$transaction([
      this.prisma.provider.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          fcmToken: null,
          firebaseUid: null,
        },
      }),
    ]);

    return { success: true };
  }
}
