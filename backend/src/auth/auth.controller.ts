import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  // Inyectamos el servicio que tendrá la lógica
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: any) {
    return this.authService.registerUser(dto);
  }

  @Post('login')
  async login(@Body() dto: { email: string; password: string }) {
    // Asegúrate de que aquí diga .login y NO .loginUser
    return this.authService.login(dto.email, dto.password);
  }
}
