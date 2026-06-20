import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '../events/events.gateway.js';
import { FirebaseService } from '../firebase/firebase.service.js';
import { generateTokens as sharedGenerateTokens } from './services/auth-shared.js';
import {
  AuthRegistrationService,
  type RegisterUserData,
  type RegisterProviderData,
} from './services/auth-registration.service.js';
import { AuthAccountService } from './services/auth-account.service.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private eventsGateway: EventsGateway,
    private firebaseService: FirebaseService,
    private registration: AuthRegistrationService,
    private account: AuthAccountService,
  ) {}

  // ── REGISTRO DE USUARIO NORMAL (Facade → AuthRegistrationService) ──
  async registerUser(data: RegisterUserData) {
    return this.registration.registerUser(data);
  }

  // ── REGISTRO DE PROVEEDOR (Facade → AuthRegistrationService) ──
  async registerProvider(
    userId: number,
    data: RegisterProviderData,
    files: Express.Multer.File[],
  ) {
    return this.registration.registerProvider(userId, data, files);
  }

  // ── LOGIN ────────────────────────────────────────────────
  async login(email: string, password: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException(
        'Correo no registrado. ¿Quieres crear una cuenta?',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tu cuenta está desactivada. Contacta con soporte.',
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // Log de IP + timestamp de último login para auditoría y para el
    // mapa de calor del admin (fire-and-forget, no bloquea el login).
    // Update ocurre solo después de validar credenciales — intentos
    // fallidos NO contaminan lastIp/lastLoginAt.
    this.prisma.user
      .update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(ip ? { lastIp: ip } : {}),
        },
      })
      .catch(() => {});

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      ...tokens,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };
  }

  // ── GET ME (perfil completo del usuario autenticado) ─────
  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        department: true,
        province: true,
        district: true,
        providers: {
          select: {
            id: true,
            businessName: true,
            type: true,
            isVerified: true,
            isVisible: true,
            availability: true,
            verificationStatus: true,
            subscription: {
              select: { plan: true, status: true, endDate: true },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return user;
  }

  // ── REFRESH TOKEN ────────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Token expirado');
      }

      await this.prisma.refreshToken.delete({ where: { token: refreshToken } });

      return this.generateTokens(
        storedToken.user.id,
        storedToken.user.email,
        storedToken.user.role,
      );
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }

  // ── LOGOUT ──────────────────────────────────────────────
  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { message: 'Sesión cerrada' };
  }

  // ── FORGOT PASSWORD (Facade → AuthAccountService) ────────
  async forgotPassword(email: string) {
    return this.account.forgotPassword(email);
  }

  // ── RESET PASSWORD (Facade → AuthAccountService) ─────────
  async resetPassword(email: string, token: string, newPassword: string) {
    return this.account.resetPassword(email, token, newPassword);
  }

  // ── ADMIN: solicitar reset (Facade → AuthAccountService) ──
  async adminRequestPasswordReset(userId: number) {
    return this.account.adminRequestPasswordReset(userId);
  }

  // ── SEND OTP (Facade → AuthRegistrationService) ──────────
  async sendOtp(userId: number) {
    return this.registration.sendOtp(userId);
  }

  // ── VERIFY OTP (Facade → AuthRegistrationService) ────────
  async verifyOtp(pendingId: string, code: string) {
    return this.registration.verifyOtp(pendingId, code);
  }

  // ── REENVIAR OTP (Facade → AuthRegistrationService) ──────
  async resendPendingOtp(pendingId: string) {
    return this.registration.resendPendingOtp(pendingId);
  }

  // ── SOCIAL LOGIN (Firebase idToken) ─────────────────────
  async socialLogin(idToken: string, ip?: string) {
    // Verificar token con Firebase Admin
    const decoded = await this.firebaseService.verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    if (!email) {
      throw new BadRequestException(
        'La cuenta social no tiene email asociado. Usa otro método de registro.',
      );
    }

    // Buscar usuario por firebaseUid (login recurrente) o email (vinculación)
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ firebaseUid: uid }, { email }] },
    });

    let isNewUser = false;

    if (!user) {
      // Primer acceso: crear cuenta automáticamente
      const nameParts = ((name as string | undefined) ?? '')
        .trim()
        .split(/\s+/);
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || '';
      // Hash inutilizable: los usuarios sociales no pueden hacer login con contraseña
      const dummyHash = await bcrypt.hash(`FIREBASE_SOCIAL_${uid}`, 10);

      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: dummyHash,
          firstName,
          lastName,
          avatarUrl: picture ?? null,
          firebaseUid: uid,
          role: 'USUARIO',
          isEmailVerified: true,
        },
      });

      isNewUser = true;

      this.eventsGateway.emitNotification({
        type: 'NEW_USER_VERIFIED',
        title: 'Nuevo usuario (login social)',
        body: `${firstName} ${lastName} (${email}) se registró mediante login social.`,
        targetRole: 'ADMIN',
      });
    } else if (!user.isActive) {
      if (user.deletedAt == null) {
        // Inactiva sin deletedAt = suspendida por el admin → bloquear.
        throw new UnauthorizedException(
          'Esta cuenta está suspendida. Contacta con soporte.',
        );
      }
      // Cuenta soft-deleted que vuelve por login social → reactivación
      // SIN beneficios (anti freemium abuse): monedas a 0, hasUsedTrial,
      // y se borran sus perfiles de Provider (re-aprobación del admin).
      const dummyHash = await bcrypt.hash(`FIREBASE_SOCIAL_${uid}`, 10);
      await this.prisma.provider.deleteMany({ where: { userId: user.id } });
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          deletedAt: null,
          passwordHash: dummyHash,
          firebaseUid: uid,
          avatarUrl: picture ?? user.avatarUrl,
          coins: 0,
          hasUsedTrial: true,
          isEmailVerified: true,
        },
      });
    } else if (!user.firebaseUid) {
      // Email ya registrado con contraseña — no vincular, bloquear
      throw new ConflictException(
        'Ya tienes una cuenta con este correo. Inicia sesión con tu correo y contraseña, o regístrate con otro correo.',
      );
    }

    // Log de IP + timestamp para auditoría y mapa de calor (geo-stats).
    // Fire-and-forget — no bloquea el login. Mismo patrón que login con
    // email/password (`auth.service.ts` línea ~455).
    this.prisma.user
      .update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(ip ? { lastIp: ip } : {}),
        },
      })
      .catch(() => {});

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      ...tokens,
      // userId + role son OBLIGATORIOS para los clientes: el móvil arma el
      // UserModel con `data['userId']` (un cast a int que CRASHEABA cuando
      // faltaba → la sesión social nunca se guardaba y al reabrir la app
      // aparecía "no has iniciado sesión"). Mismo shape que /login y /verify-otp.
      userId: user.id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isNewUser,
    };
  }

  // ── HELPER: GENERAR TOKENS (delega a auth-shared) ────────
  private async generateTokens(userId: number, email: string, role: string) {
    return sharedGenerateTokens(
      { jwtService: this.jwtService, config: this.config, prisma: this.prisma },
      userId,
      email,
      role,
    );
  }

  // ── SETUP PASSWORD (Facade → AuthAccountService) ─────────
  async setupPassword(userId: number, newPassword: string) {
    return this.account.setupPassword(userId, newPassword);
  }

  // ── DELETE ACCOUNT (Facade → AuthAccountService) ─────────
  async deleteAccount(userId: number) {
    return this.account.deleteAccount(userId);
  }
}
