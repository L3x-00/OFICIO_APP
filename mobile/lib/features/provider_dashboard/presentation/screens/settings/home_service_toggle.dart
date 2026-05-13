import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import '../../../domain/models/dashboard_profile_model.dart';
import '../../providers/dashboard_provider.dart';

/// Toggle "Servicio a domicilio" — solo visible para perfiles OFICIO.
/// Activarlo añade el badge "Va a domicilio" a la tarjeta del proveedor.
class HomeServiceToggle extends StatefulWidget {
  final DashboardProfileModel? profile;
  final DashboardProvider dash;

  const HomeServiceToggle({super.key, required this.profile, required this.dash});

  @override
  State<HomeServiceToggle> createState() => _HomeServiceToggleState();
}

class _HomeServiceToggleState extends State<HomeServiceToggle> {
  bool _loading = false;

  Future<void> _toggle(bool value) async {
    setState(() => _loading = true);
    await widget.dash.setHomeService(value);
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final active = widget.profile?.hasHomeService ?? false;

    return Container(
      decoration: BoxDecoration(
        color: active
            ? AppColors.primary.withValues(alpha: 0.07)
            : c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: active
              ? AppColors.primary.withValues(alpha: 0.3)
              : c.border,
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: active
                        ? AppColors.primary.withValues(alpha: 0.15)
                        : c.bgInput,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.home_repair_service_rounded,
                    color: active ? AppColors.primary : c.textMuted,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Servicio a domicilio',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        active
                            ? 'Activo — los clientes verán que vas a domicilio'
                            : 'Inactivo — solo atiendes en tu dirección',
                        style: TextStyle(color: c.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                _loading
                    ? SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      )
                    : Switch(
                        value: active,
                        onChanged: _toggle,
                        activeThumbColor: Colors.white,
                        activeTrackColor: AppColors.primary,
                      ),
              ],
            ),
          ),
          if (active)
            Container(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.04),
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                border: Border(top: BorderSide(color: AppColors.primary.withValues(alpha: 0.15))),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 14),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Tu tarjeta mostrará el badge "Va a domicilio" para los clientes que busquen atención en casa.',
                      style: TextStyle(
                        color: AppColors.primary.withValues(alpha: 0.8),
                        fontSize: 11,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
