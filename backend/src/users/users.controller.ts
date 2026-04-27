import {
  Controller, Get, Patch, Body, UseGuards, Request,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'node:path';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { MinioService } from '../common/minio.service.js';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE = 5 * 1024 * 1024;

function imageFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.startsWith('image/')) {
    cb(new BadRequestException('Solo se permiten imágenes (JPG, PNG, WEBP)'), false);
    return;
  }
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    cb(new BadRequestException(`Extensión no permitida. Usa: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
    return;
  }
  cb(null, true);
}

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

  // PATCH /users/profile-picture
  @UseGuards(JwtAuthGuard)
  @Patch('profile-picture')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage:    memoryStorage(),
      fileFilter: imageFilter,
      limits:     { fileSize: MAX_SIZE },
    }),
  )
  async updateProfilePicture(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const avatarUrl = await this.minio.uploadFile(file.buffer, file.originalname, 'clients/profiles');
    return this.usersService.updateProfilePicture(req.user.id || req.user.userId, avatarUrl);
  }
}
