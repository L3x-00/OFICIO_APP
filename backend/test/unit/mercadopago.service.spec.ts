/**
 * UNIT — MercadoPagoService.
 * Invariante CRÍTICO (auditoría C-03): el precio SIEMPRE sale del catálogo
 * server-side, NUNCA del body del cliente — así nadie paga PREMIUM por S/0.01.
 * createPreference valida user + perfil del tipo pedido antes de cobrar.
 * getPaymentDetails consulta la API de MP (lo usa el webhook para verificar
 * status/monto/external_reference).
 */
import { NotFoundException, BadRequestException } from '@nestjs/common';

// El SDK de MercadoPago se mockea: no se debe abrir conexión real en unit.
jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Preference: jest.fn(),
}));
import { Preference } from 'mercadopago';
import { MercadoPagoService } from '../../src/payments/mercadopago/mercadopago.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import { createConfigMock } from '../mocks/config.mock';

describe('MercadoPagoService (unit)', () => {
  let prisma: PrismaMock;
  let service: MercadoPagoService;
  let prefCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    prefCreate = jest.fn().mockResolvedValue({
      id: 'pref-1',
      init_point: 'https://mp/init',
      sandbox_init_point: 'https://mp/sandbox',
    });
    (Preference as unknown as jest.Mock).mockImplementation(() => ({
      create: prefCreate,
    }));
    const config = createConfigMock({
      MERCADOPAGO_ACCESS_TOKEN: 'test-token',
      WEB_BASE_URL: 'https://web',
      API_BASE_URL: 'https://api',
    });
    service = new MercadoPagoService(config as any, prisma as any);
  });

  describe('expectedPriceFor() / catálogo server-side', () => {
    it('precios fijos del catálogo, no del cliente', () => {
      expect(MercadoPagoService.expectedPriceFor('ESTANDAR')).toBe(19.9);
      expect(MercadoPagoService.expectedPriceFor('PREMIUM')).toBe(39.9);
    });
  });

  describe('createPreference()', () => {
    const params = {
      userId: 7,
      plan: 'ESTANDAR' as const,
      providerType: 'OFICIO' as const,
    };

    it('usuario inexistente → NotFound', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createPreference(params)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sin perfil del tipo pedido → BadRequest (no desperdiciar webhook)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 7, email: 'a@b.com' });
      prisma.provider.findUnique.mockResolvedValue(null);
      await expect(service.createPreference(params)).rejects.toThrow(
        BadRequestException,
      );
      expect(prefCreate).not.toHaveBeenCalled();
    });

    it('éxito: unit_price viene del catálogo (NO del cliente) y external_reference identifica user+tipo+plan', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 7, email: 'a@b.com' });
      prisma.provider.findUnique.mockResolvedValue({ id: 5 });

      const res = await service.createPreference(params);

      const body = prefCreate.mock.calls[0][0].body;
      // C-03: precio server-side.
      expect(body.items[0].unit_price).toBe(19.9);
      expect(body.items[0].currency_id).toBe('PEN');
      expect(body.payer.email).toBe('a@b.com');
      expect(body.external_reference).toBe('user_7_type_OFICIO_plan_ESTANDAR');
      // notification_url load-bearing: si apunta mal, MP nunca confirma el pago.
      expect(body.notification_url).toBe(
        'https://api/payments/mercadopago/webhook',
      );
      expect(body.back_urls.success).toBe('https://web/payments/success');
      expect(body.auto_return).toBe('approved');
      // En entorno NO prod usa el sandbox_init_point.
      expect(res).toEqual({
        preferenceId: 'pref-1',
        initPoint: 'https://mp/sandbox',
        sandboxInitPoint: 'https://mp/sandbox',
      });
    });

    it('B-04: en producción usa init_point real, NUNCA el sandbox', async () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        prisma.user.findUnique.mockResolvedValue({ id: 7, email: 'a@b.com' });
        prisma.provider.findUnique.mockResolvedValue({ id: 5 });
        const res = await service.createPreference(params);
        expect(res.initPoint).toBe('https://mp/init'); // prod, NO sandbox
      } finally {
        process.env.NODE_ENV = prev;
      }
    });
  });

  describe('getPaymentDetails()', () => {
    afterEach(() => {
      // @ts-expect-error limpiar el fetch global mockeado
      delete global.fetch;
    });

    it('respuesta no-ok → lanza Error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      }) as any;
      await expect(service.getPaymentDetails('123')).rejects.toThrow(/123/);
    });

    it('respuesta ok → URL correcta + header Authorization Bearer y mapea campos', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 999,
          status: 'approved',
          transaction_amount: 19.9,
          currency_id: 'PEN',
          external_reference: 'user_7_type_OFICIO_plan_ESTANDAR',
          payment_method_id: 'visa',
          date_approved: '2026-06-24T00:00:00Z',
        }),
      });
      global.fetch = fetchMock as any;

      const res = await service.getPaymentDetails('999');
      // Sin este header (o con URL mal armada) toda verificación de webhook
      // cae con 401 — un bug que un assert de solo-return-shape no atrapa.
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.mercadopago.com/v1/payments/999',
        { headers: { Authorization: 'Bearer test-token' } },
      );
      expect(res).toEqual({
        id: 999,
        status: 'approved',
        amount: 19.9,
        currency: 'PEN',
        externalReference: 'user_7_type_OFICIO_plan_ESTANDAR',
        paymentMethod: 'visa',
        dateApproved: '2026-06-24T00:00:00Z',
      });
    });
  });
});
