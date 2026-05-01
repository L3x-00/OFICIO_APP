import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../domain/models/referral_models.dart';

class ReferralsRepository {
  final Dio _dio = DioClient.instance.dio;

  /// Devuelve el código del usuario; el backend lo crea bajo demanda.
  Future<String> getMyCode() async {
    final res = await _dio.get('/referrals/my-code');
    final data = res.data as Map<String, dynamic>;
    return data['code'] as String? ?? '';
  }

  /// Estadísticas del usuario actual: monedas, totales, historial.
  Future<ReferralStats> getMyStats() async {
    final res = await _dio.get('/referrals/my-stats');
    return ReferralStats.fromJson(res.data as Map<String, dynamic>);
  }

  /// Aplica un código de referido al registrarse. Lanza si el código no
  /// existe, es el propio o ya se aplicó uno antes.
  Future<bool> applyCode(String code) async {
    final res = await _dio.post(
      '/referrals/apply',
      data: {'code': code.trim().toUpperCase()},
    );
    final data = res.data as Map<String, dynamic>?;
    return data?['success'] == true;
  }

  /// Lista de recompensas activas (servicios canjeables).
  Future<List<ReferralReward>> getActiveRewards() async {
    final res = await _dio.get('/referrals/rewards');
    final list = res.data as List<dynamic>? ?? [];
    return list
        .map((e) => ReferralReward.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Canjea monedas por una recompensa o un plan.
  Future<Map<String, dynamic>> redeem({int? rewardId, String? plan}) async {
    final res = await _dio.post(
      '/referrals/redeem',
      data: {
        'rewardId': ?rewardId,
        'plan': ?plan,
      },
    );
    return (res.data as Map<String, dynamic>?) ?? {};
  }

  /// Historial de canjes del usuario.
  Future<List<CoinRedemption>> getMyRedemptions() async {
    final res = await _dio.get('/referrals/redemptions');
    final list = res.data as List<dynamic>? ?? [];
    return list
        .map((e) => CoinRedemption.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
