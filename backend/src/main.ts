import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { BigintInterceptor } from './common/interceptors/bigint.interceptor.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { DiagnosticInterceptor } from './common/interceptors/diagnostic.interceptor.js';

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

  // 1. CORS — restrictivo en producción, abierto en desarrollo
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = isProd
    ? (process.env.ALLOWED_ORIGINS ?? 'https://admin.tudominio.com')
        .split(',')
        .map((o) => o.trim())
    : true;

  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') ?? '*'
      : '*',
    credentials: true,
  });

  // 2. FILTROS Y PIPES DE VALIDACIÓN
  app.useGlobalFilters(new PrismaExceptionFilter());
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 3. INTERCEPTORES GLOBALES (Agrupados en una sola llamada)
  // Nota: El DiagnosticInterceptor va primero para loguear el error original
  app.useGlobalInterceptors(
    new DiagnosticInterceptor(),
    new BigintInterceptor()
  );

  // 4. SERVICIOS DE ARCHIVOS (UPLOADS)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // 5. ARRANQUE
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0'); 
  
  console.log(`🚀 Servidor corriendo en: http://localhost:${port}`);
  console.log(`📂 Logs de diagnóstico activados`);
}
bootstrap();