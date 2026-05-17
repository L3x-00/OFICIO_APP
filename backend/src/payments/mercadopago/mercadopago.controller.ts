import { Controller, Post, Body, Req, Logger, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createHmac, timingSafeEqual } from 'node:crypto';
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
  // Throttle: 5 preferencias/min por user — quien spamea agota cuota
  // de MP innecesariamente.
  @Post('create-preference')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async createPreference(@Request() req: any, @Body() dto: CreatePreferenceDto) {
    return this.mpService.createPreference({
      userId:       req.user.userId,
      plan:         dto.plan,
      providerType: dto.providerType,
    });
  }

 // Throttle del webhook: 60 req/min por IP. Webhooks legítimos de MP
 // nunca superan esto incluso en picos. Mitiga el brute-force de
 // payment IDs que un atacante intentaría para forzar lookups.
 @Post('webhook')
 @Throttle({ default: { ttl: 60_000, limit: 60 } })
async webhook(@Req() req: any) {
  // C-02: validar firma HMAC antes de procesar nada. Sin esto,
  // un atacante envía POST falsificado y activa planes "gratis".
  if (!this.verifySignature(req)) {
    this.logger.warn(`🛑 Webhook con firma inválida (ip=${req.ip})`);
    // 200 silencioso — no dar pistas al atacante sobre el motivo.
    return { status: 'ok' };
  }

  // C-01: aceptar ambos shapes — el moderno {type, data:{id}} y el
  // legacy IPN {topic, id}. El código original solo manejaba legacy
  // y todas las notificaciones modernas de MP se perdían silenciosamente.
  const body  = req.body ?? {};
  const topic = body.type ?? body.topic;
  const id    = body.data?.id ?? body.id;

  this.logger.log(`🔔 Webhook recibido: topic=${topic}, id=${id}`);

  if (topic !== 'payment' || !id) {
    // No es notificación de pago (puede ser merchant_order, etc.) — OK.
    return { status: 'ok' };
  }

  try {
    const payment = await this.mpService.getPaymentDetails(String(id));
    this.logger.log(`💳 Pago ${id}: status=${payment.status}, ref=${payment.externalReference}`);

    if (payment.status === 'approved') {
      await this.handleApprovedPayment(payment);
    } else if (payment.status === 'rejected') {
      this.logger.log(`❌ Pago ${id} rechazado: ${payment.externalReference}`);
    } else {
      this.logger.log(`⏳ Pago ${id} estado=${payment.status}: ${payment.externalReference}`);
    }
  } catch (e) {
    // A-01: loggeamos con stack pero respondemos 200. Si devolvemos
    // 500, MP reintenta 5 veces con backoff y satura el endpoint. La
    // reconciliación de pagos huérfanos se hace via panel admin.
    this.logger.error(`Error procesando webhook payment=${id}: ${e instanceof Error ? e.stack : e}`);
  }

  return { status: 'ok' };
}

/**
 * Verifica firma HMAC-SHA256 del webhook contra MERCADOPAGO_WEBHOOK_SECRET.
 *
 * MP envía:
 *   x-signature:  "ts=1742921000,v1=abc123def..."
 *   x-request-id: "<uuid>"
 *
 * Manifest a firmar:
 *   `id:${data.id};request-id:${reqId};ts:${ts};`
 *
 * Anti-replay: rechaza firmas con > 5min de antigüedad.
 */
private verifySignature(req: any): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || secret === 'ningun_sistema' || secret.length < 16) {
    this.logger.error('🛑 MERCADOPAGO_WEBHOOK_SECRET no configurado — rechazando todos los webhooks');
    return false;
  }

  const sigHeader = req.headers?.['x-signature'];
  const reqId     = req.headers?.['x-request-id'];
  const dataId    = (req.body?.data?.id ?? req.body?.id ?? '').toString();
  if (!sigHeader || !reqId || !dataId) return false;

  // Parse "ts=...,v1=..."
  const parts: Record<string, string> = {};
  for (const p of String(sigHeader).split(',')) {
    const [k, v] = p.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // Anti-replay: ±5min de tolerancia.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  // Comparación timing-safe (evita ataques de side-channel).
  try {
    return timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
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