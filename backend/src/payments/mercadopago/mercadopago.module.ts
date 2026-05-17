import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service.js';
import { MercadoPagoController } from './mercadopago.controller.js';

@Module({
  controllers: [MercadoPagoController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}