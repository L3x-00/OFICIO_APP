import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { LeadConversionController } from './lead-conversion.controller.js';
import { LeadConversionService } from './lead-conversion.service.js';

// MinioService viene de CommonModule (@Global); PrismaService de PrismaModule
// (@Global). El módulo solo expone la capa admin de conversión de leads.
@Module({
  imports: [PrismaModule],
  controllers: [LeadConversionController],
  providers: [LeadConversionService],
})
export class LeadConversionModule {}
