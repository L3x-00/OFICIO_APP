import {
  Controller, Get, Patch, Body, UseGuards, Request,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE = 5 * 1024 * 1024;

const avatarStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const p = './uploads/clients/profiles';
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
    cb(null, p);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
  },
});

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
  constructor(private readonly usersService: UsersService) {}

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

  // PATCH /users/profile-picture
  @UseGuards(JwtAuthGuard)
  @Patch('profile-picture')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage:    avatarStorage,
      fileFilter: imageFilter,
      limits:     { fileSize: MAX_SIZE },
    }),
  )
  updateProfilePicture(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');

    // Obtenemos el valor del env
    let base = process.env.API_BASE_URL ?? 'http://localhost:3000';

    // LIMPIEZA AGRESIVA: 
    // 1. Quitamos comillas
    // 2. Quitamos el texto "API_BASE_URL=" si es que se coló por error
    // 3. Quitamos espacios en blanco
    const cleanBase = base.replace(/"/g, '').replace('API_BASE_URL=', '').trim();

    const avatarUrl = `${cleanBase}/uploads/clients/profiles/${file.filename}`;
    
    // Imprime esto en tu consola de NestJS para verificar que salga bien:
    console.log('--- URL GENERADA ---', avatarUrl);

    return this.usersService.updateProfilePicture(req.user.id || req.user.userId, avatarUrl);
  }
}
