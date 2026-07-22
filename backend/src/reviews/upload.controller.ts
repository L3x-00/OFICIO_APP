import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from '../common/minio.service.js';
import { memOpts } from '../common/multer-image.config.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

const FOLDERS = {
  reviewEvidence: 'reviews/evidence',
  provider: 'providers/gallery',
  paymentVoucher: 'payments/vouchers',
  broadcast: 'admin/broadcasts',
} as const;

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly minio: MinioService) {}

  @Post('review-photo')
  @UseInterceptors(FileInterceptor('file', memOpts))
  async uploadReviewPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const url = await this.minio.uploadFile(
      file.buffer,
      file.originalname,
      FOLDERS.reviewEvidence,
    );
    return { url };
  }

  @Post('provider-photo')
  @UseInterceptors(FileInterceptor('file', memOpts))
  async uploadProviderPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const url = await this.minio.uploadFile(
      file.buffer,
      file.originalname,
      FOLDERS.provider,
    );
    return { url };
  }

  @Post('payment-voucher')
  @UseInterceptors(FileInterceptor('file', memOpts))
  async uploadPaymentVoucher(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const url = await this.minio.uploadFile(
      file.buffer,
      file.originalname,
      FOLDERS.paymentVoucher,
    );
    return { url };
  }

  // Imagen del broadcast masivo del admin. Va a una carpeta separada
  // para que el cleanup (vencimiento, retención) pueda tratarlas
  // distinto del resto del catálogo (no son fotos de catálogo).
  @Post('broadcast-image')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file', memOpts))
  async uploadBroadcastImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const url = await this.minio.uploadFile(
      file.buffer,
      file.originalname,
      FOLDERS.broadcast,
    );
    return { url };
  }
}
