import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/profile/profile_availability_section.dart';
import '../widgets/profile/profile_info_section.dart';
import '../widgets/profile/profile_photos_section.dart';
import '../widgets/profile/profile_plan_section.dart';
import '../widgets/profile/profile_trust_section.dart';

/// Tab "Perfil" del panel del proveedor.
///
/// Orquesta el [CustomScrollView] con las secciones del perfil (fotos,
/// info básica, disponibilidad/horario, confianza, plan). Cada sección
/// vive en `widgets/profile/`. La única lógica que permanece aquí es el
/// estado [_isSaving] del AppBar, actualizado por los callbacks
/// `onSavingChanged` de las secciones hijas.
class PanelProfileTab extends StatefulWidget {
  final bool isNegocio;
  final bool isPaused;
  final ValueChanged<bool> onPauseToggle;

  const PanelProfileTab({
    super.key,
    required this.isNegocio,
    required this.isPaused,
    required this.onPauseToggle,
  });

  @override
  State<PanelProfileTab> createState() => _PanelProfileTabState();
}

class _PanelProfileTabState extends State<PanelProfileTab> {
  bool _isSaving = false;

  void _setSaving(bool value) {
    if (mounted) setState(() => _isSaving = value);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dash = context.watch<DashboardProvider>();
    final profile = dash.profile;

    return Scaffold(
      backgroundColor: c.bg,
      body: CustomScrollView(
        slivers: [
          _buildAppBar(),
          if (dash.isLoading && profile == null)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: AppColors.amber)),
            )
          else ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Fotos
                    ProfilePhotosSection(
                      profile: profile,
                      onSavingChanged: _setSaving,
                    ),
                    const SizedBox(height: 20),
                    // Info básica
                    ProfileInfoSection(
                      profile: profile,
                      isNegocio: widget.isNegocio,
                      onSavingChanged: _setSaving,
                    ),
                    const SizedBox(height: 20),
                    // OFICIO: disponibilidad  |  NEGOCIO: horario de atención
                    ProfileAvailabilitySection(
                      profile: profile,
                      isNegocio: widget.isNegocio,
                      isPaused: widget.isPaused,
                      onPauseToggle: widget.onPauseToggle,
                    ),
                    const SizedBox(height: 20),
                    // Validación de confianza
                    ProfileTrustSection(isNegocio: widget.isNegocio),
                    const SizedBox(height: 20),
                    // Plan & Pagos
                    ProfilePlanSection(profile: profile),
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── APP BAR ───────────────────────────────────────────────

  SliverAppBar _buildAppBar() {
    final c    = context.colors;
    final dash = context.watch<DashboardProvider>();
    final busy = _isSaving || dash.isUploadingPhoto;
    return SliverAppBar(
      backgroundColor: c.bgCard,
      pinned: true,
      title: Text(
        widget.isNegocio ? 'Perfil de Negocio' : 'Perfil Profesional',
        style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
      ),
      actions: [
        if (busy)
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                color: dash.isUploadingPhoto ? AppColors.primary : AppColors.amber,
                strokeWidth: 2,
              ),
            ),
          ),
      ],
    );
  }
}
