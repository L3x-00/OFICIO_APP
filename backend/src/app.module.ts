import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { SignImagesInterceptor } from './common/sign-images.interceptor.js';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { AdminModule } from './admin/admin.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { ProviderProfileModule } from './provider-profile/provider-profile.module.js';
import { EventsModule } from './events/events.module.js';
import { TrustValidationModule } from './trust-validation/trust-validation.module.js';
import { SubastasModule } from './subastas/subastas.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ReferralsModule } from './referrals/referrals.module.js';

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

    // En el módulo de Redis o donde configures CacheModule
    CacheModule.registerAsync({
      useFactory: async () => {
        const store = await redisStore({
          socket: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            tls: process.env.REDIS_TLS === 'true', // ← ESTO ES CLAVE
          },
          password: process.env.REDIS_PASSWORD || undefined,
        });
        return {
          store,
          ttl: 60 * 5, // 5 minutos por defecto
          isGlobal: true,
        };
      },
    }),

    // 4. Módulos de la Aplicación
    CommonModule,
    FavoritesModule,
    AuthModule,
    ProviderProfileModule,
    UsersModule,
    PrismaModule,
    ProvidersModule,
    ReviewsModule,
    AdminModule,
    EventsModule,
    TrustValidationModule,
    SubastasModule,
    PaymentsModule,
    ReferralsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Rate limiting global
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Firma automáticamente todas las URLs de R2 en las respuestas JSON
    {
      provide: APP_INTERCEPTOR,
      useClass: SignImagesInterceptor,
    },
  ],
})
export class AppModule {}