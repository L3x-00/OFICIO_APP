import { Controller, Post, Body, Get, Query, Req, Logger } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service.js';

@Controller('payments/mercadopago')
export class MercadoPagoController {
  private readonly logger = new Logger(MercadoPagoController.name);

  constructor(private readonly mpService: MercadoPagoService) {}

  @Post('create-preference')
  async createPreference(@Body() body: {
    userId: number;
    plan: string;
    price: number;
    description: string;
  }) {
    return this.mpService.createPreference(body);
  }

  @Get('success')
  success(@Query('external_reference') ref: string) {
    return { status: 'ok', message: 'Pago procesado. Redirigiendo...', ref };
  }

  @Get('failure')
  failure() {
    return { status: 'error', message: 'El pago fue rechazado o cancelado.' };
  }

  @Get('pending')
  pending() {
    return { status: 'pending', message: 'Pago pendiente de confirmación.' };
  }

 @Post('webhook')
    async webhook(@Req() req: { body: any; headers: any }) {
    const body = req.body;
    const topic = body?.topic;
    const id = body?.id;

    this.logger.log(`Webhook recibido: topic=${topic}, id=${id}`);

    // Solo procesamos notificaciones de pago
    if (topic === 'payment' && id) {
        try {
        const payment = await this.mpService.getPayment(id);
        this.logger.log(`Estado del pago ${id}: ${payment.status}`);

        if (payment.status === 'approved') {
            // Extraer userId y plan del external_reference
            const ref = payment.external_reference; // ej: "user_1_plan_ESTANDAR"
            this.logger.log(`Pago aprobado: ${ref}`);

            // TODO: Activar suscripción del usuario
            // await this.subscriptionService.activateFromPayment(ref);
        }
        } catch (e) {
        this.logger.error(`Error procesando webhook: ${e}`);
        }
    }

    // Siempre responder 200 OK a Mercado Pago
    return { status: 'ok' };
    }
}