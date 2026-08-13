import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/dio_client.dart';
import 'package:mobile/features/payments/data/payments_repository.dart';

import '../helpers/mock_dio_adapter.dart';

void main() {
  late MockDioAdapter adapter;
  late PaymentsRepository repository;

  setUp(() {
    adapter = MockDioAdapter();
    DioClient.instance.dio.httpClientAdapter = adapter;
    repository = PaymentsRepository();
  });

  test('crea checkout con referencia única del intento actual', () async {
    adapter.onPost(
      '/payments/mercadopago/create-preference',
      body: {
        'initPoint': 'https://mp.example/checkout',
        'externalReference':
            'provider_76_user_75_plan_ESTANDAR_attempt_0123456789abcdef0123456789abcdef',
      },
    );

    final checkout = await repository.createMercadoPagoPreference(
      plan: 'ESTANDAR',
      providerType: 'OFICIO',
    );

    expect(checkout.initPoint, 'https://mp.example/checkout');
    expect(checkout.externalReference, contains('attempt_'));
  });

  test(
    'consulta únicamente el estado del intento retornado por backend',
    () async {
      const reference =
          'provider_76_user_75_plan_ESTANDAR_attempt_0123456789abcdef0123456789abcdef';
      adapter.onGet(
        '/payments/mercadopago/status',
        body: {
          'status': 'rejected',
          'message': 'Revisa los datos del medio de pago e intenta nuevamente.',
        },
      );

      final status = await repository.getMercadoPagoCheckoutStatus(reference);

      expect(status.isRejected, isTrue);
      expect(status.message, contains('Revisa los datos'));
      expect(adapter.captured.single.queryParameters, {'reference': reference});
    },
  );
}
