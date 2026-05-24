import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { PaidPlan, ProviderTypeValue } from './dto/create-preference.dto.js';

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
    const provider = await this.prisma.provider.findUnique({
      where: {
        userId_type: {
          userId: params.userId,
          type: params.providerType as any,
        },
      },
      select: { id: true },
    });
    if (!provider) {
      throw new BadRequestException(
        `No tienes un perfil ${params.providerType} para activar el plan`,
      );
    }

    const meta = MercadoPagoService.PLAN_CATALOG[params.plan];
    const preference = new Preference(this.client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: `plan-${params.plan.toLowerCase()}-${params.providerType.toLowerCase()}`,
            title: meta.description,
            description: `Suscripción al plan ${params.plan} (${params.providerType}) en Servi`,
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
        // external_reference incluye providerType (A-02) — necesario
        // para usuarios con perfil OFICIO + NEGOCIO. Sin esto, el
        // webhook elegía un perfil al azar.
        external_reference: `user_${user.id}_type_${params.providerType}_plan_${params.plan}`,
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
    };
  }

  /// Obtiene los detalles completos de un pago desde MercadoPago.
  /// Lo usa el webhook para verificar status, monto y external_reference.
  async getPaymentDetails(paymentId: string) {
    const url = `https://api.mercadopago.com/v1/payments/${paymentId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(
        `Error al consultar pago ${paymentId}: ${response.statusText}`,
      );
    }
    const data = await response.json();
    return {
      id: data.id as number,
      status: data.status as string,
      amount: data.transaction_amount as number,
      currency: data.currency_id as string,
      externalReference: data.external_reference as string,
      paymentMethod: data.payment_method_id as string,
      dateApproved: data.date_approved as string,
    };
  }
}
