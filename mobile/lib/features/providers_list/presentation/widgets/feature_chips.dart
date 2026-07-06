import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';

/// Metadata visual de cada funcionalidad por categoría.
const Map<String, ({IconData icon, String label})> _kFeatureMeta = {
  'carta_digital': (icon: Icons.restaurant_menu, label: 'Carta'),
  'catalogo': (icon: Icons.storefront, label: 'Catálogo'),
  'agenda': (icon: Icons.event_available, label: 'Agenda'),
  'cotizacion': (icon: Icons.request_quote, label: 'Cotización'),
};

/// Fila de chips que indica qué funcionalidades ofrece el proveedor
/// (se ve en la tarjeta del listado). Renderiza nada si no tiene ninguna.
class FeatureChips extends StatelessWidget {
  const FeatureChips({super.key, required this.features});

  final List<String> features;

  @override
  Widget build(BuildContext context) {
    final metas = features
        .map((f) => _kFeatureMeta[f])
        .whereType<({IconData icon, String label})>()
        .toList();
    if (metas.isEmpty) return const SizedBox.shrink();
    final tint = AppColors.tintOn(AppColors.amber, context.colors.isDark);

    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Wrap(
        spacing: 6,
        runSpacing: 6,
        children: metas
            .map(
              (m) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.amber.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppColors.amber.withValues(alpha: 0.30),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(m.icon, size: 12, color: tint),
                    const SizedBox(width: 4),
                    Text(
                      m.label,
                      style: TextStyle(
                        color: tint,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}
