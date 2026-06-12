import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AdminService } from './admin.service.js';
import { AdminCategoriesService } from './services/admin-categories.service.js';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { AdminTrustService } from './services/admin-trust.service.js';
import { AdminPaymentsService } from './services/admin-payments.service.js';
import { AdminReportsService } from './services/admin-reports.service.js';
import { AdminController } from './admin.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { EventsModule } from '../events/events.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';
import { ReferralsModule } from '../referrals/referrals.module.js';
import { LocalitiesModule } from '../localities/localities.module.js';
import { UserReportsModule } from '../user-reports/user-reports.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [
    CacheModule.register(),
    AuthModule,
    EventsModule,
    FirebaseModule,
    ReferralsModule,
    LocalitiesModule,
    UserReportsModule,
    EmailModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminCategoriesService,
    AdminDashboardService,
    AdminTrustService,
    AdminPaymentsService,
    AdminReportsService,
    RolesGuard,
  ],
})
export class AdminModule {}
