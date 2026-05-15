import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/referrals/domain/models/referral_models.dart';
import 'package:mobile/features/referrals/presentation/providers/referrals_provider.dart';
import 'package:provider/provider.dart';
import 'referral_helpers.dart';

/// TAB 3: Historial — Invitaciones enviadas y canjes realizados.
class HistoryTab extends StatelessWidget {
  const HistoryTab({super.key});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    final p = context.watch<ReferralsProvider>();

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () =>
          Future.wait([p.loadStats(), p.loadRedemptions()]),
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('INVITACIONES',
              style: TextStyle(
                color: c.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.4,
              )),
          const SizedBox(height: 8),
          if ((p.stats?.history ?? []).isEmpty)
            _emptyBox(c, 'Aún no has invitado a nadie.')
          else
            ...p.stats!.history.map((h) => HistoryReferralTile(item: h)),
          const SizedBox(height: 20),
          Text('CANJES',
              style: TextStyle(
                color: c.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.4,
              )),
          const SizedBox(height: 8),
          if (p.redemptions.isEmpty)
            _emptyBox(c, 'Todavía no has canjeado monedas.')
          else
            ...p.redemptions.map((r) => RedemptionTile(item: r)),
        ],
      ),
    );
  }

  Widget _emptyBox(AppThemeColors c, String msg) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.border),
      ),
      child: Center(
        child: Text(msg,
            style: TextStyle(color: c.textMuted, fontSize: 13)),
      ),
    );
  }
}

/// Tile individual de historial de referido (estado: aprobado, pendiente, etc).
class HistoryReferralTile extends StatelessWidget {
  final ReferralHistory item;
  const HistoryReferralTile({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    final name = item.invitedProvider?.businessName ??
        item.invitedUser?.fullName ??
        'Invitado';

    final statusInfo = _statusBadge(item.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name,
                    style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  '${formatDate(item.createdAt)} · '
                  '${item.coinsAwarded > 0 ? "+${item.coinsAwarded} monedas" : "Sin recompensa aún"}',
                  style: TextStyle(color: c.textMuted, fontSize: 11),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: statusInfo.$2.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: statusInfo.$2.withValues(alpha: 0.4)),
            ),
            child: Text(statusInfo.$1,
                style: TextStyle(
                    color: statusInfo.$2,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1)),
          ),
        ],
      ),
    );
  }

  (String, Color) _statusBadge(String status) {
    switch (status) {
      case 'APPROVED':
        return ('APROBADO', const Color(0xFF10B981));
      case 'REJECTED':
        return ('RECHAZADO', AppColors.busy);
      default:
        return ('PENDIENTE', AppColors.amberDark);
    }
  }
}

/// Tile individual de canje de monedas realizado.
class RedemptionTile extends StatelessWidget {
  final CoinRedemption item;
  const RedemptionTile({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    final title = item.plan != null
        ? 'Plan ${item.plan!.toUpperCase()}'
        : (item.reward?.title ?? 'Servicio canjeado');

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.redeem_rounded,
              color: AppColors.primary, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(formatDate(item.createdAt),
                    style: TextStyle(color: c.textMuted, fontSize: 11)),
              ],
            ),
          ),
          Text('-${item.coinsSpent}',
              style: TextStyle(
                  color: AppColors.amberDark,
                  fontSize: 14,
                  fontWeight: FontWeight.w900)),
          const SizedBox(width: 4),
          const Icon(Icons.monetization_on_rounded,
              size: 14, color: AppColors.amberDark),
        ],
      ),
    );
  }
}