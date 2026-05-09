import { Module } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { EventsModule } from '../events/events.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';
import { ReferralsModule } from '../referrals/referrals.module.js';

// CacheModule está registrado como global en app.module — no hace falta
// volver a importarlo aquí; CACHE_MANAGER se inyecta automáticamente.

@Module({
  imports: [AuthModule, EventsModule, FirebaseModule, ReferralsModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}
