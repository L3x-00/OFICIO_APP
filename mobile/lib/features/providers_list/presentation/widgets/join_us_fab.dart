import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/widgets/join_us/join_us_modal.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../auth/presentation/screens/onboarding/provider_onboarding_form.dart';
import '../../../provider_dashboard/presentation/screens/provider_panel.dart';

/// Botón flotante dinámico:
///   - Usuario sin perfil de proveedor (o pendiente): "¡Quiero ser parte!"
///     que pulsa suavemente y abre [JoinUsModal].
///   - Proveedor aprobado: "Ir a mi panel" estático. Si tiene ambos
///     perfiles (OFICIO + NEGOCIO), abre un modal de elección.
class JoinUsFAB extends StatefulWidget {
  const JoinUsFAB({super.key});

  @override
  State<JoinUsFAB> createState() => _JoinUsFABState();
}

class _JoinUsFABState extends State<JoinUsFAB>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    // Solo mostrar "Ir a mi panel" cuando el proveedor está APROBADO
    if (auth.hasApprovedProvider) {
      _pulseController.stop();
      return _buildProviderButton(context);
    }

    // Pendiente o sin perfil → siempre mostrar "¡Quiero ser parte!"
    if (!_pulseController.isAnimating) _pulseController.repeat(reverse: true);
    return _buildJoinUsButton(context);
  }

  Widget _buildProviderButton(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: () => _openProviderPanel(context),
      backgroundColor: Colors.transparent,
      elevation: 0,
      label: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.primaryDark],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.08),
              blurRadius: 8,
              spreadRadius: 0,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.dashboard_rounded, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text(
              'Ir a mi panel',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildJoinUsButton(BuildContext context) {
    return ScaleTransition(
      scale: _pulseAnim,
      child: FloatingActionButton.extended(
        onPressed: () => JoinUsModal.show(context),
        backgroundColor: Colors.transparent,
        elevation: 0,
        label: Container(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.amberDark, AppColors.amberDeep],
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppColors.amberDeep.withValues(alpha: 0.08),
                blurRadius: 8,
                spreadRadius: 0,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 18),
              SizedBox(width: 8),
              Text(
                '¡Quiero ser parte!',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openProviderPanel(BuildContext context) {
    final auth = context.read<AuthProvider>();
    // Refrescar siempre antes de decidir — el FAB es la puerta principal
    // al panel; un estado stale aquí es lo que rompe la UX al rechazar
    // o aprobar un perfil mientras el socket está dormido.
    auth.refreshProviderStatus();

    final oficioStatus = auth.verificationStatusFor('OFICIO');
    final negocioStatus = auth.verificationStatusFor('NEGOCIO');
    final hasOficio = oficioStatus != null;
    final hasNegocio = negocioStatus != null;

    // Si el user tiene los dos tipos registrados (cualquier combinación
    // de estados) → mostramos el chooser con banners por perfil. Esto
    // cubre el caso obs#4: uno aprobado + otro rechazado.
    if (hasOficio && hasNegocio) {
      _showPanelChoiceModal(context);
      return;
    }

    // Un solo perfil: si está aprobado, push directo al panel; si está
    // rechazado o pendiente, abrir el modal de Únete (que ya pinta
    // PendingBanner / RejectedBanner para ese tipo).
    final onlyType = hasOficio ? 'OFICIO' : 'NEGOCIO';
    final onlyStatus = hasOficio ? oficioStatus : negocioStatus;
    if (onlyStatus == 'APROBADO') {
      Navigator.of(context, rootNavigator: true).push(
        MaterialPageRoute(
          builder: (_) => ProviderPanel(providerType: onlyType),
        ),
      );
    } else {
      JoinUsModal.show(context);
    }
  }

  /// Sheet del chooser cuando el user tiene los dos perfiles. Cada perfil
  /// muestra su banner real (aprobado/pendiente/rechazado). Tocar un
  /// perfil aprobado → push del panel; tocar uno rechazado → reabre el
  /// onboarding con datos precargados; pendiente solo informa.
  void _showPanelChoiceModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetCtx) {
        final c = sheetCtx.colors;
        // Consumer para re-renderizar si llega una notif WS mientras el
        // sheet está abierto (p. ej. el admin aprueba justo en ese
        // instante).
        return Consumer<AuthProvider>(
          builder: (_, auth, _) {
            final oficioStatus = auth.verificationStatusFor('OFICIO');
            final negocioStatus = auth.verificationStatusFor('NEGOCIO');

            return Container(
              decoration: BoxDecoration(
                color: c.bg,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
              ),
              padding: EdgeInsets.fromLTRB(
                20,
                12,
                20,
                MediaQuery.of(sheetCtx).padding.bottom + 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: c.textMuted.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Tus perfiles',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Elige a cuál panel quieres ir',
                    style: TextStyle(color: c.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  _ProfileChoiceCard(
                    icon: Icons.handyman_rounded,
                    title: 'Perfil Profesional',
                    color: AppColors.primary,
                    status: oficioStatus,
                    rejectionReason: auth.rejectionReasonFor('OFICIO'),
                    onApprovedTap: () {
                      Navigator.pop(sheetCtx);
                      Navigator.of(context, rootNavigator: true).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              const ProviderPanel(providerType: 'OFICIO'),
                        ),
                      );
                    },
                    onRejectedTap: () {
                      Navigator.pop(sheetCtx);
                      Navigator.of(context, rootNavigator: true).push(
                        MaterialPageRoute(
                          builder: (_) => ProviderOnboardingForm(
                            providerType: 'OFICIO',
                            isStandalone: true,
                            initialData: auth.providerDataFor('OFICIO'),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  _ProfileChoiceCard(
                    icon: Icons.storefront_rounded,
                    title: 'Perfil de Negocio',
                    color: AppColors.amber,
                    status: negocioStatus,
                    rejectionReason: auth.rejectionReasonFor('NEGOCIO'),
                    onApprovedTap: () {
                      Navigator.pop(sheetCtx);
                      Navigator.of(context, rootNavigator: true).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              const ProviderPanel(providerType: 'NEGOCIO'),
                        ),
                      );
                    },
                    onRejectedTap: () {
                      Navigator.pop(sheetCtx);
                      Navigator.of(context, rootNavigator: true).push(
                        MaterialPageRoute(
                          builder: (_) => ProviderOnboardingForm(
                            providerType: 'NEGOCIO',
                            isStandalone: true,
                            initialData: auth.providerDataFor('NEGOCIO'),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

/// Tarjeta de un perfil con su banner de estado. Aprobado = card
/// interactiva al panel; Rechazado = card roja con reintentar;
/// Pendiente = card neutra informativa.
class _ProfileChoiceCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color color;
  final String? status;
  final String? rejectionReason;
  final VoidCallback onApprovedTap;
  final VoidCallback onRejectedTap;

  const _ProfileChoiceCard({
    required this.icon,
    required this.title,
    required this.color,
    required this.status,
    required this.rejectionReason,
    required this.onApprovedTap,
    required this.onRejectedTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isApproved = status == 'APROBADO';
    final isRejected = status == 'RECHAZADO';
    final isPending = status == 'PENDIENTE';

    final accentColor = isRejected
        ? AppColors.busy
        : isPending
        ? (c.isDark ? AppColors.amber : AppColors.amberDark)
        : color;

    final subtitle = isApproved
        ? 'Activo · Ir a mi panel'
        : isPending
        ? 'En revisión por el administrador'
        : isRejected
        ? 'Rechazado · Toca para volver a postular'
        : 'Sin perfil';

    return GestureDetector(
      onTap: isApproved
          ? onApprovedTap
          : isRejected
          ? onRejectedTap
          : null,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: accentColor.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: accentColor.withValues(alpha: 0.30),
            width: 0.5,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: accentColor, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          color: c.textPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: TextStyle(color: c.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Icon(
                  isApproved
                      ? Icons.chevron_right_rounded
                      : isRejected
                      ? Icons.refresh_rounded
                      : Icons.hourglass_top_rounded,
                  color: accentColor,
                  size: 22,
                ),
              ],
            ),
            if (isRejected &&
                rejectionReason != null &&
                rejectionReason!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                'Motivo: $rejectionReason',
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 12,
                  height: 1.4,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
