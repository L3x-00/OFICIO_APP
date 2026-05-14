import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../../provider_dashboard/presentation/screens/provider_panel.dart';
import 'join_us_components.dart';
import 'join_us_initial_view.dart';
import 'join_us_type_detail.dart';

/// Modal informativo "¡Quiero ser parte de OficioApp!".
///
/// Orquesta dos vistas (inicial / detalle por tipo) con una transición
/// slide + fade. La lógica densa (banners de estado, planes, mock de
/// perfil) vive en widgets separados dentro de esta misma carpeta.
///
/// Uso: `JoinUsModal.show(context)`.
class JoinUsModal extends StatefulWidget {
  const JoinUsModal({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const JoinUsModal(),
    );
  }

  @override
  State<JoinUsModal> createState() => _JoinUsModalState();
}

class _JoinUsModalState extends State<JoinUsModal>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slideAnim;
  late final Animation<double> _fadeAnim;

  // null = vista inicial, 'OFICIO' o 'NEGOCIO' = vista de detalle
  String? _selectedType;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

    _fadeAnim = CurvedAnimation(parent: _controller, curve: Curves.easeIn);

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  // ─── Navegación a panel ─────────────────────────────────

  void _openPanel(BuildContext ctx, String type) {
    Navigator.of(ctx).push(
      MaterialPageRoute(builder: (_) => ProviderPanel(providerType: type)),
    );
  }

  /// Modal de elección cuando el usuario tiene los dos perfiles aprobados.
  /// Se invoca desde la vista inicial (callback onOpenPanelChoice).
  void _showPanelChoiceModal(BuildContext ctx) {
    showModalBottomSheet(
      context: ctx,
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
                style: TextStyle(color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              PanelChoiceOption(
                icon: Icons.handyman_rounded,
                label: 'Panel Profesional',
                color: AppColors.primary,
                onTap: () {
                  Navigator.pop(sheetCtx);
                  _openPanel(ctx, 'OFICIO');
                },
              ),
              const SizedBox(height: 12),
              PanelChoiceOption(
                icon: Icons.storefront_rounded,
                label: 'Panel de Negocio',
                color: const Color(0xFF8E2DE2),
                onTap: () {
                  Navigator.pop(sheetCtx);
                  _openPanel(ctx, 'NEGOCIO');
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final screenHeight = MediaQuery.of(context).size.height;

    return SlideTransition(
      position: _slideAnim,
      child: FadeTransition(
        opacity: _fadeAnim,
        child: Container(
          height: screenHeight * 0.92,
          decoration: BoxDecoration(
            color: c.bg,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              // Handle
              Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 4),
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: c.textMuted.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              Expanded(
                child: _selectedType == null
                    ? JoinUsInitialView(
                        onSelectType: (t) => setState(() => _selectedType = t),
                        onOpenPanel: (t) => _openPanel(context, t),
                        onOpenPanelChoice: () => _showPanelChoiceModal(context),
                      )
                    : JoinUsTypeDetail(
                        type: _selectedType!,
                        onBack: () => setState(() => _selectedType = null),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
