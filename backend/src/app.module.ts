import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { AdminModule } from './admin/admin.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';

@Module({
  imports: [
    // 1. Configuración Global
    ConfigModule.forRoot({ 
      isGlobal: true, 
    }),

    // 2. Rate limiting (Throttler): Protección contra ataques
    ThrottlerModule.forRoot([{
      ttl: 60000,   // ventana de 60 segundos
      limit: 60,    // máximo 60 requests
    }]),

    // 3. Caché con Redis (Optimización de rendimiento)
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
          password: process.env.REDIS_PASSWORD,
          ttl: 300, // 5 minutos de caché por defecto
        }),
      }),
    }),

    // 4. Módulos de la Aplicación
    FavoritesModule,
    AuthModule,
    UsersModule,
    PrismaModule,
    ProvidersModule,
    ReviewsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplica el rate limiting (Throttler) a todas las rutas automáticamente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}