import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './roles.decorator.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterProviderDto } from './dto/register-provider.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { SocialLoginDto } from './dto/social-login.dto.js';
import { UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../common/interfaces/auth-request.js';
import { providerImagesOpts } from '../common/multer-image.config.js';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async register(@Body() dto: RegisterUserDto) {
    return this.authService.registerUser(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Request() req: AuthenticatedRequest) {
    return this.authService.login(dto.email, dto.password, req.ip);
  }

  // Registro de perfil de proveedor (usuario ya autenticado)
  @UseGuards(JwtAuthGuard)
  @Post('register/provider')
  @UseInterceptors(FilesInterceptor('images', 4, providerImagesOpts))
  @HttpCode(HttpStatus.CREATED)
  async registerProvider(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RegisterProviderDto,
    @UploadedFiles() files: Express.Multer.File[], // <── AQUÍ recibimos las fotos
  ) {
    // Pasamos los archivos al servicio
    return this.authService.registerProvider(req.user.userId, dto, files);
  }

  // Renueva el access token usando el refresh token
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshTokens(body.refreshToken);
  }

  // Retorna el perfil completo del usuario autenticado (usuario + proveedor si aplica)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest) {
    return this.authService.getMe(req.user.userId);
  }

  // POST /auth/forgot-password — envía código de recuperación al email
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // POST /auth/reset-password — establece nueva contraseña con el token recibido
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.email,
      dto.token,
      dto.newPassword,
    );
  }

  // POST /auth/admin-request-reset — el admin dispara un reset para un usuario.
  // Solo ADMIN. Genera token seguro (1h) y envía el enlace por email; el
  // usuario crea su propia contraseña. El admin nunca la ve ni la cambia.
  @Post('admin-request-reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async adminRequestReset(@Body('userId') userId: number) {
    return this.authService.adminRequestPasswordReset(Number(userId));
  }

  // POST /auth/send-otp — genera y envía un código OTP al email del usuario
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.userId);
  }

  // POST /auth/verify-otp — valida OTP, crea usuario en BD y devuelve tokens
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.pendingId, dto.code);
  }

  // POST /auth/resend-otp — reenvía OTP para un registro pendiente
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() body: { pendingId: string }) {
    return this.authService.resendPendingOtp(body.pendingId);
  }

  // POST /auth/social-login — verifica idToken de Firebase y devuelve JWT propios
  @Post('social-login')
  @HttpCode(HttpStatus.OK)
  async socialLogin(
    @Body() dto: SocialLoginDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Pasamos `req.ip` para que el mapa de calor del admin (geo-stats)
    // tenga datos reales también para los usuarios sociales. Antes solo
    // los de email/password registraban `lastIp` → el mapa quedaba
    // vacío en pruebas porque la mayoría entra con Google.
    return this.authService.socialLogin(dto.idToken, req.ip);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Request() req: AuthenticatedRequest) {
    return this.authService.deleteAccount(req.user.userId);
  }

  // POST /auth/setup-password — usuarios sociales (Google/Facebook) que
  // aún no tienen contraseña propia (su passwordHash es el dummy del
  // login social) pueden setearla por primera vez. No requiere
  // contraseña actual — es un setup, no un cambio.
  @Post('setup-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async setupPassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: { newPassword: string },
  ) {
    return this.authService.setupPassword(req.user.userId, body.newPassword);
  }
}
