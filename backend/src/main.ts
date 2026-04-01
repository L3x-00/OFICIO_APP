import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
// 1. Importamos los tipos y herramientas necesarios
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';

async function bootstrap() {
  // 2. Añadimos el genérico <NestExpressApplication> para habilitar métodos de Express
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 3. HABILITAR CORS (Manteniendo tus credenciales y métodos)
  app.enableCors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 4. VALIDATION PIPE (Tu configuración actual de seguridad)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 5. SERVIR ARCHIVOS ESTÁTICOS (Hito 4)
  // Esto permitirá que si subes una foto a la carpeta /uploads, 
  // sea accesible desde http://localhost:3000/uploads/nombre-foto.jpg
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // 6. ESCUCHAR EN 0.0.0.0
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0'); 
  
  console.log(`🚀 Servidor corriendo en: http://localhost:${port}`);
  console.log(`📂 Archivos estáticos servidos en: http://localhost:${port}/uploads`);
}
bootstrap();