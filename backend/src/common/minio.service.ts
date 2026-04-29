import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const MIME_MAP: Record<string, string> = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.pdf':  'application/pdf',
};

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client!: Minio.Client;
  private bucket!: string;
  private publicBaseUrl!: string;

  onModuleInit() {
    const endpoint  = process.env.MINIO_ENDPOINT  ?? 'localhost';
    const port      = parseInt(process.env.MINIO_PORT ?? '9000', 10);
    const useSSL    = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY ?? '';
    const secretKey = process.env.MINIO_SECRET_KEY ?? '';
    this.bucket     = process.env.MINIO_BUCKET_NAME ?? 'oficio-uploads';

    this.client = new Minio.Client({ endPoint: endpoint, port, useSSL, accessKey, secretKey });

    // URL pública de acceso a los archivos.
    // Para Cloudflare R2 con bucket público o dominio personalizado, usar MINIO_PUBLIC_URL.
    // Si no está definida, se construye desde el endpoint (funciona si el bucket es público).
    const explicitPublic = process.env.MINIO_PUBLIC_URL;
    if (explicitPublic) {
      this.publicBaseUrl = explicitPublic.replace(/\/$/, '');
    } else {
      const proto = useSSL ? 'https' : 'http';
      const omitPort = (useSSL && port === 443) || (!useSSL && port === 80);
      const portStr  = omitPort ? '' : `:${port}`;
      this.publicBaseUrl = `${proto}://${endpoint}${portStr}/${this.bucket}`;
    }

    this.logger.log(`MinioService conectado a ${endpoint}:${port} — bucket: ${this.bucket}`);
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
    const ext        = extname(originalName).toLowerCase() || '.jpg';
    const objectName = `${folder}/${randomUUID()}${ext}`;
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

    await this.client.putObject(
      this.bucket,
      objectName,
      fileBuffer,
      fileBuffer.length,
      { 'Content-Type': contentType },
    );

    // Si hay URL pública configurada (bucket público / dominio personalizado), usarla.
    // Si no, generar una URL presignada (máx 7 días para Cloudflare R2).
    if (process.env.MINIO_PUBLIC_URL) {
      return `${this.publicBaseUrl}/${objectName}`;
    }
    return this.client.presignedGetObject(this.bucket, objectName, 604800);
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
      // Ya está presignada y vigente → devolver tal cual
      if (urlObj.searchParams.has('X-Amz-Signature')) return storedUrl;

      // Extraer la clave del objeto desde la ruta
      let key = urlObj.pathname.replace(/^\//, '');
      if (key.startsWith(this.bucket + '/')) {
        key = key.slice(this.bucket.length + 1);
      }
      if (!key) return storedUrl;

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
    try {
      const url = new URL(fileUrl);
      let key = url.pathname.replace(/^\//, '');
      // Quitar prefijo del bucket si está en la ruta (path-style URLs)
      if (key.startsWith(this.bucket + '/')) {
        key = key.slice(this.bucket.length + 1);
      }
      await this.client.removeObject(this.bucket, key);
    } catch (e) {
      this.logger.warn(`deleteFile: no se pudo eliminar ${fileUrl} — ${(e as Error).message}`);
    }
  }
}
