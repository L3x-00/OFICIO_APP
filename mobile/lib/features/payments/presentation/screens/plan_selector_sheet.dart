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
    // 'Subastas' — feature oculta (kSubastasEnabled); restaurar al reactivar.
    'Alcance en más distritos',
  ],
};

const _kPlanLabels = {
  'GRATIS': 'Gratis',
  'ESTANDAR': 'Estándar',
  'PREMIUM': 'Premium',
};

class PlanSelectorSheet extends StatefulWidget {
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
  State<PlanSelectorSheet> createState() => _PlanSelectorSheetState();
}

class _PlanSelectorSheetState extends State<PlanSelectorSheet>
    with WidgetsBindingObserver {
  String? _pendingMercadoPagoPlan;
  bool _checkoutWentToBackground = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_pendingMercadoPagoPlan == null) return;
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      _checkoutWentToBackground = true;
      return;
    }
    if (state == AppLifecycleState.resumed && _checkoutWentToBackground) {
      _checkoutWentToBackground = false;
      _checkMercadoPagoReturn();
    }
  }

  Future<void> _startMercadoPagoCheckout(String plan) async {
    final auth = context.read<AuthProvider>();
    if (auth.user == null) return;

    final payment = context.read<PaymentsProvider>();
    await payment.payWithMercadoPago(
      plan: plan,
      providerType: auth.activeProfileType ?? 'OFICIO',
    );
    if (!mounted) return;

    final url = payment.mpInitPoint;
    if (url == null || payment.mpExternalReference == null) {
      _showFeedback(
        payment.error ?? 'No se pudo iniciar el pago con Mercado Pago.',
        AppColors.busy,
      );
      return;
    }

    setState(() {
      _pendingMercadoPagoPlan = plan;
      _checkoutWentToBackground = false;
    });
    final opened = await launchUrl(
      Uri.parse(url),
      mode: LaunchMode.externalApplication,
    );
    if (!mounted || opened) return;

    setState(() => _pendingMercadoPagoPlan = null);
    _showFeedback(
      'No pudimos abrir Mercado Pago. Intenta nuevamente.',
      AppColors.busy,
    );
  }

  Future<void> _checkMercadoPagoReturn() async {
    final expectedPlan = _pendingMercadoPagoPlan;
    if (expectedPlan == null || !mounted) return;
    setState(() => _pendingMercadoPagoPlan = null);

    final payment = context.read<PaymentsProvider>();
    final dashboard = context.read<DashboardProvider>();
    final status = await payment.pollMercadoPagoCompletion(
      expectedPlan: expectedPlan,
      refresh: () => dashboard.loadDashboard(),
      currentPlan: () => dashboard.profile?.subscription?.plan ?? 'GRATIS',
    );
    if (!mounted) return;

    if (status.isRejected) {
      _showFeedback(
        status.message ??
            'Mercado Pago no pudo aprobar este intento. Prueba otro medio de pago.',
        AppColors.busy,
      );
      return;
    }
    if (dashboard.profile?.subscription?.plan == expectedPlan) {
      _showFeedback('¡Listo! Tu plan ya está activo.', AppColors.available);
      return;
    }
    _showFeedback(
      status.isApproved
          ? 'Mercado Pago aprobó el pago. Estamos activando tu plan.'
          : 'Aún no recibimos una confirmación. Puedes revisar tus Alertas en unos minutos.',
      AppColors.delayed,
    );
  }

  void _showFeedback(String message, Color color) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: color,
        content: Text(
          message,
          style: TextStyle(color: AppColors.onSolid(color)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dash = context.watch<DashboardProvider>();
    final payment = context.watch<PaymentsProvider>();
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
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    child: payment.mpChecking
                        ? Container(
                            key: const ValueKey('mp-checking'),
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.verified.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Row(
                              children: [
                                const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.verified,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Verificando tu pago de forma segura...',
                                    style: TextStyle(
                                      color: AppColors.tintOn(
                                        AppColors.verified,
                                        c.isDark,
                                      ),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )
                        : const SizedBox.shrink(key: ValueKey('mp-idle')),
                  ),
                  // ── Plan Gratis (informativo, no comprable) ──
                  _PlanCard(
                    planKey: 'GRATIS',
                    label: 'Gratis',
                    price: null,
                    planColor: c.textMuted,
                    features: _kPlanFeatures['GRATIS']!,
                    isCurrent: current == 'GRATIS',
                    context: context,
                    onMercadoPagoCheckout: _startMercadoPagoCheckout,
                    isCheckoutProcessing: payment.mpChecking,
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
                        onMercadoPagoCheckout: _startMercadoPagoCheckout,
                        isCheckoutProcessing: payment.mpChecking,
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
  final Future<void> Function(String plan) onMercadoPagoCheckout;
  final bool isCheckoutProcessing;

  const _PlanCard({
    required this.planKey,
    required this.label,
    required this.price,
    required this.planColor,
    required this.features,
    required this.isCurrent,
    required this.context,
    required this.onMercadoPagoCheckout,
    required this.isCheckoutProcessing,
  });

  @override
  Widget build(BuildContext outerCtx) {
    final c = outerCtx.colors;
    final isFree = price == null;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: isCurrent ? planColor.withValues(alpha: 0.06) : c.bg,
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
                      color: AppColors.available.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Plan actual',
                      style: TextStyle(
                        color: AppColors.tintOn(AppColors.available, c.isDark),
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
                      onPressed:
                          (isCurrent || payProv.mpLoading || payProv.mpChecking)
                          ? null
                          : () => onMercadoPagoCheckout(planKey),
                      icon: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 180),
                        child: payProv.mpLoading || payProv.mpChecking
                            ? SizedBox(
                                key: const ValueKey('loading'),
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.onSolid(AppColors.verified),
                                ),
                              )
                            : Icon(
                                Icons.payment_rounded,
                                key: const ValueKey('payment'),
                                size: 18,
                              ),
                      ),
                      label: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 180),
                        child: Text(
                          payProv.mpLoading
                              ? 'Conectando...'
                              : payProv.mpChecking
                              ? 'Verificando...'
                              : isCurrent
                              ? 'Plan actual'
                              : 'Pagar con tarjeta o PagoEfectivo',
                          key: ValueKey(
                            '${payProv.mpLoading}-${payProv.mpChecking}-$isCurrent',
                          ),
                          style: TextStyle(
                            color: AppColors.onSolid(AppColors.verified),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isCurrent ? null : AppColors.verified,
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
                  onPressed: isCurrent || isCheckoutProcessing
                      ? null
                      : () async {
                          Navigator.pop(context);
                          final ok = await YapePaymentScreen.show(
                            context,
                            plan: planKey,
                            providerType: context
                                .read<AuthProvider>()
                                .activeProfileType,
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
                    style: TextStyle(
                      color: AppColors.onSolid(AppColors.amber),
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
