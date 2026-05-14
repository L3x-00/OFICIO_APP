import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/widgets/join_us/join_us_modal.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
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
            colors: [Color(0xFF1E88E5), Color(0xFF1565C0)],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1E88E5).withValues(alpha: 0.4),
              blurRadius: 12, spreadRadius: 2, offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.dashboard_rounded, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text('Ir a mi panel',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
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
              colors: [Color(0xFFFFB347), Color(0xFFFF6B35)],
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFFF6B35).withValues(alpha: 0.4),
                blurRadius: 12, spreadRadius: 2, offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 18),
              SizedBox(width: 8),
              Text('¡Quiero ser parte!',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }

  void _openProviderPanel(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final oficioApproved  = auth.verificationStatusFor('OFICIO')  == 'APROBADO';
    final negocioApproved = auth.verificationStatusFor('NEGOCIO') == 'APROBADO';

    if (oficioApproved && negocioApproved) {
      _showPanelChoiceModal(context);
    } else {
      final type = oficioApproved ? 'OFICIO' : 'NEGOCIO';
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ProviderPanel(providerType: type)),
      );
    }
  }

  void _showPanelChoiceModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        final c = sheetCtx.colors;
        return Container(
          decoration: BoxDecoration(
            color: c.bg,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.fromLTRB(
            20, 12, 20,
            MediaQuery.of(sheetCtx).padding.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: c.textMuted.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                '¿A qué panel deseas ir?',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Tienes dos perfiles activos',
                style: TextStyle(color: c.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 20),
              _PanelChoiceCard(
                icon: Icons.handyman_rounded,
                title: 'Panel Profesional',
                subtitle: 'Gestiona tus oficios y servicios',
                color: AppColors.primary,
                onTap: () {
                  Navigator.pop(sheetCtx);
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const ProviderPanel(providerType: 'OFICIO'),
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),
              _PanelChoiceCard(
                icon: Icons.storefront_rounded,
                title: 'Panel de Negocio',
                subtitle: 'Administra tu negocio local',
                color: const Color(0xFF8E2DE2),
                onTap: () {
                  Navigator.pop(sheetCtx);
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const ProviderPanel(providerType: 'NEGOCIO'),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

class _PanelChoiceCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _PanelChoiceCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
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
                  Text(
                    subtitle,
                    style: TextStyle(color: c.textSecondary, fontSize: 12),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: color, size: 22),
          ],
        ),
      ),
    );
  }
}
