import { Controller, Post, Get, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt.guard.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterProviderDto } from './dto/register-provider.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

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
  @HttpCode(HttpStatus.CREATED)
  async registerProvider(@Request() req: any, @Body() dto: RegisterProviderDto) {
    return this.authService.registerProvider(req.user.userId, dto);
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
}
