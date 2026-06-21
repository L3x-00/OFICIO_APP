import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';

/// Sección de Toggles para servicios a domicilio o delivery según tipo de proveedor.
class OnboardingDeliverySection extends StatelessWidget {
  final bool isOficio;
  final bool hasDelivery;
  final bool plenaCoordinacion;
  final ValueChanged<bool> onDeliveryChanged;
  final ValueChanged<bool> onPlenaChanged;

  const OnboardingDeliverySection({
    super.key,
    required this.isOficio,
    required this.hasDelivery,
    required this.plenaCoordinacion,
    required this.onDeliveryChanged,
    required this.onPlenaChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (isOficio) return _buildOficioDomicilioSection(context);
    return _buildDeliverySection(context);
  }

  Widget _buildOficioDomicilioSection(BuildContext context) {
    final c = context.colors;
    return _buildToggleRow(
      c: c,
      value: hasDelivery,
      onChanged: onDeliveryChanged,
      icon: Icons.home_repair_service_rounded,
      label: 'Ofrezco servicios a domicilio',
      subtitle: 'Me desplazo al lugar del cliente',
    );
  }

  Widget _buildDeliverySection(BuildContext context) {
    final c = context.colors;
    // Ambos toggles SON INDEPENDIENTES — antes el segundo se desplegaba
    // solo si el primero estaba activo, y desactivar el primero forzaba
    // el segundo a false. Ahora cada uno se guarda y se muestra en la
    // tarjeta del negocio según lo que el user marcó.
    return Column(
      children: [
        _buildToggleRow(
          c: c,
          value: hasDelivery,
          onChanged: onDeliveryChanged,
          icon: Icons.delivery_dining_rounded,
          label: 'Ofrezco servicio de delivery',
          subtitle: 'Llevo los pedidos con mi propio repartidor',
        ),
        const SizedBox(height: 10),
        _buildToggleRow(
          c: c,
          value: plenaCoordinacion,
          onChanged: onPlenaChanged,
          icon: Icons.handshake_rounded,
          label: 'Servicio a domicilio',
          subtitle: 'Ofrezco servicios a dommicilio',
        ),
      ],
    );
  }

  Widget _buildToggleRow({
    required AppThemeColors c,
    required bool value,
    required ValueChanged<bool> onChanged,
    required IconData icon,
    required String label,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: value ? AppColors.primary.withValues(alpha: 0.06) : c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: value ? AppColors.primary.withValues(alpha: 0.4) : c.border,
        ),
      ),
      child: Row(
        children: [
          Icon(icon, color: value ? AppColors.primary : c.textMuted, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(color: c.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.primary,
          ),
        ],
      ),
    );
  }
}
