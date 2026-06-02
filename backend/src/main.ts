import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger, ValidationPipe } from '@nestjs/common';
import { BigintInterceptor } from './common/interceptors/bigint.interceptor.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DiagnosticInterceptor } from './common/interceptors/diagnostic.interceptor.js';
import helmet from 'helmet';
import compression from 'compression';

// Sentry debe inicializarse ANTES de crear la app NestJS
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: 1.0,
    integrations: [nodeProfilingIntegration()],
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 0. HARDENING (helmet + compression) ANTES de CORS
  // helmet aplica cabeceras de seguridad (CSP relajada para no romper imágenes
  // firmadas + admin panel); compression activa gzip de respuestas JSON.
  app.use(
    helmet({
      contentSecurityPolicy: false, // evita romper Next.js admin / Flutter assets remotos
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite cargar imágenes desde R2
    }),
  );
  app.use(compression());

  // 1. CORS — restrictivo en producción, abierto en desarrollo
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = isProd
    ? (process.env.ALLOWED_ORIGINS ?? 'https://admin.tudominio.com')
        .split(',')
        .map((o) => o.trim())
    : true;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // 2. FILTROS Y PIPES DE VALIDACIÓN
  app.useGlobalFilters(new PrismaExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 3. INTERCEPTORES GLOBALES (Agrupados en una sola llamada)
  // Nota: El DiagnosticInterceptor va primero para loguear el error original
  app.useGlobalInterceptors(
    new DiagnosticInterceptor(),
    new BigintInterceptor(),
  );

  // 4. SERVICIOS DE ARCHIVOS (UPLOADS) — ELIMINADO (auditoría A3).
  // El flujo real sube a Cloudflare R2; servir el directorio local `/uploads`
  // sin autenticación exponía PII potencial (DNI/RUC/vouchers) por URL.

  // 5. ARRANQUE
  const port = process.env.PORT ?? 3000;
  // Confiar en el proxy de Render para obtener la IP real del cliente
  app.set('trust proxy', 1);
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`Servidor corriendo en http://localhost:${port}`);
  logger.log('Logs de diagnóstico activados');
}
bootstrap();
