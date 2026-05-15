import { Module } from '@nestjs/common';
import { OfferPostsService } from './offer-posts.service.js';
import {
  OffersPublicController,
  ProviderOffersController,
  AdminOffersController,
  AdminOfferReportsController,
} from './offer-posts.controller.js';
import { CommonModule } from '../common/common.module.js';

@Module({
  imports: [CommonModule],
  controllers: [
    OffersPublicController,
    ProviderOffersController,
    AdminOffersController,
    AdminOfferReportsController,
  ],
  providers: [OfferPostsService],
  exports: [OfferPostsService],
})
export class OfferPostsModule {}
