import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { MinioService } from '../common/minio.service.js';
import { memOpts } from '../common/multer-image.config.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly minio: MinioService,
  ) {}

  // GET /users/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: any) {
    return this.usersService.getMe(req.user.userId);
  }

  // GET /users/my-provider-status
  @UseGuards(JwtAuthGuard)
  @Get('my-provider-status')
  getMyProviderStatus(@Request() req: any) {
    return this.usersService.getMyProviderStatus(req.user.userId);
  }

  // PATCH /users/profile
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  // PATCH /users/me/device-token
  @UseGuards(JwtAuthGuard)
  @Patch('me/device-token')
  saveDeviceToken(@Request() req: any, @Body('token') token: string) {
    if (!token) throw new BadRequestException('token requerido');
    return this.usersService.saveFcmToken(req.user.userId, token);
  }

  // DELETE /users/me/device-token — invalida el token al hacer logout
  @UseGuards(JwtAuthGuard)
  @Delete('me/device-token')
  clearDeviceToken(@Request() req: any) {
    return this.usersService.clearFcmToken(req.user.userId);
  }

  // PATCH /users/change-password
  // El mobile (`auth_repository.changePassword`) llama aquí con
  // `{ currentPassword, newPassword }`. La ruta faltaba en el
  // controller (el método del service estaba implementado pero sin
  // exponer), por lo que el cliente recibía 404 y la UI lo traducía
  // como "contraseña actual incorrecta".
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // PATCH /users/profile-picture
  @UseGuards(JwtAuthGuard)
  @Patch('profile-picture')
  @UseInterceptors(FileInterceptor('avatar', memOpts))
  async updateProfilePicture(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const avatarUrl = await this.minio.uploadFile(
      file.buffer,
      file.originalname,
      'clients/profiles',
    );
    return this.usersService.updateProfilePicture(
      req.user.id || req.user.userId,
      avatarUrl,
    );
  }
}
