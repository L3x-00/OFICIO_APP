/// Tests del `ReferralsProvider`.
///
/// El provider instancia internamente `ReferralsRepository()` que a su
/// vez usa `DioClient.instance.dio`. Para mockear sin tocar la lógica,
/// reemplazamos el `httpClientAdapter` de ese Dio singleton con un
/// `MockDioAdapter` que captura los requests y responde según stubs.
///
/// Cubre:
///   • estado inicial limpio
///   • loadStats: success + transiciones loading→idle + manejo de error
///   • loadRewards: success
///   • applyCode: success → null + failure → mensaje
///   • redeemReward / redeemPlan: success → payload + failure → null
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/referrals/presentation/providers/referrals_provider.dart';

import '../helpers/mock_dio_adapter.dart';
import '../helpers/test_setup.dart';

void main() {
  late MockDioAdapter adapter;

  setUp(() {
    adapter = installTestBackend();
  });

  group('ReferralsProvider — estado inicial', () {
    test('arranca con stats=null, listas vacías, flags=false', () {
      final p = ReferralsProvider();
      expect(p.stats, isNull);
      expect(p.rewards, isEmpty);
      expect(p.redemptions, isEmpty);
      expect(p.loadingStats, false);
      expect(p.loadingRewards, false);
      expect(p.loadingRedemptions, false);
      expect(p.busy, false);
      expect(p.error, isNull);
    });
  });

  group('loadStats', () {
    test('path feliz: rellena stats + notifyListeners + loadingStats vuelve a false', () async {
      adapter.onGet('/referrals/my-stats', body: {
        'code': 'ABCD1234',
        'coins': 50,
        'totalInvited': 3,
        'approvedInvited': 2,
        'pendingInvited': 1,
        'history': <dynamic>[],
      });

      final p = ReferralsProvider();
      int notifyCount = 0;
      p.addListener(() => notifyCount++);

      await p.loadStats();

      expect(p.stats, isNotNull);
      expect(p.stats!.code, 'ABCD1234');
      expect(p.stats!.coins, 50);
      expect(p.loadingStats, false);
      expect(p.error, isNull);
      // Mínimo 2 notifyListeners: uno al setear loading=true, otro al
      // setear loading=false con el resultado.
      expect(notifyCount, greaterThanOrEqualTo(2));
    });

    test('failure: setea error + loadingStats vuelve a false', () async {
      adapter.onGet('/referrals/my-stats', status: 500,
          body: {'message': 'boom'});

      final p = ReferralsProvider();
      await p.loadStats();

      expect(p.stats, isNull);
      expect(p.error, isNotNull);
      expect(p.loadingStats, false);
    });
  });

  group('loadRewards', () {
    test('rellena lista de rewards en path feliz', () async {
      adapter.onGet('/referrals/rewards', body: <dynamic>[
        <String, dynamic>{
          'id': 1, 'title': 'Corte', 'description': 'd',
          'coinsCost': 100, 'isActive': true,
          'provider': <String, dynamic>{
            'id': 5, 'businessName': 'Peluquería',
          },
        },
      ]);

      final p = ReferralsProvider();
      await p.loadRewards();

      expect(p.rewards, hasLength(1));
      expect(p.rewards.first.title, 'Corte');
      expect(p.loadingRewards, false);
    });

    test('failure en loadRewards NO setea error — el provider lo traga (fire-and-forget)', () async {
      adapter.onGet('/referrals/rewards', status: 500);
      final p = ReferralsProvider();
      await p.loadRewards();
      // El catch en loadRewards solo loguea — `error` queda null.
      expect(p.error, isNull);
      expect(p.loadingRewards, false);
      expect(p.rewards, isEmpty);
    });
  });

  group('applyCode', () {
    test('success → devuelve null y refresca stats', () async {
      adapter.onPost('/referrals/apply', body: {'success': true});
      adapter.onGet('/referrals/my-stats', body: {
        'code': 'X', 'coins': 5, 'totalInvited': 1,
        'approvedInvited': 0, 'pendingInvited': 1, 'history': <dynamic>[],
      });

      final p = ReferralsProvider();
      final res = await p.applyCode('CODEXYZ');

      expect(res, isNull);
      expect(p.busy, false);
      // Tras success refresca stats — coins=5 en BD mockeada.
      expect(p.stats?.coins, 5);
    });

    test('failure → devuelve mensaje de error legible', () async {
      adapter.onPost('/referrals/apply', status: 409, body: {
        'message': 'Ya aplicaste un código de referido anteriormente',
      });
      final p = ReferralsProvider();
      final res = await p.applyCode('CODEXYZ');

      expect(res, isNotNull);
      expect(p.busy, false);
    });
  });

  group('redeem', () {
    test('redeemPlan PREMIUM success → retorna payload + refresca stats', () async {
      adapter.onPost('/referrals/redeem', body: {
        'success': true, 'planActivated': 'PREMIUM', 'months': 2,
      });
      adapter.onGet('/referrals/my-stats', body: {
        'code': 'X', 'coins': 1000, 'totalInvited': 0,
        'approvedInvited': 0, 'pendingInvited': 0, 'history': <dynamic>[],
      });
      adapter.onGet('/referrals/redemptions', body: <dynamic>[]);

      final p = ReferralsProvider();
      final res = await p.redeemPlan('PREMIUM');

      expect(res, isNotNull);
      expect(res!['planActivated'], 'PREMIUM');
      expect(p.busy, false);
      expect(p.error, isNull);
      expect(p.stats?.coins, 1000);
    });

    test('redeemReward failure → devuelve null + setea error', () async {
      adapter.onPost('/referrals/redeem', status: 400, body: {
        'message': 'Necesitas 500 monedas y solo tienes 100.',
      });
      final p = ReferralsProvider();
      final res = await p.redeemReward(99);

      expect(res, isNull);
      expect(p.busy, false);
      expect(p.error, isNotNull);
    });
  });

  group('loadAll concurrencia', () {
    test('llama a los 3 loaders en paralelo y deja todo cargado', () async {
      adapter
        ..onGet('/referrals/my-stats', body: {
          'code': 'C', 'coins': 0, 'totalInvited': 0,
          'approvedInvited': 0, 'pendingInvited': 0, 'history': <dynamic>[],
        })
        ..onGet('/referrals/rewards', body: <dynamic>[])
        ..onGet('/referrals/redemptions', body: <dynamic>[]);

      final p = ReferralsProvider();
      await p.loadAll();

      expect(p.stats, isNotNull);
      expect(p.rewards, isEmpty);
      expect(p.redemptions, isEmpty);
      expect(p.loadingStats, false);
      expect(p.loadingRewards, false);
      expect(p.loadingRedemptions, false);
    });
  });
}
