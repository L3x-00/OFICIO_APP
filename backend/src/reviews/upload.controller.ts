import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// ── Directorios canónicos de almacenamiento ───────────────
//   Evidencia de reseñas  →  uploads/reviews/evidence/
//   Fotos de proveedores  →  uploads/providers/
const SUBFOLDERS = {
  reviewEvidence:  'reviews/evidence',
  provider:        'providers',
  paymentVoucher:  'payments/vouchers',
} as const;

// ── Genera configuración de almacenamiento multer ─────────
function makeStorage(subfolder: string) {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const uploadPath = `./uploads/${subfolder}`;
      if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);  // UUID → imposible colisión
    },
  });
}

// ── Valida que el archivo sea una imagen permitida ─────────
function imageFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (!file.mimetype.startsWith('image/')) {
    cb(new BadRequestException('Solo se permiten imágenes (JPG, PNG, WEBP)'), false);
    return;
  }
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    cb(
      new BadRequestException(`Extensión no permitida. Usa: ${ALLOWED_EXTENSIONS.join(', ')}`),
      false,
    );
    return;
  }
  cb(null, true);
}

// ── Construye la URL pública del archivo ──────────────────
function buildUrl(subfolder: string, filename: string): string {
  const base = process.env.API_BASE_URL ?? 'http://localhost:3000';
  return `${base}/uploads/${subfolder}/${filename}`;
}

// ─────────────────────────────────────────────────────────
@Controller('upload')
export class UploadController {

  /**
   * POST /upload/review-photo
   * Almacena la foto de evidencia de una reseña.
   * Destino: uploads/reviews/evidence/<uuid>.<ext>
   */
  @Post('review-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage:    makeStorage(SUBFOLDERS.reviewEvidence),
      fileFilter: imageFilter,
      limits:     { fileSize: MAX_SIZE },
    }),
  )
  uploadReviewPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    return { url: buildUrl(SUBFOLDERS.reviewEvidence, file.filename) };
  }

  /**
   * POST /upload/provider-photo
   * Almacena fotos de perfil o galería de un proveedor/negocio.
   * Destino: uploads/providers/<uuid>.<ext>
   */
  @Post('provider-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage:    makeStorage(SUBFOLDERS.provider),
      fileFilter: imageFilter,
      limits:     { fileSize: MAX_SIZE },
    }),
  )
  uploadProviderPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    return { url: buildUrl(SUBFOLDERS.provider, file.filename) };
  }

  /**
   * POST /upload/payment-voucher
   * Almacena captura de comprobante Yape.
   * Destino: uploads/payments/vouchers/<uuid>.<ext>
   */
  @Post('payment-voucher')
  @UseInterceptors(
    FileInterceptor('file', {
      storage:    makeStorage(SUBFOLDERS.paymentVoucher),
      fileFilter: imageFilter,
      limits:     { fileSize: MAX_SIZE },
    }),
  )
  uploadPaymentVoucher(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    return { url: buildUrl(SUBFOLDERS.paymentVoucher, file.filename) };
  }
}
