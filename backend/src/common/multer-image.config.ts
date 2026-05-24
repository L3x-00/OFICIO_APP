import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import { memoryStorage } from 'multer';
import { extname } from 'node:path';

/**
 * Configuración compartida de Multer para subida de imágenes a memoria
 * (handler que luego sube a MinIO/R2). Reemplaza los duplicados que vivían
 * en `users.controller.ts` y `reviews/upload.controller.ts`.
 */
export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
] as const;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Filtro de archivos: solo image/* + extensión válida. */
export function imageFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
): void {
  if (!file.mimetype.startsWith('image/')) {
    cb(
      new BadRequestException(
        'Solo se permiten imágenes (JPG, PNG, WEBP, GIF)',
      ),
      false,
    );
    return;
  }
  const ext = extname(file.originalname).toLowerCase();
  if (
    !ALLOWED_IMAGE_EXTENSIONS.includes(
      ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number],
    )
  ) {
    cb(
      new BadRequestException(
        `Extensión no permitida. Usa: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
      ),
      false,
    );
    return;
  }
  cb(null, true);
}

/** Opciones listas para `FileInterceptor('field', memOpts)`. */
export const memOpts: MulterOptions = {
  storage: memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
};
