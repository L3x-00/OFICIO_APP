import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/my-provider-status
  // El usuario autenticado consulta si ya tiene perfil de proveedor y su estado
  @UseGuards(JwtAuthGuard)
  @Get('my-provider-status')
  getMyProviderStatus(@Request() req: any) {
    return this.usersService.getMyProviderStatus(req.user.userId);
  }
}
