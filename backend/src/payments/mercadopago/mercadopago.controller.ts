import { Controller, Post, Body, Get, Query, Req, Logger, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt.guard.js';
import { MercadoPagoService } from './mercadopago.service.js';
import { PaymentsService } from '../payments.service.js';
@Controller('payments/mercadopago')
export class MercadoPagoController {
  private readonly logger = new Logger(MercadoPagoController.name);

  constructor(
    private readonly mpService: MercadoPagoService,
    private readonly paymentsService: PaymentsService,  // ← NUEVO
    ) {}

  // userId del JWT, no del body — antes un atacante podía crear
  // preferencias con userId ajeno y enmascarar el origen de pagos.
  @Post('create-preference')
  @UseGuards(JwtAuthGuard)
  async createPreference(
    @Request() req: any,
    @Body() body: { plan: string; price: number; description: string },
  ) {
    return this.mpService.createPreference({ ...body, userId: req.user.userId });
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

  this.logger.log(`🔔 Webhook recibido: topic=${topic}, id=${id}`);

  // Solo procesar notificaciones de pago
  if (topic === 'payment' && id) {
    try {
      // 1. Obtener detalles del pago desde MercadoPago
      const payment = await this.mpService.getPaymentDetails(id);
      this.logger.log(`💳 Pago ${id}: status=${payment.status}, ref=${payment.externalReference}`);

      // 2. Si el pago fue aprobado, activar la suscripción
      if (payment.status === 'approved') {
        await this.handleApprovedPayment(payment);
      } else if (payment.status === 'rejected') {
        this.logger.log(`❌ Pago ${id} rechazado: ${payment.externalReference}`);
      } else {
        this.logger.log(`⏳ Pago ${id} pendiente: ${payment.status}`);
      }
    } catch (e) {
      this.logger.error(`Error procesando webhook: ${e}`);
    }
  }

  // Siempre responder 200 OK
  return { status: 'ok' };
}

/**
 * Activa la suscripción cuando un pago es aprobado.
 * Parsea el external_reference para obtener userId y plan.
 */
private async handleApprovedPayment(payment: {
  id: number;
  status: string;
  amount: number;
  currency: string;
  externalReference: string;
  paymentMethod: string;
  dateApproved: string;
}) {
  // El external_reference tiene el formato: "user_123_plan_ESTANDAR"
  const ref = payment.externalReference;
  this.logger.log(`✅ Pago aprobado: ${ref}`);

  // Parsear userId y plan del external_reference
  const match = ref.match(/user_(\d+)_plan_(.+)/);
  if (!match) {
    this.logger.error(`Formato de external_reference inválido: ${ref}`);
    return;
  }

  const userId = parseInt(match[1], 10);
  const plan = match[2]; // 'ESTANDAR' o 'PREMIUM'

  this.logger.log(`🎯 Activando suscripción: userId=${userId}, plan=${plan}`);

  // Activar la suscripción (conecta con tu PaymentsService)
  await this.paymentsService.activateSubscriptionFromPayment({
    userId,
    plan,
    amount: payment.amount,
    paymentMethod: 'mercadopago',
    paymentId: payment.id.toString(),
    dateApproved: payment.dateApproved,
  });
}
}