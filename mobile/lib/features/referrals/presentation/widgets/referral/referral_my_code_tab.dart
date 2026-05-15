import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/features/referrals/presentation/providers/referrals_provider.dart';
import 'package:provider/provider.dart';
import 'referral_helpers.dart';

/// TAB 1: Mi código — Muestra monedas, código personal y métricas.
class MyCodeTab extends StatelessWidget {
  const MyCodeTab({super.key});

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
          CoinsCard(coins: s.coins),
          const SizedBox(height: 20),
          MyCodeCard(code: s.code),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: MetricBox(
                  icon: Icons.send_rounded,
                  label: 'Enviadas',
                  value: s.totalInvited.toString(),
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: MetricBox(
                  icon: Icons.verified_rounded,
                  label: 'Aprobadas',
                  value: s.approvedInvited.toString(),
                  color: const Color(0xFF10B981),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: MetricBox(
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

/// Tarjeta superior con gradiente mostrando el total de monedas.
class CoinsCard extends StatelessWidget {
  final int coins;
  const CoinsCard({super.key, required this.coins});

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
                  formatNumber(coins),
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

/// Tarjeta que muestra el código de referido y botones para copiar/compartir.
class MyCodeCard extends StatelessWidget {
  final String code;
  const MyCodeCard({super.key, required this.code});

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
            'profesional o negocio: $kAppDownloadUrl';
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

/// Caja de métrica individual (Enviadas, Aprobadas, Pendientes).
class MetricBox extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const MetricBox({
    super.key,
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