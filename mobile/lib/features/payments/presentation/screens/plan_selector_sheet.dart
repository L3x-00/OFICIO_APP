import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../provider_dashboard/presentation/providers/dashboard_provider.dart';
import 'yape_payment_screen.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../payments/presentation/providers/payments_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

const _kPlanPrices = {'ESTANDAR': 19.90, 'PREMIUM': 39.90};

const _kPlanFeatures = {
  'GRATIS': ['2 fotos', '3 servicios', 'Listado básico'],
  'ESTANDAR': [
    '6 fotos',
    '15 servicios',
    'Prioridad media',
    'Badge verificado',
  ],
  'PREMIUM': [
    '10 fotos',
    'Servicios ilimitados',
    'Máxima prioridad',
    'Badge Premium',
    'Subastas',
  ],
};

const _kPlanLabels = {
  'GRATIS': 'Gratis',
  'ESTANDAR': 'Estándar',
  'PREMIUM': 'Premium',
};

class PlanSelectorSheet extends StatelessWidget {
  const PlanSelectorSheet._();

  static Future<bool?> show(BuildContext context) {
    // PaymentsProvider debe envolver al sheet — el Consumer interno
    // crashea (ProviderNotFoundException → pantalla blanca) si no
    // está en el árbol. Antes solo se proveía al navegar a Yape o
    // a PaymentHistoryScreen, no aquí.
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ChangeNotifierProvider(
        create: (_) => PaymentsProvider(),
        child: const PlanSelectorSheet._(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dash = context.watch<DashboardProvider>();
    final current = dash.profile?.subscription?.plan ?? 'GRATIS';

    return DraggableScrollableSheet(
      initialChildSize: 0.80,
      maxChildSize: 0.92,
      minChildSize: 0.5,
      builder: (sheetCtx, scroll) => Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(0, 12, 0, 0),
              child: Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: c.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
              child: Row(
                children: [
                  const Icon(
                    Icons.rocket_launch_rounded,
                    color: AppColors.amber,
                    size: 22,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Elige tu plan',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'Plan actual: ${_kPlanLabels[current] ?? current}',
                    style: TextStyle(color: c.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                controller: scroll,
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                children: [
                  // ── Plan Gratis (informativo, no comprable) ──
                  _PlanCard(
                    planKey: 'GRATIS',
                    label: 'Gratis',
                    price: null,
                    planColor: c.textMuted,
                    features: _kPlanFeatures['GRATIS']!,
                    isCurrent: current == 'GRATIS',
                    context: context,
                  ),
                  const SizedBox(height: 12),
                  // ── Planes comprables ────────────────────────
                  ..._kPlanPrices.entries.map((entry) {
                    final plan = entry.key;
                    final price = entry.value;
                    final label = _kPlanLabels[plan]!;
                    final features = _kPlanFeatures[plan] ?? [];
                    final isCurrent = plan == current;
                    final isPremium = plan == 'PREMIUM';

                    final planColor = isPremium
                        ? AppColors.premium
                        : AppColors.primary;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _PlanCard(
                        planKey: plan,
                        label: label,
                        price: price,
                        planColor: planColor,
                        features: features,
                        isCurrent: isCurrent,
                        context: context,
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final String planKey;
  final String label;
  final double? price;
  final Color planColor;
  final List<String> features;
  final bool isCurrent;
  final BuildContext context;

  const _PlanCard({
    required this.planKey,
    required this.label,
    required this.price,
    required this.planColor,
    required this.features,
    required this.isCurrent,
    required this.context,
  });

  @override
  Widget build(BuildContext outerCtx) {
    final c = outerCtx.colors;
    final isFree = price == null;

    return Container(
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isCurrent ? planColor.withValues(alpha: 0.6) : c.border,
          width: isCurrent ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: planColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: planColor.withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                      color: planColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (isCurrent) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'Plan actual',
                      style: TextStyle(
                        color: Colors.green,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
                const Spacer(),
                Text(
                  isFree ? 'Gratis' : 'S/ ${price!.toStringAsFixed(2)}/mes',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: features
                  .map(
                    (f) => Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.check_circle_rounded,
                          size: 13,
                          color: planColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          f,
                          style: TextStyle(
                            color: c.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  )
                  .toList(),
            ),
            if (!isFree) ...[
              const SizedBox(height: 14),

              // ── Botón MercadoPago ───────────────────────
              Consumer<PaymentsProvider>(
                builder: (_, payProv, _) {
                  return SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton.icon(
                      onPressed: (isCurrent || payProv.mpLoading)
                          ? null
                          : () async {
                              final auth = context.read<AuthProvider>();
                              if (auth.user == null) return;

                              // providerType: el perfil al que se aplica el plan.
                              // activeProfileType es 'OFICIO' o 'NEGOCIO' según
                              // el panel del que el user abrió el plan selector.
                              final providerType =
                                  auth.activeProfileType ?? 'OFICIO';

                              await payProv.payWithMercadoPago(
                                plan: planKey,
                                providerType: providerType,
                              );

                              if (!context.mounted) return;
                              final url = payProv.mpInitPoint;
                              if (url != null) {
                                await launchUrl(
                                  Uri.parse(url),
                                  mode: LaunchMode.externalApplication,
                                );
                                // M-01: tras volver del navegador, polling
                                // de 1min al dashboard. El WS también
                                // notifica pero esto cubre desconexiones.
                                if (context.mounted) {
                                  // Capturar el read antes del await async
                                  final dashProv = context
                                      .read<DashboardProvider>();
                                  await payProv.pollMercadoPagoCompletion(
                                    refresh: () => dashProv.loadDashboard(),
                                    currentPlan: () =>
                                        dashProv.profile?.subscription?.plan ??
                                        'GRATIS',
                                  );
                                }
                              } else if (payProv.error != null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(payProv.error!),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            },
                      icon: payProv.mpLoading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.payment_rounded, size: 18),
                      label: Text(
                        payProv.mpLoading
                            ? 'Conectando...'
                            : isCurrent
                            ? 'Plan actual'
                            : 'Pagar con tarjeta o PagoEfectivo',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isCurrent
                            ? null
                            : const Color(0xFF009EE3),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  );
                },
              ),

              // Subtítulo aclaratorio: MercadoPago Checkout Pro incluye
              // PagoEfectivo, Yape, tarjetas y transferencia. Antes el
              // user pensaba que el botón era solo tarjeta.
              if (!isCurrent)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'Incluye PagoEfectivo, Yape, tarjeta y transferencia',
                    style: TextStyle(color: c.textMuted, fontSize: 10.5),
                    textAlign: TextAlign.center,
                  ),
                ),

              const SizedBox(height: 8),

              // ── Botón Yape ─────────────────────────────
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: isCurrent
                      ? null
                      : () async {
                          Navigator.pop(context);
                          final ok = await YapePaymentScreen.show(
                            context,
                            plan: planKey,
                          );
                          if (ok == true && context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Comprobante enviado. '
                                  'Te notificaremos cuando se valide.',
                                ),
                                backgroundColor: Color(0xFF6D1B7B),
                              ),
                            );
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isCurrent ? null : AppColors.amber,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    isCurrent ? 'Plan actual' : 'Pagar con Yape',
                    style: const TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.w700,
                    ),
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
