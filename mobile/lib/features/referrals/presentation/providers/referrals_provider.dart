import 'package:flutter/foundation.dart';
import '../../data/referrals_repository.dart';
import '../../domain/models/referral_models.dart';

class ReferralsProvider extends ChangeNotifier {
  final ReferralsRepository _repo = ReferralsRepository();

  ReferralStats? stats;
  List<ReferralReward> rewards = [];
  List<CoinRedemption> redemptions = [];

  bool loadingStats = false;
  bool loadingRewards = false;
  bool loadingRedemptions = false;
  bool busy = false; // para canjes y aplicar código
  String? error;

  Future<void> loadStats() async {
    loadingStats = true;
    error = null;
    notifyListeners();
    try {
      stats = await _repo.getMyStats();
    } catch (e) {
      error = 'No pudimos cargar tus estadísticas.';
      if (kDebugMode) print('[Referrals] loadStats: $e');
    } finally {
      loadingStats = false;
      notifyListeners();
    }
  }

  Future<void> loadRewards() async {
    loadingRewards = true;
    notifyListeners();
    try {
      rewards = await _repo.getActiveRewards();
    } catch (e) {
      if (kDebugMode) print('[Referrals] loadRewards: $e');
    } finally {
      loadingRewards = false;
      notifyListeners();
    }
  }

  Future<void> loadRedemptions() async {
    loadingRedemptions = true;
    notifyListeners();
    try {
      redemptions = await _repo.getMyRedemptions();
    } catch (e) {
      if (kDebugMode) print('[Referrals] loadRedemptions: $e');
    } finally {
      loadingRedemptions = false;
      notifyListeners();
    }
  }

  Future<void> loadAll() async {
    await Future.wait([loadStats(), loadRewards(), loadRedemptions()]);
  }

  /// Aplica un código de referido. Devuelve null si OK, mensaje de error si falla.
  Future<String?> applyCode(String code) async {
    busy = true;
    notifyListeners();
    try {
      await _repo.applyCode(code);
      await loadStats();
      return null;
    } catch (e) {
      return _extractMessage(e) ?? 'No pudimos aplicar el código.';
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  /// Canjea por recompensa. Retorna el payload del backend o null si falla.
  Future<Map<String, dynamic>?> redeemReward(int rewardId) =>
      _redeem(rewardId: rewardId);

  /// Canjea por plan ESTANDAR/PREMIUM.
  Future<Map<String, dynamic>?> redeemPlan(String plan) => _redeem(plan: plan);

  Future<Map<String, dynamic>?> _redeem({int? rewardId, String? plan}) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      final result = await _repo.redeem(rewardId: rewardId, plan: plan);
      // Refresca todo: monedas, historial.
      await Future.wait([loadStats(), loadRedemptions()]);
      return result;
    } catch (e) {
      error = _extractMessage(e) ?? 'No pudimos completar el canje.';
      return null;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  String? _extractMessage(Object e) {
    final s = e.toString();
    // Dio errors suelen venir como "DioException [...] message: ..."
    final m = RegExp(r'message\s*:\s*([^,}\n]+)').firstMatch(s);
    if (m != null) return m.group(1)?.trim();
    return null;
  }
}
