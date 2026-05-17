import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;

  constructor(private configService: ConfigService) {
    this.accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN')!;
  }

  async createPreference(params: {
  userId: number;
  plan: string;
  price: number;
  description: string;
}) {
  const client = new MercadoPagoConfig({
    accessToken: this.accessToken,
  });

  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: [
        {
          id: `plan-${params.plan.toLowerCase()}`,
          title: params.description,
          description: `Suscripción al plan ${params.plan} en Servi`,
          quantity: 1,
          currency_id: 'PEN',
          unit_price: params.price,
        },
      ],
      payer: {
         email: `user_${params.userId}@servi.com`,
      },
      back_urls: {
        success: 'https://www.oficioapp.org.pe/payments/success',
        failure: 'https://www.oficioapp.org.pe/payments/failure',
        pending: 'https://www.oficioapp.org.pe/payments/pending',
      },
      notification_url: `${process.env.API_BASE_URL}/payments/mercadopago/webhook`,
      auto_return: 'approved',
      external_reference: `user_${params.userId}_plan_${params.plan}`,
    },
  });

  return {
    preferenceId: result.id,
    initPoint: result.sandbox_init_point ?? result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
    };
 }
/**
 * Consulta el estado de un pago por su ID.
 * Se usa desde el webhook para verificar si el pago fue aprobado.
 */
async getPayment(paymentId: string) {
  const client = new MercadoPagoConfig({
    accessToken: this.accessToken,
  });

  const url = `https://api.mercadopago.com/v1/payments/${paymentId}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${this.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error al consultar pago: ${response.statusText}`);
  }

  return response.json();
}
}