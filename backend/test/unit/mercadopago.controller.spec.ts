import { MercadoPagoController } from '../../src/payments/mercadopago/mercadopago.controller.js';

describe('MercadoPagoController (unit)', () => {
  let mpService: {
    getPaymentDetails: jest.Mock;
    getPaymentStatusForUser: jest.Mock;
  };
  let paymentsService: { notifyMercadoPagoRejected: jest.Mock };
  let controller: MercadoPagoController;

  beforeEach(() => {
    mpService = {
      getPaymentDetails: jest.fn(),
      getPaymentStatusForUser: jest.fn(),
    };
    paymentsService = { notifyMercadoPagoRejected: jest.fn() };
    controller = new MercadoPagoController(
      mpService as any,
      paymentsService as any,
    );
  });

  it('devuelve estado solo para el userId del JWT', async () => {
    mpService.getPaymentStatusForUser.mockResolvedValue({ status: 'pending' });

    await expect(
      controller.getCheckoutStatus(
        { user: { userId: 75 } } as any,
        'provider_76_user_75_plan_ESTANDAR_attempt_0123456789abcdef0123456789abcdef',
      ),
    ).resolves.toEqual({ status: 'pending' });
    expect(mpService.getPaymentStatusForUser).toHaveBeenCalledWith({
      userId: 75,
      externalReference:
        'provider_76_user_75_plan_ESTANDAR_attempt_0123456789abcdef0123456789abcdef',
    });
  });

  it('un webhook firmado rechazado avisa al proveedor sin activar plan', async () => {
    (controller as any).verifySignature = jest.fn().mockReturnValue(true);
    mpService.getPaymentDetails.mockResolvedValue({
      id: 173483733036,
      status: 'rejected',
      statusDetail: 'cc_rejected_insufficient_amount',
      externalReference:
        'provider_76_user_75_plan_ESTANDAR_attempt_0123456789abcdef0123456789abcdef',
      paymentMethod: 'visa',
    });

    await controller.webhook({
      body: { type: 'payment', data: { id: '173483733036' } },
      ip: '127.0.0.1',
    } as any);

    expect(paymentsService.notifyMercadoPagoRejected).toHaveBeenCalledWith({
      paymentId: '173483733036',
      providerId: 76,
      userId: 75,
      plan: 'ESTANDAR',
      statusDetail: 'cc_rejected_insufficient_amount',
      paymentMethod: 'visa',
    });
  });
});
