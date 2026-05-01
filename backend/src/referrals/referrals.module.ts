import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service.js';
import {
  ReferralsController,
  AdminReferralsController,
} from './referrals.controller.js';
import { EventsModule } from '../events/events.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';

@Module({
  imports: [EventsModule, FirebaseModule],
  controllers: [ReferralsController, AdminReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService], // AdminService llama a onProviderApproved
})
export class ReferralsModule {}
