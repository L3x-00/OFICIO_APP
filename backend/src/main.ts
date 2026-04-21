import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { BigintInterceptor } from './common/interceptors/bigint.interceptor.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { DiagnosticInterceptor } from './common/interceptors/diagnostic.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. CONFIGURACIÓN DE RED Y SEGURIDAD
  app.enableCors({
    origin: true, 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
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