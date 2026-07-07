import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../core/theme/app_theme_colors.dart';
import '../../../../../shared/widgets/app_snack_bar.dart';
import '../../../domain/models/coverage_model.dart';
import '../../providers/dashboard_provider.dart';
import 'profile_components.dart';

/// Sección "Alcance" del perfil: en qué distritos se muestra el proveedor.
///
/// - GRATIS  → tarjeta bloqueada: solo el distrito registrado + invitación
///   amigable a mejorar de plan (la sección "Mi Plan" está en este mismo tab).
/// - ESTANDAR/PREMIUM → chips con el distrito registrado (fijo) y los
///   adicionales elegidos, + botón para elegirlos (hasta 3/10 en total,
///   distritos de su misma provincia).
class ProfileReachSection extends StatefulWidget {
  final bool isNegocio;

  const ProfileReachSection({super.key, required this.isNegocio});

  @override
  State<ProfileReachSection> createState() => _ProfileReachSectionState();
}

class _ProfileReachSectionState extends State<ProfileReachSection> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final dash = context.read<DashboardProvider>();
      if (dash.coverage == null) dash.loadCoverage();
    });
  }

  String _planLabel(String plan) => switch (plan) {
    'PREMIUM' => 'Premium',
    'ESTANDAR' => 'Estándar',
    _ => 'Gratis',
  };

  @override
  Widget build(BuildContext context) {
    final dash = context.watch<DashboardProvider>();
    final coverage = dash.coverage;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle(
          icon: Icons.travel_explore_rounded,
          title: 'Alcance en tu zona',
          color: AppColors.primary,
        ),
        const SizedBox(height: 12),
        if (coverage == null)
          _LoadingOrRetryCard(
            isLoading: dash.isLoadingCoverage,
            onRetry: () => dash.loadCoverage(),
          )
        else if (coverage.locked)
          _LockedCard(coverage: coverage, isNegocio: widget.isNegocio)
        else
          _ActiveCard(
            coverage: coverage,
            planLabel: _planLabel(coverage.plan),
            isNegocio: widget.isNegocio,
          ),
      ],
    );
  }
}

class _LoadingOrRetryCard extends StatelessWidget {
  final bool isLoading;
  final VoidCallback onRetry;

  const _LoadingOrRetryCard({required this.isLoading, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: isLoading
          ? const Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.amber,
                ),
              ),
            )
          : Row(
              children: [
                Expanded(
                  child: Text(
                    'No se pudo cargar tu alcance.',
                    style: TextStyle(color: c.textSecondary, fontSize: 12),
                  ),
                ),
                TextButton(onPressed: onRetry, child: const Text('Reintentar')),
              ],
            ),
    );
  }
}

/// Plan GRATIS: alcance bloqueado al distrito registrado.
class _LockedCard extends StatelessWidget {
  final CoverageModel coverage;
  final bool isNegocio;

  const _LockedCard({required this.coverage, required this.isNegocio});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const accent = AppColors.amber;
    final home = coverage.home?.label ?? 'tu distrito';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.lock_rounded,
                color: AppColors.tintOn(accent, c.isDark),
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Te muestras en $home',
                  style: TextStyle(
                    color: AppColors.tintOn(accent, c.isDark),
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Con el plan Gratis ${isNegocio ? 'tu negocio aparece' : 'apareces'} '
            'solo en el distrito donde te registraste. Con el plan Estándar '
            'llegas hasta a 3 distritos de tu provincia, y con Premium hasta '
            'a 10. Puedes mejorar tu plan desde la sección "Mi Plan" de este '
            'mismo tab.',
            style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.5),
          ),
        ],
      ),
    );
  }
}

/// Plan de pago: chips de distritos + botón para elegirlos.
class _ActiveCard extends StatelessWidget {
  final CoverageModel coverage;
  final String planLabel;
  final bool isNegocio;

  const _ActiveCard({
    required this.coverage,
    required this.planLabel,
    required this.isNegocio,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const accent = AppColors.primary;
    final total = 1 + coverage.selected.length;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tu plan $planLabel te permite mostrarte hasta en '
            '${coverage.maxDistricts} distritos de tu provincia '
            '(incluido el registrado). Hoy ${isNegocio ? 'tu negocio se muestra' : 'te muestras'} '
            'en $total ${total == 1 ? 'distrito' : 'distritos'}.',
            style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.5),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (coverage.home != null)
                _DistrictChip(
                  label: coverage.home!.label,
                  icon: Icons.home_rounded,
                  isHome: true,
                ),
              ...coverage.selected.map(
                (l) => _DistrictChip(
                  label: l.label,
                  icon: Icons.place_rounded,
                  isHome: false,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _openPicker(context),
              icon: const Icon(Icons.edit_location_alt_rounded, size: 16),
              label: Text(
                coverage.selected.isEmpty
                    ? 'Elegir distritos'
                    : 'Cambiar distritos',
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: accent,
                foregroundColor: AppColors.onSolid(accent),
                padding: const EdgeInsets.symmetric(vertical: 11),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                textStyle: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _openPicker(BuildContext context) {
    final dash = context.read<DashboardProvider>();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ChangeNotifierProvider.value(
        value: dash,
        child: _DistrictPickerSheet(coverage: coverage),
      ),
    );
  }
}

class _DistrictChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isHome;

  const _DistrictChip({
    required this.label,
    required this.icon,
    required this.isHome,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final color = isHome ? AppColors.amber : AppColors.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppColors.tintOn(color, c.isDark)),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

/// Bottom sheet para elegir los distritos adicionales (hasta maxExtras).
class _DistrictPickerSheet extends StatefulWidget {
  final CoverageModel coverage;

  const _DistrictPickerSheet({required this.coverage});

  @override
  State<_DistrictPickerSheet> createState() => _DistrictPickerSheetState();
}

class _DistrictPickerSheetState extends State<_DistrictPickerSheet> {
  late final Set<int> _selected;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _selected = widget.coverage.selected.map((l) => l.id).toSet();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    final error = await context.read<DashboardProvider>().saveCoverage(
      _selected.toList(),
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (error == null) {
      Navigator.of(context).pop();
      context.showSuccessSnack('Alcance actualizado');
    } else {
      context.showErrorSnack(error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final cov = widget.coverage;
    final max = cov.maxExtras;
    final atLimit = _selected.length >= max;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: c.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Elige tus distritos',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Además de ${cov.home?.label ?? 'tu distrito'}, puedes '
                    'elegir hasta $max ${max == 1 ? 'distrito' : 'distritos'} '
                    'de tu provincia.',
                    style: TextStyle(color: c.textSecondary, fontSize: 12),
                  ),
                ],
              ),
            ),
            Flexible(
              child: cov.options.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'No hay más distritos disponibles en tu provincia.',
                        style: TextStyle(color: c.textSecondary, fontSize: 13),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: cov.options.length,
                      itemBuilder: (_, i) {
                        final opt = cov.options[i];
                        final checked = _selected.contains(opt.id);
                        return CheckboxListTile(
                          dense: true,
                          value: checked,
                          activeColor: AppColors.primary,
                          title: Text(
                            opt.label,
                            style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 13.5,
                            ),
                          ),
                          // Al llegar al límite se deshabilitan los no
                          // seleccionados (los marcados siempre se pueden
                          // desmarcar).
                          onChanged: (!checked && atLimit)
                              ? null
                              : (v) => setState(() {
                                  if (v == true) {
                                    _selected.add(opt.id);
                                  } else {
                                    _selected.remove(opt.id);
                                  }
                                }),
                        );
                      },
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Row(
                children: [
                  Text(
                    '${_selected.length} de $max',
                    style: TextStyle(
                      color: c.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: _saving ? null : _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.onSolid(AppColors.primary),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 28,
                        vertical: 11,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: _saving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Guardar',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
