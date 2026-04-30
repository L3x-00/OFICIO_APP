import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { MinioService } from './minio.service.js';

/**
 * Interceptor global que recorre toda respuesta JSON y firma automáticamente
 * cualquier URL de Cloudflare R2 que no tenga presign (sin X-Amz-Signature).
 *
 * Esto permite que el bucket permanezca privado mientras Flutter recibe URLs
 * presignadas de 7 días, sin necesidad de cambios en Flutter ni en los servicios.
 *
 * presignedGetObject() es una operación local (HMAC), no hace llamadas de red.
 */
@Injectable()
export class SignImagesInterceptor implements NestInterceptor {
  constructor(private readonly minio: MinioService) {}

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      mergeMap(async (data) => this.transform(data)),
    );
  }

  private async transform(value: unknown): Promise<unknown> {
    if (typeof value === 'string') {
      return this.isUnsignedR2Url(value)
        ? await this.minio.signUrl(value)
        : value;
    }
    if (Array.isArray(value)) {
      return Promise.all(value.map((v) => this.transform(v)));
    }
    if (value !== null && typeof value === 'object') {
      const entries = await Promise.all(
        Object.entries(value as Record<string, unknown>).map(
          async ([k, v]) => [k, await this.transform(v)] as [string, unknown],
        ),
      );
      return Object.fromEntries(entries);
    }
    return value;
  }

  private isUnsignedR2Url(url: string): boolean {
    // Firmar CUALQUIER URL de R2 (nueva o con firma expirada) para garantizar validez
    return url.includes('r2.cloudflarestorage.com');
  }
}
