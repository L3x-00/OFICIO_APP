import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/referrals/domain/models/referral_models.dart';
import 'package:mobile/features/referrals/presentation/providers/referrals_provider.dart';
import 'package:provider/provider.dart';
import 'referral_dialogs.dart';

/// TAB 2: Ganar monedas — Explicación, canje de planes y recompensas.
class EarnCoinsTab extends StatelessWidget {
  const EarnCoinsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    final p = context.watch<ReferralsProvider>();

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => Future.wait([p.loadRewards(), p.loadStats()]),
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const ExplainerCard(),
          const SizedBox(height: 20),
          PlanRedemptionTile(
            plan: 'ESTANDAR',
            label: 'Plan Estándar',
            duration: '1 mes',
            cost: 1000,
            color: AppColors.primary,
          ),
          const SizedBox(height: 12),
          PlanRedemptionTile(
            plan: 'PREMIUM',
            label: 'Plan Premium',
            duration: '2 meses',
            cost: 2000,
            color: AppColors.amberDark,
          ),
          const SizedBox(height: 24),
          Text('SERVICIOS DE PROFESIONALES',
              style: TextStyle(
                color: c.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.4,
              )),
          const SizedBox(height: 10),
          if (p.loadingRewards && p.rewards.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary)),
            )
          else if (p.rewards.isEmpty)
            const EmptyRewards()
          else
            ...p.rewards.map((r) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: RewardCard(reward: r),
                )),
        ],
      ),
    );
  }
}

/// Tarjeta que explica cómo funciona el sistema de referidos.
class ExplainerCard extends StatelessWidget {
  const ExplainerCard({super.key});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: 0.18),
            AppColors.primary.withValues(alpha: 0.04),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.workspace_premium_rounded,
                  color: AppColors.primary, size: 22),
              SizedBox(width: 8),
              Text('¿Cómo funciona?',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  )),
            ],
          ),
          const SizedBox(height: 10),
          _explainLine(c, '🟢 Invita a un profesional o negocio',
              '25 monedas al ser aprobado.'),
          _explainLine(c, '🎁 Tu invitado',
              'recibe 5 monedas de bienvenida.'),
          _explainLine(c, '💼 Canjea por un plan',
              '1000 = Estándar 1 mes · 2000 = Premium 2 meses.'),
        ],
      ),
    );
  }

  Widget _explainLine(AppThemeColors c, String emoji, String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 22,
              child: Text(emoji.split(' ').first,
                  style: const TextStyle(fontSize: 14))),
          const SizedBox(width: 6),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4),
                children: [
                  TextSpan(
                      text: '${emoji.split(' ').sublist(1).join(' ')}: ',
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  TextSpan(text: text),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Tile para canjear un plan específico (Estándar / Premium).
class PlanRedemptionTile extends StatelessWidget {
  final String plan;
  final String label;
  final String duration;
  final int cost;
  final Color color;
  const PlanRedemptionTile({
    super.key,
    required this.plan,
    required this.label,
    required this.duration,
    required this.cost,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    final p = context.watch<ReferralsProvider>();
    final coins = p.stats?.coins ?? 0;
    final canRedeem = coins >= cost && !p.busy;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.workspace_premium_rounded, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    )),
                const SizedBox(height: 2),
                Text('Activación inmediata · $duration',
                    style: TextStyle(color: c.textMuted, fontSize: 11)),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: canRedeem
                ? () => _confirmRedeemPlan(context, plan, label, cost)
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: color,
              disabledBackgroundColor: c.bgInput,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.monetization_on_rounded, size: 16),
                const SizedBox(width: 4),
                Text('$cost',
                    style: const TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmRedeemPlan(BuildContext context, String plan,
      String label, int cost) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar canje'),
        content: Text('¿Canjear $label por $cost monedas? '
            'Una vez activado no se puede deshacer.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sí, canjear'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    if (!context.mounted) return;

    final provider = context.read<ReferralsProvider>();
    final result = await provider.redeemPlan(plan);
    if (!context.mounted) return;
    if (result != null) {
      showSuccessDialog(
          context, '¡Plan $label activado!', 'Disfruta de tus beneficios.');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(provider.error ?? 'No pudimos canjear'),
            backgroundColor: AppColors.busy),
      );
    }
  }
}

/// Tarjeta visual de recompensa de servicio de profesional.
class RewardCard extends StatelessWidget {
  final ReferralReward reward;
  const RewardCard({super.key, required this.reward});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    final p = context.watch<ReferralsProvider>();
    final coins = p.stats?.coins ?? 0;
    final canRedeem = coins >= reward.coinsCost && !p.busy;

    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (reward.provider.coverUrl != null)
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
              child: AspectRatio(
                aspectRatio: 16 / 8,
                child: Image.network(
                  reward.provider.coverUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(color: c.bgInput),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(reward.title,
                          style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 15,
                              fontWeight: FontWeight.w800)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.amber.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.monetization_on_rounded,
                              size: 14, color: AppColors.amberDark),
                          const SizedBox(width: 3),
                          Text('${reward.coinsCost}',
                              style: const TextStyle(
                                  color: AppColors.amberDark,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(reward.provider.businessName,
                    style: TextStyle(color: c.textMuted, fontSize: 12)),
                const SizedBox(height: 8),
                Text(reward.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        color: c.textSecondary, fontSize: 13, height: 1.35)),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: canRedeem
                        ? () => _confirmRedeemReward(context, reward)
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      disabledBackgroundColor: c.bgInput,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    child: Text(
                      coins >= reward.coinsCost
                          ? 'Canjear'
                          : 'Necesitas ${reward.coinsCost - coins} monedas más',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmRedeemReward(
      BuildContext context, ReferralReward reward) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar canje'),
        content: Text(
          '¿Canjear "${reward.title}" por ${reward.coinsCost} monedas? '
          'Recibirás los datos del proveedor para coordinar el servicio.',
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Sí, canjear')),
        ],
      ),
    );
    if (ok != true) return;
    if (!context.mounted) return;

    final provider = context.read<ReferralsProvider>();
    final result = await provider.redeemReward(reward.id);
    if (!context.mounted) return;
    if (result != null) {
      final providerData = (result['reward'] as Map<String, dynamic>?)?['provider']
          as Map<String, dynamic>?;
      showRedeemedRewardDialog(
        context,
        title: reward.title,
        providerName: providerData?['businessName'] as String? ??
            reward.provider.businessName,
        phone: providerData?['phone'] as String? ?? reward.provider.phone,
        whatsapp:
            providerData?['whatsapp'] as String? ?? reward.provider.whatsapp,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(provider.error ?? 'No pudimos canjear'),
            backgroundColor: AppColors.busy),
      );
    }
  }
}

/// Widget vacío cuando no hay recompensas de servicios aún.
class EmptyRewards extends StatelessWidget {
  const EmptyRewards({super.key});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border),
      ),
      child: Column(
        children: [
          Icon(Icons.card_giftcard_rounded, size: 36, color: c.textMuted),
          const SizedBox(height: 8),
          Text('Aún no hay servicios canjeables',
              style: TextStyle(
                  color: c.textPrimary, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('Vuelve pronto: el admin publicará nuevas recompensas.',
              textAlign: TextAlign.center,
              style: TextStyle(color: c.textMuted, fontSize: 12)),
        ],
      ),
    );
  }
}