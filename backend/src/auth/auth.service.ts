import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../generated/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '../events/events.gateway.js';

// OTP_EXPIRY_MS: 10 minutos
const OTP_EXPIRY_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private eventsGateway: EventsGateway,
  ) {}

  // ── REGISTRO DE USUARIO NORMAL ──────────────────────────
  async registerUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (exists) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email:        data.email,
        passwordHash,
        firstName:    data.firstName,
        lastName:     data.lastName,
        phone:        data.phone,
        role:         'USUARIO',
        isEmailVerified: false,
      },
    });

    // Notificar a admins del nuevo registro
    this.eventsGateway.emitNotification({
      type: 'NEW_USER',
      title: 'Nuevo usuario registrado',
      body: `${data.firstName} ${data.lastName} (${data.email}) se registró en la plataforma.`,
      targetRole: 'ADMIN',
    });

    // Generar y guardar OTP automáticamente tras el registro
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    await this.prisma.otpCode.create({ data: { userId: user.id, code: otpCode, expiresAt } });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // En producción aquí se enviaría el email; en desarrollo se devuelve el código
    if (this.config.get('NODE_ENV') !== 'production') {
      return { ...tokens, requiresEmailVerification: true, _devOtpCode: otpCode };
    }

    return { ...tokens, requiresEmailVerification: true };
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
  // comunes
  whatsapp?: string | null;
  description?: string;
  address?: string;
  categoryId?: number;
  localityId?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scheduleJson?: any;
}, files: Express.Multer.File[],
  ) {
    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    // Verificar que no tenga ya un perfil del MISMO tipo (puede tener OFICIO + NEGOCIO)
    const existing = await this.prisma.provider.findUnique({
      where: { userId_type: { userId, type: data.type } },
    });
    if (existing) throw new ConflictException(`Ya tienes un perfil de tipo ${data.type}`);

    // Validar DNI: el mismo usuario puede reusar su DNI en otro tipo de perfil,
    // pero otro usuario no puede registrarse con un DNI ya usado por alguien más.
    if (data.dni?.trim()) {
      const dniTaken = await this.prisma.provider.findFirst({
        where: {
          dni: data.dni.trim(),
          NOT: { userId },     // Permite que el mismo usuario lo reutilice
        },
      });
      if (dniTaken) {
        throw new ConflictException('Este DNI ya está registrado por otro usuario');
      }
    }

    // Validar localityId: si no viene o no existe, usar la primera disponible
    let localityId = data.localityId;
    if (localityId) {
      const locExists = await this.prisma.locality.findUnique({ where: { id: localityId } });
      if (!locExists) localityId = undefined;
    }
    if (!localityId) {
      const firstLocality = await this.prisma.locality.findFirst({ where: { isActive: true } });
      localityId = firstLocality?.id ?? 1;
    }

    // Validar categoryId: si no viene o no existe, usar la primera subcategoría disponible
    let categoryId = data.categoryId;
    if (categoryId) {
      const catExists = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!catExists) categoryId = undefined;
    }
    if (!categoryId) {
      const firstCategory = await this.prisma.category.findFirst({
        where: { parentId: { not: null }, isActive: true },
      });
      categoryId = firstCategory?.id ?? 1;
    }

    const provider = await this.prisma.$transaction(async (tx) => {
      // El rol del usuario se mantiene como USUARIO hasta que el admin APRUEBE.
      // La suscripción de gracia también se crea al momento de la aprobación.
      // Solo se crea el perfil de proveedor en estado PENDIENTE.
      const newProvider = await tx.provider.create({
        data: {
          userId,
          businessName:     data.businessName,
          phone:            data.phone,
          // OFICIO-only
          dni:              data.type === 'OFICIO' ? (data.dni?.trim() || null) : null,
          // NEGOCIO-only
          ruc:              data.type === 'NEGOCIO' ? (data.ruc?.trim() || null) : null,
          nombreComercial:  data.type === 'NEGOCIO' ? (data.nombreComercial?.trim() || null) : null,
          razonSocial:      data.type === 'NEGOCIO' ? (data.razonSocial?.trim() || null) : null,
          hasDelivery:      data.type === 'NEGOCIO' ? (data.hasDelivery ?? false) : false,
          plenaCoordinacion: data.type === 'NEGOCIO' ? (data.plenaCoordinacion ?? false) : false,
          // comunes
          whatsapp:         data.whatsapp?.trim() || null,
          description:      data.description || null,
          address:          data.address || null,
          type:             data.type,
          categoryId,
          localityId,
          verificationStatus: 'PENDIENTE',
          isVisible: false, // no aparece en la app hasta ser aprobado
          scheduleJson: data.type === 'NEGOCIO' && data.scheduleJson
            ? data.scheduleJson
            : {
                lun: '8:00-18:00', mar: '8:00-18:00',
                mie: '8:00-18:00', jue: '8:00-18:00',
                vie: '8:00-18:00', sab: '9:00-13:00',
                dom: 'Cerrado',
              },
        },
      });
      // ─── BLOQUE NUEVO PARA LAS FOTOS ───────────────────────
    // 3. Si vienen archivos, los guardamos usando el modelo ProviderImage
    if (files && files.length > 0) {
      await tx.providerImage.createMany({
        data: files.map((file, index) => ({
          providerId: newProvider.id,
          url: `/uploads/${file.filename}`, // Ruta relativa a la carpeta de uploads
          isCover: index === 0,             // La primera foto será la de portada
          order: index,                     // Mantiene el orden enviado desde el celular
        })),
      });
    }
    // ───────────────────────────────────────────────────────

      return newProvider;
    });

    // Notificar a admins que hay un nuevo proveedor pendiente de verificación
    this.eventsGateway.emitNotification({
      type: 'NEW_PROVIDER',
      title: 'Nuevo proveedor registrado',
      body: `${data.businessName} se registró como ${data.type === 'OFICIO' ? 'profesional' : 'negocio'} y está pendiente de verificación.`,
      targetRole: 'ADMIN',
    });

    return { success: true, providerId: provider.id, role: 'USUARIO' };
  }

  // ── LOGIN ────────────────────────────────────────────────
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Incluir datos del usuario para que Flutter los guarde localmente
    return {
      ...tokens,
      firstName: user.firstName,
      lastName:  user.lastName,
      phone:     user.phone,
      avatarUrl: user.avatarUrl,
    };
  }

  // ── GET ME (perfil completo del usuario autenticado) ─────
  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:         true,
        email:      true,
        firstName:  true,
        lastName:   true,
        phone:      true,
        avatarUrl:  true,
        role:       true,
        department: true,
        province:   true,
        district:   true,
        providers: {
          select: {
            id:                 true,
            businessName:       true,
            type:               true,
            isVerified:         true,
            isVisible:          true,
            availability:       true,
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

      // TODO: enviar email con resetToken cuando se integre el servicio de correo
      if (this.config.get('NODE_ENV') !== 'production') {
        return { message: 'Si el correo existe recibirás un código de recuperación', _devToken: resetToken };
      }
    }

    return { message: 'Si el correo existe recibirás un código de recuperación' };
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
    await this.prisma.refreshToken.delete({ where: { token: `RESET_${token}` } });

    // Cambiar contraseña e invalidar todos los refresh tokens
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
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
      return { message: 'Código OTP enviado al email registrado', _devCode: code };
    }

    return { message: 'Código OTP enviado al email registrado' };
  }

  // ── VERIFY OTP ──────────────────────────────────────────
  async verifyOtp(userId: number, code: string) {
    const record = await this.prisma.otpCode.findFirst({
      where: { userId, code },
    });

    if (!record) {
      throw new BadRequestException('Código inválido');
    }

    if (record.expiresAt < new Date()) {
      // Eliminar el código expirado
      await this.prisma.otpCode.delete({ where: { id: record.id } });
      throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
    }

    // Marcar usuario como verificado y eliminar el OTP
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { isEmailVerified: true } }),
      this.prisma.otpCode.deleteMany({ where: { userId } }),
    ]);
    

    return { message: 'Email verificado correctamente', verified: true };
  }

  // ── HELPER: GENERAR TOKENS ───────────────────────────────
  private async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret:    this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:    this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken, userId, role };
  }
}
