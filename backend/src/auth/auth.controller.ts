import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt.guard.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterProviderDto } from './dto/register-provider.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { SendOtpDto } from './dto/send-otp.dto.js';
import { VerifyOtpDto } from './dto/verify-otp.dto.js';
import { UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    return this.authService.registerUser(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // Registro de perfil de proveedor (usuario ya autenticado)
  @UseGuards(JwtAuthGuard)
  @Post('register/provider')
  @UseInterceptors(FilesInterceptor('images', 4, { // 'images' es la clave que usaremos en Flutter
    storage: diskStorage({
      destination: './uploads', // Asegúrate de que esta carpeta exista en la raíz del backend
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  @HttpCode(HttpStatus.CREATED)
  async registerProvider(
    @Request() req: any, 
    @Body() dto: RegisterProviderDto,
    @UploadedFiles() files: Express.Multer.File[] // <── AQUÍ recibimos las fotos
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
  async getMe(@Request() req: any) {
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
    return this.authService.resetPassword(dto.email, dto.token, dto.newPassword);
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
}
