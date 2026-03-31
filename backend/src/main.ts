import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. HABILITAR CORS (Crucial para que el navegador no bloquee las peticiones)
  app.enableCors({
    origin: '*', // En desarrollo puedes usar '*' para permitir todo
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 2. VALIDATION PIPE (Para que el @Body() no llegue vacío)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 3. ESCUCHAR EN 0.0.0.0 (Para que sea visible desde el emulador y la red)
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0'); 
  
  console.log(`🚀 Servidor corriendo en: http://localhost:${port}`);
}
bootstrap();
