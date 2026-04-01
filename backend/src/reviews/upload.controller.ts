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

@Controller('upload')
export class UploadController {

  @Post('review-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/reviews';
          // Crear carpeta si no existe
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Nombre único: timestamp + extensión original
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${uniqueName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Solo imágenes
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Solo se permiten imágenes'), false);
          return;
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB máximo
      },
    }),
  )
  uploadReviewPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se recibió ninguna imagen');
    }

    // Devuelve la URL pública del archivo
    const fileUrl = `http://localhost:3000/uploads/reviews/${file.filename}`;
    return { url: fileUrl, filename: file.filename };
  }
}