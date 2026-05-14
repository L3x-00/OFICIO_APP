import 'package:flutter/material.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constans/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../../shared/widgets/schedule_editor.dart';
import '../../../domain/models/dashboard_profile_model.dart';
import '../../providers/dashboard_provider.dart';
import 'profile_components.dart';

/// Sección de disponibilidad/horario.
///   - OFICIO  → switch de visibilidad (activo/pausado) + chips de estado.
///   - NEGOCIO → editor de horario de atención colapsable.
class ProfileAvailabilitySection extends StatefulWidget {
  final DashboardProfileModel? profile;
  final bool isNegocio;
  final bool isPaused;
  final ValueChanged<bool> onPauseToggle;

  const ProfileAvailabilitySection({
    super.key,
    required this.profile,
    required this.isNegocio,
    required this.isPaused,
    required this.onPauseToggle,
  });

  @override
  State<ProfileAvailabilitySection> createState() => _ProfileAvailabilitySectionState();
}

class _ProfileAvailabilitySectionState extends State<ProfileAvailabilitySection> {
  bool _scheduleExpanded = false;

  void _togglePause(bool pause, DashboardProvider dash) {
    final status = pause ? 'OCUPADO' : 'DISPONIBLE';
    widget.onPauseToggle(pause);
    dash.setAvailability(status);
  }

  @override
  Widget build(BuildContext context) {
    return widget.isNegocio ? _buildScheduleSection() : _buildAvailabilitySection();
  }

  // ── DISPONIBILIDAD (OFICIO) ───────────────────────────────

  Widget _buildAvailabilitySection() {
    final c = context.colors;
    final dash = context.read<DashboardProvider>();
    final profile = widget.profile;
    final isPaused = widget.isPaused;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(
          icon: Icons.toggle_on_rounded,
          title: 'Visibilidad del perfil',
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.bgCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isPaused
                  ? AppColors.delayed.withValues(alpha: 0.4)
                  : AppColors.available.withValues(alpha: 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isPaused ? 'Perfil pausado' : 'Perfil activo',
                          style: TextStyle(
                            color: isPaused ? AppColors.delayed : AppColors.available,
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isPaused
                              ? 'Tu perfil no aparece en las búsquedas de clientes.'
                              : 'Los clientes pueden encontrarte y contactarte.',
                          style: TextStyle(color: c.textSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: !isPaused,
                    onChanged: (val) => _togglePause(!val, dash),
                    activeThumbColor: AppColors.available,
                    inactiveThumbColor: AppColors.delayed,
                    inactiveTrackColor: AppColors.delayed.withValues(alpha: 0.3),
                  ),
                ],
              ),
              if (isPaused) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.delayed.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline_rounded, size: 14, color: AppColors.delayed),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Reactivar tu perfil puede tomar unos minutos en reflejarse.',
                          style: TextStyle(color: AppColors.delayed, fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Estado de disponibilidad (independiente de pausar)
        Text(
          'Estado de disponibilidad',
          style: TextStyle(color: c.textSecondary, fontSize: 13, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            AvailabilityChip(
              label: 'Disponible',
              color: AppColors.available,
              selected: profile?.availability == 'DISPONIBLE',
              onTap: () => dash.setAvailability('DISPONIBLE'),
            ),
            const SizedBox(width: 8),
            AvailabilityChip(
              label: 'Con demora',
              color: AppColors.delayed,
              selected: profile?.availability == 'CON_DEMORA',
              onTap: () => dash.setAvailability('CON_DEMORA'),
            ),
            const SizedBox(width: 8),
            AvailabilityChip(
              label: 'Ocupado',
              color: AppColors.busy,
              selected: profile?.availability == 'OCUPADO',
              onTap: () => dash.setAvailability('OCUPADO'),
            ),
          ],
        ),
      ],
    );
  }

  // ── HORARIO DE ATENCIÓN (NEGOCIO) ─────────────────────────

  Widget _buildScheduleSection() {
    final c = context.colors;
    final dash = context.read<DashboardProvider>();
    final profile = widget.profile;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => setState(() => _scheduleExpanded = !_scheduleExpanded),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            ),
            child: Row(
              children: [
                Icon(Icons.schedule_rounded, size: 18, color: AppColors.amber),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _scheduleExpanded ? 'Ocultar horario de atención' : 'Ver / Editar horario de atención',
                    style: TextStyle(color: c.textPrimary, fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                ),
                Icon(
                  _scheduleExpanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                  color: c.textMuted,
                ),
              ],
            ),
          ),
        ),
        if (_scheduleExpanded) ...[
          const SizedBox(height: 12),
          ScheduleEditor(
            initialSchedule: profile?.scheduleJson,
            onSave: (schedule) async {
              final ok = await dash.updateProfile(scheduleJson: schedule);
              if (!mounted) return;
              if (ok) {
                context.showSuccessSnack('Horario guardado');
              } else {
                context.showErrorSnack(dash.error ?? 'Error al guardar');
              }
            },
          ),
        ],
      ],
    );
  }
}

/// Chip de estado de disponibilidad (Disponible / Con demora / Ocupado).
class AvailabilityChip extends StatelessWidget {
  final String label;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const AvailabilityChip({
    super.key,
    required this.label,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.2) : c.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? color : Colors.white.withValues(alpha: 0.1)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? color : c.textMuted,
            fontSize: 12,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
