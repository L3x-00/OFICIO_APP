import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '../events/events.gateway.js';
import { EmailService } from '../email/email.service.js';
import { FirebaseService } from '../firebase/firebase.service.js';
import { MinioService } from '../common/minio.service.js';
import { uniqueSlug } from '../common/slug.util.js';
import { randomUUID } from 'crypto';

// OTP_EXPIRY_MS: 10 minutos
const OTP_EXPIRY_MS = 10 * 60 * 1000;
// Registro pendiente: 15 minutos (tiempo para completar el OTP)
const PENDING_REG_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private eventsGateway: EventsGateway,
    private emailService: EmailService,
    private firebaseService: FirebaseService,
    private minio: MinioService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ── REGISTRO DE USUARIO NORMAL ──────────────────────────
  // El usuario NO se guarda en BD hasta verificar OTP.
  // Se almacena temporalmente en Redis con pendingId como clave.
  async registerUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    // Guardia: email ya en BD.
    // - Cuenta ACTIVA → conflicto real (debe iniciar sesión).
    // - Cuenta INACTIVA (soft-deleted) → permitimos el re-registro;
    //   `verifyOtp` lo tratará como reactivación SIN beneficios.
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (exists) {
      if (exists.isActive) {
        throw new ConflictException(
          'Ya tienes una cuenta con este correo. Inicia sesión o usa otro correo.',
        );
      }
      if (exists.deletedAt == null) {
        // Inactiva pero NO auto-eliminada = suspendida por el admin.
        throw new ConflictException(
          'Esta cuenta está suspendida. Contacta con soporte.',
        );
      }
      // Inactiva + deletedAt != null → soft-deleted → re-registro permitido.
    }

    // Guardia: ya hay un registro pendiente para ese email
    const emailKey = `pending_email:${data.email}`;
    const existingPending = await this.cacheManager.get<string>(emailKey);
    if (existingPending)
      throw new ConflictException(
        'Ya hay un proceso de verificación en curso para este email',
      );

    const passwordHash = await bcrypt.hash(data.password, 10);
    const pendingId = randomUUID();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const ttlMs = PENDING_REG_TTL_MS;
    const otpTtlMs = OTP_EXPIRY_MS;

    // Guardar datos de registro + OTP en Redis
    await this.cacheManager.set(
      `pending_reg:${pendingId}`,
      JSON.stringify({
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
      }),
      ttlMs,
    );
    await this.cacheManager.set(`pending_otp:${pendingId}`, otpCode, otpTtlMs);
    await this.cacheManager.set(emailKey, pendingId, ttlMs);

    // Notificar admin: usuario en proceso de validación
    this.eventsGateway.emitNotification({
      type: 'USER_PENDING',
      title: 'Nuevo registro en proceso',
      body: `${data.firstName} ${data.lastName} (${data.email}) está completando la verificación de email.`,
      targetRole: 'ADMIN',
    });
    this.eventsGateway.emitAdminEvent('USER_PENDING', {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
    });

    // Enviar OTP por email (no lanza excepción si falla — el registro sigue adelante)
    this.emailService
      .sendOtpEmail(data.email, otpCode)
      .catch((err) =>
        this.logger.error(
          `No se pudo enviar OTP a ${data.email}: ${err?.message ?? err}`,
        ),
      );

    // En desarrollo el OTP viaja en la respuesta (_devOtpCode) para pruebas;
    // NUNCA se loguea ni se expone en producción.
    if (this.config.get('NODE_ENV') !== 'production') {
      return {
        pendingId,
        requiresEmailVerification: true,
        _devOtpCode: otpCode,
      };
    }
    return { pendingId, requiresEmailVerification: true };
  }

  // ── REGISTRO DE PROVEEDOR ────────────────────────────────
  async registerProvider(
    userId: number,
    data: {
      businessName: string;
      phone: string;
      type: 'OFICIO' | 'NEGOCIO';
      // OFICIO
      dni?: string | null;
      // NEGOCIO
      ruc?: string | null;
      nombreComercial?: string | null;
      razonSocial?: string | null;
      hasDelivery?: boolean;
      plenaCoordinacion?: boolean;
      // OFICIO
      hasHomeService?: boolean;
      // comunes
      whatsapp?: string | null;
      description?: string;
      address?: string;
      categoryIds?: number[]; // hasta 3 Especialidades (categorías hijas)
      primaryCategoryId?: number; // Especialidad principal (isPrimary)
      localityId?: number;
      // Ubicación administrativa elegida en el onboarding — usada para
      // resolver (o crear) la localidad real del proveedor.
      department?: string | null;
      province?: string | null;
      district?: string | null;

      scheduleJson?: any;
      // redes sociales (opcionales)
      website?: string | null;
      instagram?: string | null;
      tiktok?: string | null;
      facebook?: string | null;
      linkedin?: string | null;
      twitterX?: string | null;
      telegram?: string | null;
      whatsappBiz?: string | null;
    },
    files: Express.Multer.File[],
  ) {
    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    // Verificar que no tenga ya un perfil del MISMO tipo (puede tener OFICIO + NEGOCIO)
    const existing = await this.prisma.provider.findUnique({
      where: { userId_type: { userId, type: data.type } },
    });
    if (existing) {
      if (existing.verificationStatus === 'RECHAZADO') {
        // Permitir re-registro: eliminar perfil rechazado e imágenes
        // asociadas. El `Referral` PENDING del user (si lo había) NO se
        // borra — al aprobarse el nuevo provider,
        // `referrals.onProviderApproved` entrega las monedas. Si el user
        // vuelve a ingresar el MISMO código en el form de re-registro,
        // `applyCode` lo detecta como idempotente y no rechaza.
        await this.prisma.providerImage.deleteMany({
          where: { providerId: existing.id },
        });
        await this.prisma.provider.delete({ where: { id: existing.id } });
      } else {
        throw new ConflictException(`Ya tienes un perfil de tipo ${data.type}`);
      }
    }

    // Validar DNI: el mismo usuario puede reusar su DNI en otro tipo de perfil,
    // pero otro usuario no puede registrarse con un DNI ya usado por alguien más.
    if (data.dni?.trim()) {
      const dniTaken = await this.prisma.provider.findFirst({
        where: {
          dni: data.dni.trim(),
          NOT: { userId }, // Permite que el mismo usuario lo reutilice
        },
      });
      if (dniTaken) {
        throw new ConflictException(
          'Este DNI ya está registrado por otro usuario',
        );
      }
    }

    // Resolver la localidad del proveedor.
    let localityId = data.localityId;
    if (localityId) {
      const locExists = await this.prisma.locality.findUnique({
        where: { id: localityId },
      });
      if (!locExists) localityId = undefined;
    }
    // Si no llegó un localityId válido, lo resolvemos desde la ubicación
    // administrativa (dept/prov/dist) que eligió el proveedor en el
    // onboarding. Match accent/case-insensitive; si la localidad no
    // existe en el catálogo, se crea (source USER). Así el proveedor
    // queda EXACTAMENTE en la zona elegida y los filtros lo encuentran.
    if (!localityId && data.department && data.department.trim().length >= 2) {
      const norm = (s?: string | null) =>
        (s ?? '')
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();
      const nDept = norm(data.department);
      const nProv = norm(data.province);
      const nDist = norm(data.district);
      const all = await this.prisma.locality.findMany({
        select: { id: true, department: true, province: true, district: true },
      });
      const found = all.find(
        (l) =>
          norm(l.department) === nDept &&
          norm(l.province) === nProv &&
          norm(l.district) === nDist,
      );
      if (found) {
        localityId = found.id;
      } else {
        const created = await this.prisma.locality.create({
          data: {
            name: (data.district || data.province || data.department).trim(),
            department: data.department.trim(),
            province: data.province?.trim() || null,
            district: data.district?.trim() || null,
            isActive: true,
            source: 'USER',
          },
        });
        localityId = created.id;
      }
    }
    // Último recurso: primera localidad del catálogo (no debería ocurrir
    // si el onboarding envía la ubicación).
    if (!localityId) {
      const firstLocality = await this.prisma.locality.findFirst({
        where: { isActive: true },
      });
      localityId = firstLocality?.id ?? 1;
    }

    // Validar categoryIds (Especialidades): filtrar solo las que existen, máx 6.
    // Si ninguna es válida, asignar la primera Especialidad disponible como fallback.
    let validCategoryIds: number[] = [];
    if (data.categoryIds && data.categoryIds.length > 0) {
      const ids = data.categoryIds.slice(0, 6);
      const found = await this.prisma.category.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true },
      });
      validCategoryIds = found.map((c) => c.id);
    }
    if (validCategoryIds.length === 0) {
      const firstCategory = await this.prisma.category.findFirst({
        where: { parentId: { not: null }, isActive: true },
      });
      if (firstCategory) validCategoryIds = [firstCategory.id];
    }

    // Especialidad principal: la indicada por el cliente si está entre las
    // válidas; de lo contrario la primera. Garantiza exactamente un isPrimary.
    const primaryCategoryId =
      data.primaryCategoryId != null &&
      validCategoryIds.includes(Number(data.primaryCategoryId))
        ? Number(data.primaryCategoryId)
        : validCategoryIds[0];

    // Upload images to R2 before transaction
    const imageUrls: string[] =
      files && files.length > 0
        ? await Promise.all(
            files.map((f) =>
              this.minio.uploadFile(
                f.buffer,
                f.originalname,
                'providers/gallery',
              ),
            ),
          )
        : [];

    // Slug único para la Vanity URL pública (/p/:slug). Se calcula fuera de
    // la transacción para evitar largos round-trips dentro del lock; la
    // probabilidad de colisión entre el check y el create es muy baja.
    const baseSlug = data.businessName;
    const providerSlug = await uniqueSlug(baseSlug, async (candidate) =>
      Boolean(
        await this.prisma.provider.findUnique({
          where: { slug: candidate },
          select: { id: true },
        }),
      ),
    );

    const provider = await this.prisma.$transaction(async (tx) => {
      // El rol del usuario se mantiene como USUARIO hasta que el admin APRUEBE.
      // La suscripción de gracia también se crea al momento de la aprobación.
      // Solo se crea el perfil de proveedor en estado PENDIENTE.
      const newProvider = await tx.provider.create({
        data: {
          userId,
          businessName: data.businessName,
          slug: providerSlug,
          phone: data.phone,
          // OFICIO-only
          dni: data.type === 'OFICIO' ? data.dni?.trim() || null : null,
          // NEGOCIO-only
          ruc: data.type === 'NEGOCIO' ? data.ruc?.trim() || null : null,
          nombreComercial:
            data.type === 'NEGOCIO'
              ? data.nombreComercial?.trim() || null
              : null,
          razonSocial:
            data.type === 'NEGOCIO' ? data.razonSocial?.trim() || null : null,
          hasDelivery:
            data.type === 'NEGOCIO' ? (data.hasDelivery ?? false) : false,
          plenaCoordinacion:
            data.type === 'NEGOCIO' ? (data.plenaCoordinacion ?? false) : false,
          hasHomeService:
            data.type === 'OFICIO' ? (data.hasHomeService ?? false) : false,
          // comunes
          whatsapp: data.whatsapp?.trim() || null,
          description: data.description || null,
          address: data.address || null,
          website: data.website?.trim() || null,
          instagram: data.instagram?.trim() || null,
          tiktok: data.tiktok?.trim() || null,
          facebook: data.facebook?.trim() || null,
          linkedin: data.linkedin?.trim() || null,
          twitterX: data.twitterX?.trim() || null,
          telegram: data.telegram?.trim() || null,
          whatsappBiz: data.whatsappBiz?.trim() || null,
          type: data.type,
          localityId,
          providerCategories: {
            create: validCategoryIds.map((cid) => ({
              categoryId: cid,
              isPrimary: cid === primaryCategoryId,
            })),
          },
          verificationStatus: 'PENDIENTE',
          isVisible: false, // no aparece en la app hasta ser aprobado
          scheduleJson:
            data.type === 'NEGOCIO' && data.scheduleJson
              ? data.scheduleJson
              : {
                  lun: '8:00-18:00',
                  mar: '8:00-18:00',
                  mie: '8:00-18:00',
                  jue: '8:00-18:00',
                  vie: '8:00-18:00',
                  sab: '9:00-13:00',
                  dom: 'Cerrado',
                },
        },
      });
      if (imageUrls.length > 0) {
        await tx.providerImage.createMany({
          data: imageUrls.map((url, index) => ({
            providerId: newProvider.id,
            url,
            isCover: index === 0,
            order: index,
          })),
        });
      }

      return newProvider;
    });

    // Notificar a admins que hay un nuevo proveedor pendiente de verificación
    this.eventsGateway.emitNotification({
      type: 'NEW_PROVIDER',
      title: 'Nuevo proveedor registrado',
      body: `${data.businessName} se registró como ${data.type === 'OFICIO' ? 'profesional' : 'negocio'} y está pendiente de verificación.`,
      targetRole: 'ADMIN',
    });
    this.eventsGateway.emitAdminEvent('NEW_PROVIDER', {
      providerId: provider.id,
      businessName: data.businessName,
      type: data.type,
    });

    return { success: true, providerId: provider.id, role: 'USUARIO' };
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

  // ── FORGOT PASSWORD ─────────────────────────────────────
  // Siempre responde con éxito (no revela si el email existe)
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

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
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Token inválido o expirado');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: `RESET_${token}` },
    });

    if (!stored || stored.userId !== user.id || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Token inválido o expirado');
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

  // ── SEND OTP ────────────────────────────────────────────
  async sendOtp(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (user.isEmailVerified) {
      return { message: 'El email ya está verificado' };
    }

    // Eliminar OTPs previos del usuario
    await this.prisma.otpCode.deleteMany({ where: { userId } });

    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await this.prisma.otpCode.create({ data: { userId, code, expiresAt } });

    // TODO: En producción, enviar email con SendGrid:
    //   await this.mailService.sendOtp(user.email, code);
    // Por ahora devolvemos el código en desarrollo para facilitar las pruebas
    if (this.config.get('NODE_ENV') !== 'production') {
      return {
        message: 'Código OTP enviado al email registrado',
        _devCode: code,
      };
    }

    return { message: 'Código OTP enviado al email registrado' };
  }

  // ── VERIFY OTP (registro pendiente) ─────────────────────
  // pendingId viene del paso de registro. Valida OTP en Redis,
  // crea el usuario en BD y devuelve tokens completos.
  async verifyOtp(pendingId: string, code: string) {
    const otpKey = `pending_otp:${pendingId}`;
    const regKey = `pending_reg:${pendingId}`;

    const storedCode = await this.cacheManager.get<string>(otpKey);
    if (!storedCode)
      throw new BadRequestException(
        'El código ha expirado o el registro es inválido. Vuelve a registrarte.',
      );
    if (storedCode !== code) throw new BadRequestException('Código inválido');

    const rawData = await this.cacheManager.get<string>(regKey);
    if (!rawData)
      throw new BadRequestException(
        'Datos de registro expirados. Vuelve a registrarte.',
      );

    const reg = JSON.parse(rawData) as {
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    };

    // Guardia de carrera + detección de reactivación:
    // - email de cuenta ACTIVA → conflicto real (registro concurrente).
    // - email de cuenta INACTIVA (soft-deleted) → reactivación sin
    //   beneficios (anti freemium abuse).
    const existingUser = await this.prisma.user.findUnique({
      where: { email: reg.email },
    });
    if (existingUser) {
      if (existingUser.isActive) {
        throw new ConflictException('El email ya está registrado');
      }
      if (existingUser.deletedAt == null) {
        throw new ConflictException(
          'Esta cuenta está suspendida. Contacta con soporte.',
        );
      }
    }

    // Crear usuario nuevo, o reactivar la cuenta soft-deleted existente.
    const user = existingUser
      ? await this._reactivateUser(existingUser.id, reg)
      : await this.prisma.user.create({
          data: {
            email: reg.email,
            passwordHash: reg.passwordHash,
            firstName: reg.firstName,
            lastName: reg.lastName,
            phone: reg.phone,
            role: 'USUARIO',
            isEmailVerified: true,
          },
        });

    // Limpiar Redis
    await Promise.all([
      this.cacheManager.del(otpKey),
      this.cacheManager.del(regKey),
      this.cacheManager.del(`pending_email:${reg.email}`),
    ]);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Notificar admin: usuario registrado correctamente
    this.eventsGateway.emitNotification({
      type: 'NEW_USER_VERIFIED',
      title: 'Usuario registrado correctamente',
      body: `${reg.firstName} ${reg.lastName} (${reg.email}) completó la verificación y está activo.`,
      targetRole: 'ADMIN',
    });
    this.eventsGateway.emitAdminEvent('NEW_USER_VERIFIED', {
      userId: user.id,
      firstName: reg.firstName,
      lastName: reg.lastName,
      email: reg.email,
    });

    return {
      ...tokens,
      verified: true,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };
  }

  // ── REENVIAR OTP (registro pendiente) ───────────────────
  async resendPendingOtp(pendingId: string) {
    const regKey = `pending_reg:${pendingId}`;
    const rawData = await this.cacheManager.get<string>(regKey);
    if (!rawData)
      throw new BadRequestException('Registro expirado. Vuelve a registrarte.');

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();

    // CORRECCIÓN 1: Se usa el TTL en milisegundos directamente
    const otpTtlMs = OTP_EXPIRY_MS;
    await this.cacheManager.set(`pending_otp:${pendingId}`, newCode, otpTtlMs);

    // Recuperar email del registro pendiente para reenviar
    const reg = JSON.parse(rawData) as { email: string };
    this.emailService
      .sendOtpEmail(reg.email, newCode)
      .catch((err) =>
        this.logger.error(
          `No se pudo reenviar OTP a ${reg.email}: ${err?.message ?? err}`,
        ),
      );

    // En desarrollo el código viaja en la respuesta (_devCode); nunca se loguea.
    if (this.config.get('NODE_ENV') !== 'production') {
      return { message: 'Nuevo código enviado', _devCode: newCode };
    }
    return { message: 'Nuevo código enviado al email registrado' };
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
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isNewUser,
    };
  }

  // ── HELPER: GENERAR TOKENS ───────────────────────────────
  private async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken, userId, role };
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

  /// Reactiva una cuenta soft-deleted SIN renovar beneficios: borra sus
  /// perfiles de Provider (debe pasar la aprobación del admin otra vez),
  /// pone monedas a 0 y marca `hasUsedTrial` para que el próximo
  /// proveedor que registre NO reciba el mes de cortesía ESTANDAR.
  private async _reactivateUser(
    userId: number,
    reg: {
      passwordHash: string;
      firstName: string;
      lastName: string;
      phone: string | null;
    },
  ) {
    await this.prisma.provider.deleteMany({ where: { userId } });
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        deletedAt: null,
        passwordHash: reg.passwordHash,
        firstName: reg.firstName,
        lastName: reg.lastName,
        phone: reg.phone,
        role: 'USUARIO',
        isEmailVerified: true,
        coins: 0,
        hasUsedTrial: true,
        firebaseUid: null,
      },
    });
  }
}
