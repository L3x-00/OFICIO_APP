import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import '../../../domain/models/dashboard_profile_model.dart';
import '../../providers/dashboard_provider.dart';

/// Sección "Privacidad y seguridad" del panel del proveedor.
///
/// Tres toggles INDEPENDIENTES del plan — la seguridad es un derecho, no un
/// privilegio de pago. Controlan qué expone el perfil público:
///   - showPhone          → teléfono visible / botón llamar.
///   - showWhatsapp        → WhatsApp visible / botón WhatsApp.
///   - showExactLocation   → distrito + dirección exacta vs solo dpto/provincia.
///
/// Cada cambio hace PATCH /provider-profile/me (optimista, revierte si falla).
/// El [DashboardProvider] mantiene el estado, así que el Switch lee siempre de
/// `profile` (no de estado interno) y refleja correctamente un revert.
class PrivacyTogglesSection extends StatefulWidget {
  final DashboardProfileModel profile;
  final DashboardProvider dash;

  const PrivacyTogglesSection({
    super.key,
    required this.profile,
    required this.dash,
  });

  @override
  State<PrivacyTogglesSection> createState() => _PrivacyTogglesSectionState();
}

class _PrivacyTogglesSectionState extends State<PrivacyTogglesSection> {
  /// Campo en curso (muestra spinner) — null si ninguno.
  String? _busy;

  Future<void> _set(String field, bool value, String label) async {
    setState(() => _busy = field);
    final ok = await widget.dash.setPrivacyToggle(field, value);
    if (!mounted) return;
    setState(() => _busy = null);
    if (ok) {
      context.showSuccessSnack(
        value ? '$label visible en tu perfil' : '$label oculto en tu perfil',
      );
    } else {
      context.showErrorSnack('No se pudo guardar. Revisa tu conexión.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.profile;
    // Si teléfono y WhatsApp están ocultos, el cliente solo puede usar el
    // chat interno — se lo avisamos al proveedor para que sea consciente.
    final onlyChat = !p.showPhone && !p.showWhatsapp;

    return Column(
      children: [
        _ToggleRow(
          icon: Icons.phone_rounded,
          title: 'Mostrar mi teléfono',
          subtitle: p.showPhone
              ? 'Los clientes pueden ver tu número y llamarte'
              : 'Tu número permanece oculto en el perfil',
          value: p.showPhone,
          loading: _busy == 'showPhone',
          onChanged: (v) => _set('showPhone', v, 'Teléfono'),
        ),
        _ToggleRow(
          icon: Icons.chat_rounded,
          title: 'Mostrar mi WhatsApp',
          subtitle: p.showWhatsapp
              ? 'Los clientes pueden escribirte por WhatsApp'
              : 'Tu WhatsApp permanece oculto en el perfil',
          value: p.showWhatsapp,
          loading: _busy == 'showWhatsapp',
          onChanged: (v) => _set('showWhatsapp', v, 'WhatsApp'),
        ),
        _ToggleRow(
          icon: Icons.location_on_rounded,
          title: 'Mostrar mi ubicación exacta',
          subtitle: p.showExactLocation
              ? 'Se muestra tu distrito y dirección'
              : 'Solo se muestra departamento y provincia',
          value: p.showExactLocation,
          loading: _busy == 'showExactLocation',
          onChanged: (v) => _set('showExactLocation', v, 'Ubicación exacta'),
        ),
        if (onlyChat)
          Container(
            margin: const EdgeInsets.only(top: 4),
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
            decoration: BoxDecoration(
              color: AppColors.amber.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.amber.withValues(alpha: 0.25),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline_rounded,
                  color: AppColors.amber,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Con teléfono y WhatsApp ocultos, los clientes solo podrán '
                    'contactarte por el chat interno de la app.',
                    style: TextStyle(
                      color: AppColors.amber.withValues(alpha: 0.9),
                      fontSize: 11,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Fila individual de toggle — Switch o spinner mientras guarda.
class _ToggleRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final bool loading;
  final ValueChanged<bool> onChanged;

  const _ToggleRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.loading,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: value ? AppColors.primary : c.textSecondary,
            size: 20,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(color: c.textPrimary, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(color: c.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.primary,
                  ),
                )
              : Switch(
                  value: value,
                  onChanged: onChanged,
                  activeThumbColor: AppColors.amber,
                ),
        ],
      ),
    );
  }
}
