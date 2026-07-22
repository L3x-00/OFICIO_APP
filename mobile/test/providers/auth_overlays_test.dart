/// Regresión de:
///   • P5 — `planFor(type)` lee el plan REAL del provider-status (bloqueo
///     premium inmediato al reabrir la app).
///   • P6 — overlay "Solicitud rechazada" (pendingPlanRejection).
///   • gap5 — carrusel de beneficios (pendingPlanPromotion) encolable desde
///     background/cold-start.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/network/socket_service.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;

  setUp(() {
    adapter = installTestBackend();
  });

  tearDown(() => SocketService.instance.disconnect());

  group('planFor (P5)', () {
    test('devuelve el plan real del backend tras sincronizar', () async {
      adapter.onGet(
        '/users/my-provider-status',
        body: {
          'hasProvider': true,
          'profiles': [
            {
              'providerId': 1,
              'type': 'OFICIO',
              'verificationStatus': 'APROBADO',
              'businessName': 'X',
              'plan': 'PREMIUM',
            },
          ],
        },
      );

      final auth = AuthProvider();
      await auth.refreshProviderStatus();

      expect(auth.planFor('OFICIO'), 'PREMIUM');
      // Sin perfil de ese tipo → GRATIS (bloquea premium por defecto).
      expect(auth.planFor('NEGOCIO'), 'GRATIS');
    });

    test('sin plan en la respuesta cae a GRATIS', () async {
      adapter.onGet(
        '/users/my-provider-status',
        body: {
          'hasProvider': true,
          'profiles': [
            {
              'providerId': 1,
              'type': 'OFICIO',
              'verificationStatus': 'PENDIENTE',
              'businessName': 'X',
            },
          ],
        },
      );
      final auth = AuthProvider();
      await auth.refreshProviderStatus();
      expect(auth.planFor('OFICIO'), 'GRATIS');
    });
  });

  group('overlays de estado (P6 / gap5)', () {
    test('aprobación usa providerId real del contrato backend', () async {
      adapter.onGet(
        '/users/my-provider-status',
        body: {
          'hasProvider': true,
          'profiles': [
            {
              'providerId': 41,
              'type': 'OFICIO',
              'verificationStatus': 'APROBADO',
              'businessName': 'Servicio Norte',
              'plan': 'ESTANDAR',
              'pendingNotifications': <dynamic>[],
            },
          ],
        },
      );
      final auth = AuthProvider();

      await auth.refreshProviderStatus();

      expect(auth.pendingProviderApproval?.providerId, 41);
      expect(auth.pendingProviderApproval?.displayName, 'Servicio Norte');
    });

    test(
      'rechazo sincronizado encola motivo e id para overlay global',
      () async {
        adapter.onGet(
          '/users/my-provider-status',
          body: {
            'hasProvider': true,
            'profiles': [
              {
                'providerId': 42,
                'type': 'NEGOCIO',
                'verificationStatus': 'RECHAZADO',
                'businessName': 'Tienda Sur',
                'pendingNotifications': [
                  {
                    'id': 901,
                    'type': 'RECHAZADO',
                    'message':
                        'Tu solicitud fue rechazada. Motivo: Foto ilegible',
                  },
                ],
              },
            ],
          },
        );
        final auth = AuthProvider();

        await auth.refreshProviderStatus();

        final rejection = auth.pendingTrustRejection;
        expect(rejection?.reason, 'Foto ilegible');
        expect(rejection?.profileType, 'NEGOCIO');
        expect(rejection?.notificationId, 901);
        expect(rejection?.isProviderRegistration, true);
      },
    );

    test('pendingPlanRejection: set y clear', () {
      final auth = AuthProvider();
      expect(auth.pendingPlanRejection, isNull);
      auth.setPendingPlanRejection(
        const PlanRejectionPayload(reason: 'voucher no verificado'),
      );
      expect(auth.pendingPlanRejection?.reason, 'voucher no verificado');
      auth.clearPlanRejection();
      expect(auth.pendingPlanRejection, isNull);
    });

    test('pendingPlanPromotion: set y clear (carrusel beneficios)', () {
      final auth = AuthProvider();
      auth.setPendingPlanPromotion(
        const PlanActivationPayload(plan: 'PREMIUM', title: '¡Plan activado!'),
      );
      expect(auth.pendingPlanPromotion?.plan, 'PREMIUM');
      auth.clearPlanPromotion();
      expect(auth.pendingPlanPromotion, isNull);
    });
  });
}
