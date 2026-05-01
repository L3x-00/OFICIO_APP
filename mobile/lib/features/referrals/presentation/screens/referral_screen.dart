import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../domain/models/referral_models.dart';
import '../providers/referrals_provider.dart';

const _kAppDownloadUrl = 'https://oficio-backend.onrender.com/download';

class ReferralScreen extends StatelessWidget {
  const ReferralScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ReferralsProvider()..loadAll(),
      child: const _ReferralScreenContent(),
    );
  }
}

class _ReferralScreenContent extends StatelessWidget {
  const _ReferralScreenContent();

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: c.bg,
        appBar: AppBar(
          backgroundColor: c.bg,
          elevation: 0,
          title: Text(
            'Promociones',
            style: TextStyle(
              color: c.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 18,
            ),
          ),
          iconTheme: IconThemeData(color: c.textPrimary),
          bottom: TabBar(
            indicatorColor: AppColors.primary,
            indicatorWeight: 3,
            labelColor: AppColors.primary,
            unselectedLabelColor: c.textMuted,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            tabs: const [
              Tab(text: 'Mi código'),
              Tab(text: 'Ganar monedas'),
              Tab(text: 'Historial'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _MyCodeTab(),
            _EarnCoinsTab(),
            _HistoryTab(),
          ],
        ),
      ),
    );
  }
}

/* ─────────────────────────── TAB 1: MI CÓDIGO ─────────────────────── */

class _MyCodeTab extends StatelessWidget {
  const _MyCodeTab();

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    final p = context.watch<ReferralsProvider>();
    if (p.loadingStats && p.stats == null) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    final s = p.stats;
    if (s == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            p.error ?? 'No se pudieron cargar los datos.',
            style: TextStyle(color: c.textSecondary),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => p.loadStats(),
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _CoinsCard(coins: s.coins),
          const SizedBox(height: 20),
          _MyCodeCard(code: s.code),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _MetricBox(
                  icon: Icons.send_rounded,
                  label: 'Enviadas',
                  value: s.totalInvited.toString(),
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricBox(
                  icon: Icons.verified_rounded,
                  label: 'Aprobadas',
                  value: s.approvedInvited.toString(),
                  color: const Color(0xFF10B981),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricBox(
                  icon: Icons.hourglass_empty_rounded,
                  label: 'Pendientes',
                  value: s.pendingInvited.toString(),
                  color: AppColors.amberDark,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CoinsCard extends StatelessWidget {
  final int coins;
  const _CoinsCard({required this.coins});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.amber, AppColors.amberDark],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.amber.withValues(alpha: 0.4),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.monetization_on_rounded,
                color: Colors.white, size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Tus monedas',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatNumber(coins),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    height: 1,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MyCodeCard extends StatelessWidget {
  final String code;
  const _MyCodeCard({required this.code});

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'TU CÓDIGO PERSONAL',
            style: TextStyle(
              color: c.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.4,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    code,
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 4,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => _copyToClipboard(context, code, plain: true),
                  icon: const Icon(Icons.copy_rounded, color: AppColors.primary),
                  tooltip: 'Copiar código',
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _copyToClipboard(context, code, plain: false),
              icon: const Icon(Icons.share_rounded, size: 18),
              label: const Text('Copiar enlace para invitar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                textStyle:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _copyToClipboard(BuildContext context, String code,
      {required bool plain}) {
    final text = plain
        ? code
        : 'Descarga OficioApp y usa mi código $code al registrarte como '
            'profesional o negocio: $_kAppDownloadUrl';
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(plain ? 'Código copiado' : 'Enlace de invitación copiado'),
        duration: const Duration(seconds: 2),
        backgroundColor: const Color(0xFF10B981),
      ),
    );
  }
}

class _MetricBox extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _MetricBox({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).extension<AppThemeColors>()!;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 22, color: color),
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 22,
                  fontWeight: FontWeight.w900)),
          Text(label,
              style: TextStyle(color: c.textMuted, fontSize: 11)),
        ],
      ),
    );
  }
}

/* ─────────────────────────── TAB 2: GANAR MONEDAS ─────────────────── */

class _EarnCoinsTab extends StatelessWidget {
  const _EarnCoinsTab();

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
          _ExplainerCard(),
          const SizedBox(height: 20),
          _PlanRedemptionTile(
            plan: 'ESTANDAR',
            label: 'Plan Estándar',
            duration: '1 mes',
            cost: 500,
            color: AppColors.primary,
          ),
          const SizedBox(height: 12),
          _PlanRedemptionTile(
            plan: 'PREMIUM',
            label: 'Plan Premium',
            duration: '2 meses',
            cost: 1000,
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
            _EmptyRewards()
          else
            ...p.rewards.map((r) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _RewardCard(reward: r),
                )),
        ],
      ),
    );
  }
}

class _ExplainerCard extends StatelessWidget {
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
              '50 monedas al ser aprobado.'),
          _explainLine(c, '🎁 Tu invitado',
              'recibe 5 monedas de bienvenida.'),
          _explainLine(c, '💼 Canjea por un plan',
              '500 = Estándar 1 mes · 1000 = Premium 2 meses.'),
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

class _PlanRedemptionTile extends StatelessWidget {
  final String plan;
  final String label;
  final String duration;
  final int cost;
  final Color color;
  const _PlanRedemptionTile({
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
      _showSuccessDialog(
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

class _RewardCard extends StatelessWidget {
  final ReferralReward reward;
  const _RewardCard({required this.reward});

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
      _showRedeemedRewardDialog(
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

class _EmptyRewards extends StatelessWidget {
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

void _showSuccessDialog(BuildContext context, String title, String body) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Row(
        children: const [
          Icon(Icons.check_circle, color: Color(0xFF10B981)),
          SizedBox(width: 8),
          Expanded(child: Text('¡Canje exitoso!')),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(body),
        ],
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Entendido')),
      ],
    ),
  );
}

void _showRedeemedRewardDialog(
  BuildContext context, {
  required String title,
  required String providerName,
  String? phone,
  String? whatsapp,
}) {
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Row(
        children: const [
          Icon(Icons.check_circle, color: Color(0xFF10B981)),
          SizedBox(width: 8),
          Expanded(child: Text('¡Canje exitoso!')),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('Proveedor: $providerName'),
          if (phone != null && phone.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Teléfono: $phone'),
            ),
          if (whatsapp != null && whatsapp.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('WhatsApp: $whatsapp'),
            ),
          const SizedBox(height: 12),
          const Text(
            'Contacta al proveedor para coordinar el servicio. '
            'Muestra este canje como comprobante.',
            style: TextStyle(fontSize: 12),
          ),
        ],
      ),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Entendido')),
      ],
    ),
  );
}

/* ─────────────────────────── TAB 3: HISTORIAL ─────────────────────── */

class _HistoryTab extends StatelessWidget {
  const _HistoryTab();

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
            ...p.stats!.history.map((h) => _HistoryReferralTile(item: h)),
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
            ...p.redemptions.map((r) => _RedemptionTile(item: r)),
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

class _HistoryReferralTile extends StatelessWidget {
  final ReferralHistory item;
  const _HistoryReferralTile({required this.item});

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
                  '${_formatDate(item.createdAt)} · '
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

class _RedemptionTile extends StatelessWidget {
  final CoinRedemption item;
  const _RedemptionTile({required this.item});

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
                Text(_formatDate(item.createdAt),
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

/* ─────────────────────────── HELPERS ──────────────────────────────── */

String _formatNumber(int value) {
  // Inserta separador de miles cada 3 dígitos (formato es-PE: punto como
  // separador de miles, coma decimal — pero aquí solo enteros).
  final s = value.toString();
  final buf = StringBuffer();
  for (int i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
    buf.write(s[i]);
  }
  return buf.toString();
}

String _formatDate(DateTime d) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(d.day)}/${two(d.month)}/${d.year}';
}
