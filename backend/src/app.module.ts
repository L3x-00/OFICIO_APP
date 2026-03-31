import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProvidersModule } from './providers/providers.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true, // <--- ESTO ES VITAL
    }),
    AuthModule,
    UsersModule,
    PrismaModule,
    ProvidersModule,
  ],
    
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
