import { Controller, Post, Body, Req, Logger, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt.guard.js';
import { MercadoPagoService } from './mercadopago.service.js';
import { PaymentsService } from '../payments.service.js';
import { CreatePreferenceDto } from './dto/create-preference.dto.js';

@Controller('payments/mercadopago')
export class MercadoPagoController {
  private readonly logger = new Logger(MercadoPagoController.name);

  constructor(
    private readonly mpService: MercadoPagoService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // Crear preferencia de pago. userId del JWT (anti-IDOR); plan,
  // providerType validados por DTO; precio y descripción los pone
  // el servidor desde MercadoPagoService.PLAN_CATALOG (anti-tampering).
  @Post('create-preference')
  @UseGuards(JwtAuthGuard)
  async createPreference(@Request() req: any, @Body() dto: CreatePreferenceDto) {
    return this.mpService.createPreference({
      userId:       req.user.userId,
      plan:         dto.plan,
      providerType: dto.providerType,
    });
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
  // Formato nuevo: "user_123_type_OFICIO_plan_ESTANDAR" (A-02).
  // Formato legacy aceptado para pagos en vuelo: "user_123_plan_ESTANDAR".
  const ref = payment.externalReference;
  this.logger.log(`✅ Pago aprobado: ${ref}`);

  const VALID_PLANS = new Set(['ESTANDAR', 'PREMIUM']);
  const VALID_TYPES = new Set(['OFICIO', 'NEGOCIO']);

  let userId: number;
  let providerType: 'OFICIO' | 'NEGOCIO' | undefined;
  let plan: string;

  const newMatch    = ref.match(/^user_(\d+)_type_(OFICIO|NEGOCIO)_plan_(ESTANDAR|PREMIUM)$/);
  const legacyMatch = ref.match(/^user_(\d+)_plan_(ESTANDAR|PREMIUM)$/);

  if (newMatch) {
    userId       = parseInt(newMatch[1], 10);
    providerType = newMatch[2] as 'OFICIO' | 'NEGOCIO';
    plan         = newMatch[3];
  } else if (legacyMatch) {
    userId = parseInt(legacyMatch[1], 10);
    plan   = legacyMatch[2];
    // providerType undefined → activateSubscriptionFromPayment caerá
    // al findFirst legacy (riesgo controlado para pagos en vuelo).
  } else {
    this.logger.error(`Formato de external_reference inválido: ${ref}`);
    return;
  }

  if (!VALID_PLANS.has(plan) || (providerType && !VALID_TYPES.has(providerType))) {
    this.logger.error(`Plan o providerType inválido en ref=${ref}`);
    return;
  }

  this.logger.log(`🎯 Activando: userId=${userId}, type=${providerType ?? 'legacy'}, plan=${plan}`);

  await this.paymentsService.activateSubscriptionFromPayment({
    userId,
    plan,
    providerType,
    amount:        payment.amount,
    paymentMethod: 'mercadopago',
    paymentId:     payment.id.toString(),
    dateApproved:  payment.dateApproved,
  });
}
}