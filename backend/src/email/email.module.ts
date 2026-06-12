import { Module } from '@nestjs/common';
import { EmailService } from './email.service.js';
import { EmailRetentionService } from './email-retention.service.js';

@Module({
  providers: [EmailService, EmailRetentionService],
  exports: [EmailService],
})
export class EmailModule {}
