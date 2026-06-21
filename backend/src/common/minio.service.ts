import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import sharp from 'sharp';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client!: Minio.Client;
  private bucket!: string;
  /** Base R2 canónica (endpoint S3 privado). Las imágenes privadas (DNI,
   *  vouchers) y las legacy se guardan con esta base y el interceptor las
   *  firma. NO depende del CDN público. */
  private r2BaseUrl!: string;
  /** Base CDN para imágenes PÚBLICAS (perfil/ofertas). null = modo público
   *  desactivado → todo firmado como hoy. */
  private cdnBaseUrl: string | null = null;
  /** Bucket público (perfil/ofertas). En modo privado == bucket privado. */
  private publicBucket!: string;

  /** Carpetas con PII/financiero que SIEMPRE van al bucket privado firmado,
   *  nunca al público — aunque el modo público esté activo. */
  private static readonly PRIVATE_FOLDERS = [
    'trust-validation',
    'payments/vouchers',
  ];

  onModuleInit() {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'localhost';
    const port = parseInt(process.env.MINIO_PORT ?? '9000', 10);
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY ?? '';
    const secretKey = process.env.MINIO_SECRET_KEY ?? '';
    this.bucket = process.env.MINIO_BUCKET_NAME ?? 'oficio-uploads';

    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    // Base R2 canónica (path-style) — SIEMPRE el endpoint S3 privado. Es la
    // base de las imágenes PRIVADAS (DNI/vouchers) y legacy; el
    // SignImagesInterceptor las firma (X-Amz-*). No depende del CDN.
    const proto = useSSL ? 'https' : 'http';
    const omitPort = (useSSL && port === 443) || (!useSSL && port === 80);
    const portStr = omitPort ? '' : `:${port}`;
    this.r2BaseUrl = `${proto}://${endpoint}${portStr}/${this.bucket}`;

    // Modo imágenes públicas (Opción A): SOLO se activa con un bucket público
    // DISTINTO del privado + su dominio CDN. Exigir un bucket distinto es la
    // salvaguarda anti-PII: evita que el dominio público sirva el bucket con
    // DNI/selfies/vouchers. Si falta cualquiera de los dos → NO se activa y
    // todo se comporta EXACTAMENTE como hoy (firmado).
    const cdn = process.env.MINIO_PUBLIC_URL?.replace(/\/+$/, '') || null;
    const pubBucket = process.env.MINIO_PUBLIC_BUCKET || null;
    if (cdn && pubBucket && pubBucket !== this.bucket) {
      this.cdnBaseUrl = cdn;
      this.publicBucket = pubBucket;
    } else {
      this.cdnBaseUrl = null;
      this.publicBucket = this.bucket;
      if (cdn) {
        this.logger.error(
          'MINIO_PUBLIC_URL definido pero falta un MINIO_PUBLIC_BUCKET DISTINTO del privado — modo público DESACTIVADO por seguridad (evita exponer DNI/selfies/vouchers por el dominio público).',
        );
      }
    }

    this.logger.log(
      `MinioService conectado a ${endpoint}:${port} — bucket privado: ${this.bucket}` +
        (this.cdnBaseUrl
          ? ` · público: ${this.publicBucket} (CDN ${this.cdnBaseUrl})`
          : ' · modo público OFF (firmado)'),
    );
  }

  /**
   * Sube un archivo al bucket y devuelve su URL pública.
   * @param fileBuffer Buffer del archivo (Multer memoryStorage)
   * @param originalName Nombre original del archivo (para extraer extensión)
   * @param folder Carpeta destino dentro del bucket, ej: 'providers/gallery'
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    folder: string,
  ): Promise<string> {
    const ext = extname(originalName).toLowerCase() || '.jpg';
    const objectName = `${folder}/${randomUUID()}${ext}`;
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

    // Imagen pública (perfil/ofertas/avatares/reviews/broadcasts) Y modo
    // público activo → bucket público + thumbnail + URL CDN. Las carpetas
    // privadas (DNI/vouchers) NUNCA entran aquí.
    const isPublic = !!this.cdnBaseUrl && !this.isPrivateFolder(folder);

    if (isPublic) {
      try {
        // Original (alta calidad — lo usa el detalle del perfil/oferta).
        await this.client.putObject(
          this.publicBucket,
          objectName,
          fileBuffer,
          fileBuffer.length,
          { 'Content-Type': contentType },
        );
        // Thumbnail 400px webp q80 (Opción C) — lo sirven los LISTADOS para
        // bajar el peso en redes lentas. auto-orienta con rotate() (EXIF).
        const thumb = await sharp(fileBuffer)
          .rotate()
          .resize({ width: 400, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        await this.client.putObject(
          this.publicBucket,
          this.thumbKey(objectName),
          thumb,
          thumb.length,
          { 'Content-Type': 'image/webp' },
        );
        // URL del CDN: el SignImagesInterceptor NO la toca (no es r2.cloud…)
        // → se sirve pública por la CDN de Cloudflare, sin firma.
        return `${this.cdnBaseUrl}/${objectName}`;
      } catch (err) {
        // Si el thumb o el bucket público fallan, NUNCA dejamos una URL CDN
        // sin su thumb (evita 404 en listados). Fallback seguro: subir al
        // bucket privado + URL R2 firmable (comportamiento de hoy).
        this.logger.error(
          `upload público falló (${objectName}) → fallback privado firmado: ${(err as Error).message}`,
        );
        await this.client.putObject(
          this.bucket,
          objectName,
          fileBuffer,
          fileBuffer.length,
          { 'Content-Type': contentType },
        );
        return `${this.r2BaseUrl}/${objectName}`;
      }
    }

    // Privado / legacy: bucket privado + URL R2 canónica. El interceptor la
    // firma con expiración fresca en cada respuesta.
    await this.client.putObject(
      this.bucket,
      objectName,
      fileBuffer,
      fileBuffer.length,
      { 'Content-Type': contentType },
    );
    return `${this.r2BaseUrl}/${objectName}`;
  }

  /** Carpetas con PII/financiero — siempre privadas y firmadas. */
  private isPrivateFolder(folder: string): boolean {
    return MinioService.PRIVATE_FOLDERS.some(
      (f) => folder === f || folder.startsWith(`${f}/`),
    );
  }

  /** key del thumbnail: `providers/gallery/uuid.jpg` → `…/uuid_thumb.webp`. */
  private thumbKey(objectName: string): string {
    const dot = objectName.lastIndexOf('.');
    const base = dot >= 0 ? objectName.slice(0, dot) : objectName;
    return `${base}_thumb.webp`;
  }

  /**
   * READ-TIME (listados): dada una URL del CDN público, devuelve la del
   * thumbnail. Si la URL NO es del CDN (legacy R2 firmada, privada, o modo
   * público apagado) la devuelve SIN cambios → seguro en cualquier config.
   * Estático y puro (lee `MINIO_PUBLIC_URL`) para no requerir inyección en
   * los servicios de lectura.
   */
  static publicThumbUrl(url: string): string {
    const cdn = process.env.MINIO_PUBLIC_URL?.replace(/\/+$/, '');
    if (!url || !cdn || !url.startsWith(`${cdn}/`)) return url;
    const key = url.slice(cdn.length + 1).split('?')[0];
    const dot = key.lastIndexOf('.');
    const base = dot >= 0 ? key.slice(0, dot) : key;
    return `${cdn}/${base}_thumb.webp`;
  }

  /**
   * Toma cualquier URL almacenada (presignada o no) y devuelve una URL
   * presignada fresca con 7 días de validez. Usado por el interceptor global
   * para firmar URLs antes de enviarlas al cliente.
   */
  async signUrl(storedUrl: string): Promise<string> {
    if (!storedUrl) return storedUrl;
    try {
      const urlObj = new URL(storedUrl);
      // Extraer clave del objeto desde la ruta (ignora query params / firma vieja)
      let key = urlObj.pathname.replace(/^\//, '');
      if (key.startsWith(this.bucket + '/')) {
        key = key.slice(this.bucket.length + 1);
      }
      if (!key) return storedUrl;
      // Siempre generar firma fresca (7 días), incluso si la URL ya tenía firma expirada
      return await this.client.presignedGetObject(this.bucket, key, 604800);
    } catch {
      return storedUrl;
    }
  }

  /**
   * Elimina un archivo del bucket a partir de su URL pública.
   * No lanza error si el archivo no existe.
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;
    try {
      // Imagen pública (URL del CDN): borrar original + thumb del bucket
      // público.
      if (this.cdnBaseUrl && fileUrl.startsWith(`${this.cdnBaseUrl}/`)) {
        const key = fileUrl.slice(this.cdnBaseUrl.length + 1).split('?')[0];
        await this.client.removeObject(this.publicBucket, key);
        await this.client
          .removeObject(this.publicBucket, this.thumbKey(key))
          .catch(() => {});
        return;
      }
      // Privada / legacy: bucket privado (lógica de hoy).
      const url = new URL(fileUrl);
      let key = url.pathname.replace(/^\//, '');
      // Quitar prefijo del bucket si está en la ruta (path-style URLs)
      if (key.startsWith(this.bucket + '/')) {
        key = key.slice(this.bucket.length + 1);
      }
      await this.client.removeObject(this.bucket, key);
    } catch (e) {
      this.logger.warn(
        `deleteFile: no se pudo eliminar ${fileUrl} — ${(e as Error).message}`,
      );
    }
  }
}
