import 'package:flutter/material.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../payments/presentation/screens/yape_payment_screen.dart';
import '../../../data/dashboard_repository.dart';
import '../../../domain/models/dashboard_profile_model.dart';
import '../../providers/dashboard_provider.dart';
import 'plan_data.dart';

/// Tarjeta resumen del plan actual del proveedor.
/// Verde para GRATIS, amber para planes pagos activos, busy si inactivo.
class SubscriptionCard extends StatelessWidget {
  final SubscriptionInfo sub;
  const SubscriptionCard({super.key, required this.sub});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isFree   = sub.plan == 'GRATIS';
    final isActive = sub.isActive || isFree;
    final color    = isFree
        ? const Color(0xFF22C55E)
        : isActive ? AppColors.amber : AppColors.busy;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(
            isFree ? Icons.storefront_rounded : Icons.workspace_premium_rounded,
            color: color,
            size: 28,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Plan ${sub.planLabel}',
                  style: TextStyle(color: color, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                Text(
                  isFree ? 'Plan gratuito activo' : isActive ? 'Suscripción activa' : 'Suscripción inactiva',
                  style: TextStyle(color: c.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Sección colapsable "Ver planes disponibles" — al expandir muestra la
/// lista de [PlanCard].
class CollapsiblePlansSection extends StatefulWidget {
  final String currentPlan;
  const CollapsiblePlansSection({super.key, required this.currentPlan});

  @override
  State<CollapsiblePlansSection> createState() => _CollapsiblePlansSectionState();
}

class _CollapsiblePlansSectionState extends State<CollapsiblePlansSection> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: _expanded
                  ? AppColors.amber.withValues(alpha: 0.08)
                  : c.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _expanded
                    ? AppColors.amber.withValues(alpha: 0.4)
                    : c.border,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.workspace_premium_rounded,
                  color: _expanded ? AppColors.amber : c.textMuted,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Ver planes disponibles',
                    style: TextStyle(
                      color: _expanded ? AppColors.amber : c.textSecondary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Icon(
                  _expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                  color: _expanded ? AppColors.amber : c.textMuted,
                ),
              ],
            ),
          ),
        ),
        if (_expanded) ...[
          const SizedBox(height: 12),
          ...kPlans.map((plan) {
            final isCurrent = plan.id == widget.currentPlan;
            return PlanCard(plan: plan, isCurrent: isCurrent);
          }),
        ],
      ],
    );
  }
}

/// Tarjeta interactiva de un plan. Al tocar abre [YapePaymentScreen] para
/// el flujo de pago. Si el usuario ya tiene un plan pago activo, bloquea y
/// le indica cancelar primero el plan vigente.
class PlanCard extends StatefulWidget {
  final PlanData plan;
  final bool isCurrent;
  const PlanCard({super.key, required this.plan, required this.isCurrent});

  @override
  State<PlanCard> createState() => _PlanCardState();
}

class _PlanCardState extends State<PlanCard> {
  bool _pressed = false;

  Future<void> _openConfirmSheet() async {
    if (widget.isCurrent || widget.plan.id == 'GRATIS') return;

    // If user has an active paid plan, block and redirect to cancel flow
    final dash = context.read<DashboardProvider>();
    final sub  = dash.profile?.subscription;
    final hasActivePaidPlan = sub != null && sub.isActive && sub.plan != 'GRATIS';
    if (hasActivePaidPlan) {
      final c = context.colors;
      await showDialog(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: c.bgCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Plan activo detectado',
              style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
          content: Text(
            'TIENES QUE CANCELAR TU PLAN ACTUAL (${sub.planLabel}) antes de adquirir uno nuevo. Ve a Ajustes → Suscripción → Cancelar plan.',
            style: TextStyle(color: c.textSecondary, height: 1.5),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Entendido', style: TextStyle(color: AppColors.primary)),
            ),
          ],
        ),
      );
      return;
    }

    final ok = await YapePaymentScreen.show(context, plan: widget.plan.id);
    if (ok == true && mounted) {
      context.showInfoSnack('Comprobante enviado. Te notificaremos cuando se valide.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final c       = context.colors;
    final plan    = widget.plan;
    final current = widget.isCurrent;
    final isFree  = plan.id == 'GRATIS';
    final tappable = !current && !isFree;

    return GestureDetector(
      onTapDown:   tappable ? (_) => setState(() => _pressed = true)  : null,
      onTapUp:     tappable ? (_) => setState(() => _pressed = false) : null,
      onTapCancel: tappable ? ()  => setState(() => _pressed = false) : null,
      onTap:       tappable ? _openConfirmSheet : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: current
              ? plan.color.withValues(alpha: c.isDark ? 0.12 : 0.06)
              : _pressed
                  ? plan.color.withValues(alpha: 0.08)
                  : c.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: current
                ? plan.color.withValues(alpha: 0.55)
                : _pressed
                    ? plan.color.withValues(alpha: 0.4)
                    : c.border,
            width: current ? 1.8 : 1.0,
          ),
          boxShadow: current
              ? [BoxShadow(color: plan.color.withValues(alpha: 0.18), blurRadius: 16, offset: const Offset(0, 4))]
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header ─────────────────────────────────────
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: plan.color.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(plan.icon, color: plan.color, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            plan.label,
                            style: TextStyle(
                              color: plan.color,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (current) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: plan.color.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                'Plan actual',
                                style: TextStyle(color: plan.color, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                          if (plan.isPopular && !current) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.standard.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.standard.withValues(alpha: 0.4)),
                              ),
                              child: Text(
                                '⭐ Popular',
                                style: TextStyle(color: AppColors.standard, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: plan.price,
                              style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            TextSpan(
                              text: ' ${plan.priceNote}',
                              style: TextStyle(color: c.textMuted, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (tappable)
                  Icon(Icons.chevron_right_rounded, color: plan.color.withValues(alpha: 0.6), size: 22),
              ],
            ),
            const SizedBox(height: 14),

            // ── Features con SVG check ──────────────────────
            ...plan.features.map((f) => Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child: Row(
                children: [
                  SvgCheckIcon(color: plan.color),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      f,
                      style: TextStyle(
                        color: c.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            )),

            // ── CTA button (solo si no es actual ni gratis) ─
            if (tappable) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _openConfirmSheet,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: plan.color,
                    foregroundColor: plan.id == 'PREMIUM' ? const Color(0xFF3D2B00) : Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: Text(
                    'Solicitar plan ${plan.label}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Botón que cancela el plan pago actual y vuelve al plan Gratis.
/// Muestra un diálogo de confirmación antes de ejecutar.
class CancelPlanButton extends StatefulWidget {
  final DashboardProvider dash;
  const CancelPlanButton({super.key, required this.dash});

  @override
  State<CancelPlanButton> createState() => _CancelPlanButtonState();
}

class _CancelPlanButtonState extends State<CancelPlanButton> {
  bool _loading = false;

  Future<void> _confirm() async {
    final c = context.colors;
    final plan = widget.dash.profile?.subscription?.planLabel ?? 'actual';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('¿Cancelar tu plan?',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
        content: Text(
          'Al cancelar tu plan $plan perderás los beneficios inmediatamente y volverás al plan Gratis. Esta acción no reembolsa pagos anteriores.',
          style: TextStyle(color: c.textSecondary, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Mantener plan', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Sí, cancelar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;
    setState(() => _loading = true);
    try {
      await DashboardRepository().cancelPlan();
      if (!mounted) return;
      await widget.dash.loadDashboard();
      if (!mounted) return;
      context.showSuccessSnack('Plan cancelado. Ahora estás en el plan Gratis.');
    } catch (e) {
      if (!mounted) return;
      context.showErrorSnack('No se pudo cancelar: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _loading ? null : _confirm,
        icon: _loading
            ? const SizedBox(width: 16, height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.busy))
            : const Icon(Icons.cancel_outlined, size: 18, color: AppColors.busy),
        label: const Text('Cancelar plan',
            style: TextStyle(color: AppColors.busy, fontWeight: FontWeight.w600)),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: AppColors.busy.withValues(alpha: 0.5)),
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}
