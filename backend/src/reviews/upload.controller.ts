import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'node:path';
import { MinioService } from '../common/minio.service.js';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const FOLDERS = {
  reviewEvidence: 'reviews/evidence',
  provider:       'providers/gallery',
  paymentVoucher: 'payments/vouchers',
} as const;

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

const memOpts = { storage: memoryStorage(), fileFilter: imageFilter, limits: { fileSize: MAX_SIZE } };

@Controller('upload')
export class UploadController {
  constructor(private readonly minio: MinioService) {}

  @Post('review-photo')
  @UseInterceptors(FileInterceptor('file', memOpts))
  async uploadReviewPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const url = await this.minio.uploadFile(file.buffer, file.originalname, FOLDERS.reviewEvidence);
    return { url };
  }

  @Post('provider-photo')
  @UseInterceptors(FileInterceptor('file', memOpts))
  async uploadProviderPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const url = await this.minio.uploadFile(file.buffer, file.originalname, FOLDERS.provider);
    return { url };
  }

  @Post('payment-voucher')
  @UseInterceptors(FileInterceptor('file', memOpts))
  async uploadPaymentVoucher(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const url = await this.minio.uploadFile(file.buffer, file.originalname, FOLDERS.paymentVoucher);
    return { url };
  }
}
