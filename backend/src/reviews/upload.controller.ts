import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from '../common/minio.service.js';
import { memOpts } from '../common/multer-image.config.js';

const FOLDERS = {
  reviewEvidence: 'reviews/evidence',
  provider:       'providers/gallery',
  paymentVoucher: 'payments/vouchers',
} as const;

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
