import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { PaidPlan, ProviderTypeValue } from './dto/create-preference.dto.js';

export type MercadoPagoPaymentDetails = {
  id: number;
  status: string;
  statusDetail: string | null;
  amount: number;
  currency: string;
  externalReference: string;
  paymentMethod: string | null;
  dateApproved: string | null;
};

export type MercadoPagoPaymentReference = {
  providerId: number;
  userId: number;
  plan: PaidPlan;
  attemptId: string | null;
};

const PAYMENT_REFERENCE =
  /^provider_(\d+)_user_(\d+)_plan_(ESTANDAR|PREMIUM)(?:_attempt_([a-f0-9]{32}))?$/;

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;
  private readonly client: MercadoPagoConfig;
  private readonly webBaseUrl: string;
  private readonly apiBaseUrl: string;

  // Catálogo server-side de planes. El cliente NUNCA envía el precio
  // — solo elige el plan. Antes el price venía del body, lo que
  // permitía pagar PREMIUM por S/ 0.01 (C-03 de la auditoría).
  static readonly PLAN_CATALOG: Record<
    PaidPlan,
    { price: number; description: string }
  > = {
    ESTANDAR: { price: 19.9, description: 'Plan Estándar mensual - Servi' },
    PREMIUM: { price: 39.9, description: 'Plan Premium mensual - Servi' },
  };

  /// Devuelve el precio esperado para un plan dado. Lo usa el webhook
  /// para validar que el monto cobrado coincide con el catálogo y
  /// rechazar pagos manipulados.
  static expectedPriceFor(plan: PaidPlan): number {
    return MercadoPagoService.PLAN_CATALOG[plan].price;
  }

  /**
   * La referencia identifica el perfil, dueño y un intento concreto. El
   * intento evita que el cliente confunda un rechazo anterior con el checkout
   * que acaba de abrir.
   */
  static parsePaymentReference(
    reference: string,
  ): MercadoPagoPaymentReference | null {
    const match = PAYMENT_REFERENCE.exec(reference);
    if (!match) return null;

    return {
      providerId: Number(match[1]),
      userId: Number(match[2]),
      plan: match[3] as PaidPlan,
      attemptId: match[4] ?? null,
    };
  }

  /** Mensaje seguro para el proveedor; el detalle técnico queda solo en logs. */
  static rejectionMessage(statusDetail: string | null): string {
    switch (statusDetail) {
      case 'cc_rejected_insufficient_amount':
        return 'Tu medio de pago no tiene fondos suficientes. Prueba otro medio de pago.';
      case 'cc_rejected_bad_filled_card_number':
      case 'cc_rejected_bad_filled_date':
      case 'cc_rejected_bad_filled_security_code':
        return 'Revisa los datos del medio de pago e intenta nuevamente.';
      case 'cc_rejected_card_disabled':
      case 'cc_rejected_call_for_authorize':
        return 'Autoriza la compra con tu banco o usa otro medio de pago.';
      default:
        return 'Mercado Pago no pudo aprobar este intento. Prueba otro medio de pago o inténtalo más tarde.';
    }
  }

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    )!;
    this.client = new MercadoPagoConfig({ accessToken: this.accessToken });
    this.webBaseUrl =
      this.configService.get<string>('WEB_BASE_URL') ??
      'https://www.oficioapp.org.pe';
    this.apiBaseUrl =
      this.configService.get<string>('API_BASE_URL') ?? 'http://localhost:3000';
  }

  async createPreference(params: {
    userId: number;
    plan: PaidPlan;
    providerType: ProviderTypeValue;
  }) {
    // 1. Cargar el user para usar su email real (MP requiere email
    //    legítimo para antifraude — emails falsos como user_X@servi.com
    //    suben la tasa de rechazo y violan TOS de MP). El SDK de
    //    Preferences solo expone `email` en Payer; firstName/lastName
    //    se aceptan via la API pero no están en el tipo TS — se
    //    propagan igual desde el email registrado del user en MP.
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // 2. Validar que el user tiene el perfil del providerType pedido.
    //    Evita pagar para un perfil inexistente y desperdiciar webhook.
    let provider = await this.prisma.provider.findUnique({
      where: {
        userId_type: {
          userId: params.userId,
          type: params.providerType as any,
        },
      },
      select: { id: true },
    });
    // El cliente puede pedir OFICIO con el estado local desactualizado justo
    // después de aprobarse una migración a PROFESIONAL (mismo Provider.id,
    // mismo XOR). Reintentar con el tipo real antes de rechazar.
    let resolvedType: ProviderTypeValue = params.providerType;
    if (!provider && params.providerType === 'OFICIO') {
      provider = await this.prisma.provider.findUnique({
        where: {
          userId_type: { userId: params.userId, type: 'PROFESIONAL' as any },
        },
        select: { id: true },
      });
      if (provider) resolvedType = 'PROFESIONAL' as ProviderTypeValue;
    }
    if (!provider) {
      throw new BadRequestException(
        `No tienes un perfil ${params.providerType} para activar el plan`,
      );
    }

    const meta = MercadoPagoService.PLAN_CATALOG[params.plan];
    const preference = new Preference(this.client);

    const attemptId = randomUUID().replaceAll('-', '');
    const externalReference = `provider_${provider.id}_user_${user.id}_plan_${params.plan}_attempt_${attemptId}`;
    const result = await preference.create({
      body: {
        items: [
          {
            id: `plan-${params.plan.toLowerCase()}-${resolvedType.toLowerCase()}`,
            title: meta.description,
            description: `Suscripción al plan ${params.plan} (${resolvedType}) en Servi`,
            quantity: 1,
            currency_id: 'PEN',
            unit_price: meta.price,
          },
        ],
        payer: { email: user.email },
        back_urls: {
          success: `${this.webBaseUrl}/payments/success`,
          failure: `${this.webBaseUrl}/payments/failure`,
          pending: `${this.webBaseUrl}/payments/pending`,
        },
        notification_url: `${this.apiBaseUrl}/payments/mercadopago/webhook`,
        auto_return: 'approved',
        // La referencia incluye Provider.id estable y un nonce por Checkout.
        // El tipo puede cambiar de OFICIO a PROFESIONAL sin romper el vínculo,
        // y el nonce separa este intento de cualquier pago anterior.
        external_reference: externalReference,
      },
    });

    // B-04: en producción jamás usar sandbox_init_point — sería un
    // error caro si el token es prod pero el redirect manda al sandbox.
    const isProd = process.env.NODE_ENV === 'production';
    const initPoint = isProd
      ? result.init_point
      : (result.sandbox_init_point ?? result.init_point);

    return {
      preferenceId: result.id,
      initPoint,
      sandboxInitPoint: result.sandbox_init_point,
      externalReference,
    };
  }

  /// Obtiene los detalles completos de un pago desde MercadoPago.
  /// Lo usa el webhook para verificar status, monto y external_reference.
  async getPaymentDetails(
    paymentId: string,
  ): Promise<MercadoPagoPaymentDetails> {
    const url = `https://api.mercadopago.com/v1/payments/${paymentId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(
        `Error al consultar pago ${paymentId}: ${response.statusText}`,
      );
    }
    return this.toPaymentDetails(await response.json());
  }

  /**
   * Consulta acotada al intento que el mismo usuario acaba de abrir. Nunca
   * expone credenciales ni datos de tarjeta al móvil.
   */
  async getPaymentStatusForUser(params: {
    userId: number;
    externalReference: string;
  }) {
    const parsed = MercadoPagoService.parsePaymentReference(
      params.externalReference,
    );
    if (!parsed?.attemptId || parsed.userId !== params.userId) {
      throw new BadRequestException('Intento de pago inválido');
    }

    const provider = await this.prisma.provider.findUnique({
      where: { id: parsed.providerId },
      select: { userId: true },
    });
    if (!provider || provider.userId !== params.userId) {
      throw new NotFoundException('Perfil de proveedor no encontrado');
    }

    const payment = await this.findLatestPaymentByReference(
      params.externalReference,
    );
    if (!payment) {
      return { status: 'not_found' as const, message: null };
    }

    return {
      status: payment.status,
      message:
        payment.status === 'rejected'
          ? MercadoPagoService.rejectionMessage(payment.statusDetail)
          : null,
    };
  }

  private async findLatestPaymentByReference(
    externalReference: string,
  ): Promise<MercadoPagoPaymentDetails | null> {
    const query = new URLSearchParams({
      external_reference: externalReference,
      sort: 'date_created',
      criteria: 'desc',
      limit: '1',
    });
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/search?${query.toString()}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } },
    );
    if (!response.ok) {
      throw new Error(
        `Error al buscar pago por referencia: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { results?: unknown[] };
    const first = data.results?.[0];
    return first
      ? this.toPaymentDetails(first as Record<string, unknown>)
      : null;
  }

  private toPaymentDetails(
    data: Record<string, unknown>,
  ): MercadoPagoPaymentDetails {
    return {
      id: data.id as number,
      status: data.status as string,
      statusDetail:
        typeof data.status_detail === 'string' ? data.status_detail : null,
      amount: data.transaction_amount as number,
      currency: data.currency_id as string,
      externalReference:
        typeof data.external_reference === 'string'
          ? data.external_reference
          : '',
      paymentMethod:
        typeof data.payment_method_id === 'string'
          ? data.payment_method_id
          : null,
      dateApproved:
        typeof data.date_approved === 'string' ? data.date_approved : null,
    };
  }
}
