import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service.js';
import { MercadoPagoController } from './mercadopago.controller.js';
import { PaymentsModule } from '../payments.module.js';
import { PrismaModule } from '../../../prisma/prisma.module.js';

@Module({
  imports: [PaymentsModule, PrismaModule],
  controllers: [MercadoPagoController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
