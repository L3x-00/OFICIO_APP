import { Module } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { EventsModule } from '../events/events.module.js';
import { CacheModule } from '@nestjs/cache-manager';
import { FirebaseModule } from '../firebase/firebase.module.js';
import { ReferralsModule } from '../referrals/referrals.module.js';

@Module({
  imports: [AuthModule, EventsModule, CacheModule.register(), FirebaseModule, ReferralsModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}
