import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../payments/presentation/providers/payments_provider.dart';
import '../../../../payments/presentation/screens/payment_history_screen.dart';
import '../../../../payments/presentation/screens/plan_selector_sheet.dart';
import '../../../domain/models/dashboard_profile_model.dart';

/// Sección "Plan & Pagos": muestra el plan vigente, estado y vencimiento,
/// con accesos a "Mis pagos" y "Subir de plan" (oculto si ya es Premium).
class ProfilePlanSection extends StatelessWidget {
  final DashboardProfileModel? profile;

  const ProfilePlanSection({super.key, required this.profile});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final plan = profile?.subscription?.plan ?? 'GRATIS';
    final status = profile?.subscription?.status ?? 'GRACIA';
    final endDate = profile?.subscription?.endDate;

    final planColor = switch (plan.toUpperCase()) {
      'PREMIUM' => AppColors.premium,
      'ESTANDAR' => AppColors.primary,
      'GRATIS' => AppColors.verified,
      _ => c.textMuted,
    };

    final isPremium = plan.toUpperCase() == 'PREMIUM';

    String? endLabel;
    if (endDate != null) {
      final months = [
        '',
        'ene',
        'feb',
        'mar',
        'abr',
        'may',
        'jun',
        'jul',
        'ago',
        'sep',
        'oct',
        'nov',
        'dic',
      ];
      endLabel =
          'Vence: ${endDate.day} ${months[endDate.month]} ${endDate.year}';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(
              Icons.workspace_premium_rounded,
              color: AppColors.amber,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text(
              'Plan & Pagos',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: planColor.withValues(alpha: 0.3)),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: planColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: planColor.withValues(alpha: 0.4),
                      ),
                    ),
                    child: Text(
                      '${plan[0]}${plan.substring(1).toLowerCase()}',
                      style: TextStyle(
                        color: AppColors.tintOn(planColor, c.isDark),
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        switch (status) {
                          'GRACIA' => 'Período de gracia',
                          'VENCIDA' => 'Vencido — pasó a Gratis',
                          'CANCELADA' => 'Cancelado',
                          _ => 'Activo',
                        },
                        style: TextStyle(
                          color: status == 'VENCIDA' || status == 'CANCELADA'
                              ? AppColors.busy
                              : c.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                      if (endLabel != null)
                        Text(
                          endLabel,
                          style: TextStyle(color: c.textMuted, fontSize: 11),
                        ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChangeNotifierProvider(
                            create: (_) => PaymentsProvider(),
                            child: const PaymentHistoryScreen(),
                          ),
                        ),
                      ),
                      icon: const Icon(Icons.receipt_long_rounded, size: 16),
                      label: const Text('Mis pagos'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: c.textSecondary,
                        side: BorderSide(color: c.border),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                  if (!isPremium) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => PlanSelectorSheet.show(context),
                        icon: Icon(
                          Icons.rocket_launch_rounded,
                          size: 16,
                          color: AppColors.onSolid(AppColors.amber),
                        ),
                        label: Text(
                          'Subir de plan',
                          style: TextStyle(
                            color: AppColors.onSolid(AppColors.amber),
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.amber,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
