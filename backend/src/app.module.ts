import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Redis } from 'ioredis';
import { ScheduleModule } from '@nestjs/schedule';
import { SignImagesInterceptor } from './common/sign-images.interceptor.js';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

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
import { ChatModule } from './chat/chat.module.js';
import { LocalitiesModule } from './localities/localities.module.js';
import { OfferPostsModule } from './offer-posts/offer-posts.module.js';
import { MercadoPagoModule } from './payments/mercadopago/mercadopago.module.js';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module.js';
import { ProviderFeaturesModule } from './common/provider-features.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
@Module({
  imports: [
    // 1. Configuración Global
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Rate limiting (Throttler): Protección contra ataques.
    // Storage en REDIS (Upstash) → el límite es coherente entre instancias
    // (antes era in-memory: N instancias = N×límite, bypass — auditoría A2).
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const tls = process.env.REDIS_TLS === 'true';
        const redis = new Redis({
          host: process.env.REDIS_HOST,
          port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          tls: tls ? {} : undefined,
          maxRetriesPerRequest: 3,
        });
        // Un error de Redis NO debe tumbar el proceso: lo logueamos.
        const logger = new Logger('ThrottlerRedis');
        redis.on('error', (e: Error) =>
          logger.error(`Redis error: ${e?.message ?? e}`),
        );
        return {
          throttlers: [
            {
              ttl: 60000, // ventana de 60 segundos
              limit: 60, // máximo 60 requests
            },
          ],
          storage: new ThrottlerStorageRedisService(redis),
        };
      },
    }),

    // Cron jobs (limpieza de chat expirado, etc.)
    ScheduleModule.forRoot(),

    // En el módulo de Redis o donde configures CacheModule
    CacheModule.registerAsync({
      // isGlobal va a NIVEL de registerAsync (no dentro del useFactory) para
      // que CACHE_MANAGER quede disponible en TODOS los módulos (incl.
      // AiAssistantModule). Antes estaba anidado en el return del factory,
      // donde se ignora → CacheModule no era global.
      isGlobal: true,
      useFactory: () => {
        // cache-manager v7 usa `stores` (array de Keyv), NO `store` (singular):
        // ese era el bug — `store` se ignoraba y la caché caía a memoria. Aquí
        // construimos un Keyv sobre Redis (rediss:// si REDIS_TLS=true → Upstash).
        const tls = process.env.REDIS_TLS === 'true';
        const proto = tls ? 'rediss' : 'redis';
        const host = process.env.REDIS_HOST ?? 'localhost';
        const port = process.env.REDIS_PORT ?? '6379';
        const pass = process.env.REDIS_PASSWORD;
        const auth = pass ? `:${encodeURIComponent(pass)}@` : '';
        const url = `${proto}://${auth}${host}:${port}`;

        // Pasamos el ADAPTER KeyvRedis (no un Keyv ya construido): @nestjs/
        // cache-manager lo envuelve con SU propio Keyv, evitando el choque de
        // `instanceof` entre copias de keyv (que rompía el arranque).
        const store = new KeyvRedis(url);
        // Un error de Redis NO debe tumbar el proceso: lo logueamos y seguimos
        // (la caché degrada; el resto de la app sigue funcionando).
        const logger = new Logger('CacheModule');
        store.on('error', (err: unknown) =>
          logger.error(
            `Redis error: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );

        return {
          stores: [store],
          // TTL por defecto en MILISEGUNDOS (v7). Antes `60*5` se interpretaba
          // como 300ms; el intent documentado siempre fue 5 minutos.
          ttl: 1000 * 60 * 5,
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
    ChatModule,
    LocalitiesModule,
    OfferPostsModule,
    MercadoPagoModule,
    // "Ofi" — asistente IA. Aislado: si falla, el resto de Servi sigue.
    AiAssistantModule,
    // Funcionalidades por categoría (feature-gating) + Agenda de citas.
    ProviderFeaturesModule,
    AppointmentsModule,
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
