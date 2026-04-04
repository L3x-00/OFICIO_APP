import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

// ── Helper: crea la configuración de multer para un subdirectorio ──
function makeStorage(subfolder: string) {
  return diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = `./uploads/${subfolder}`;
      if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${uniqueName}${extname(file.originalname)}`);
    },
  });
}

function imageFilter(req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.startsWith('image/')) {
    cb(new BadRequestException('Solo se permiten imágenes (JPG, PNG, WEBP)'), false);
    return;
  }
  cb(null, true);
}

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('upload')
export class UploadController {

  @Post('review-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: makeStorage('reviews'),
      fileFilter: imageFilter,
      limits: { fileSize: MAX_SIZE },
    }),
  )
  uploadReviewPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    return { url: `http://localhost:3000/uploads/reviews/${file.filename}` };
  }

  @Post('provider-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: makeStorage('providers'),
      fileFilter: imageFilter,
      limits: { fileSize: MAX_SIZE },
    }),
  )
  uploadProviderPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    return { url: `http://localhost:3000/uploads/providers/${file.filename}` };
  }
}