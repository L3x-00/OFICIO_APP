import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../agenda/presentation/screens/booking_screen.dart';
import '../../../catalog/presentation/screens/catalog_screen.dart';
import '../../../menu/presentation/screens/menu_screen.dart';
import '../../domain/models/provider_model.dart';

/// CTAs de las FUNCIONALIDADES por categoría dentro del detalle del proveedor
/// (carta, catálogo, agenda, cotización). Se renderiza solo lo que el proveedor
/// tiene habilitado (`provider.features`). Por ahora: Carta. Catálogo/Agenda/
/// Cotización se enchufan aquí en sus respectivos PRs.
class ProviderFeatureCtas extends StatelessWidget {
  const ProviderFeatureCtas({
    super.key,
    required this.provider,
    required this.accent,
  });

  final ProviderModel provider;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final ctas = <Widget>[];

    if (provider.hasMenu) {
      ctas.add(
        _FeatureCta(
          icon: Icons.restaurant_menu,
          label: 'Ver carta',
          accent: accent,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => MenuScreen(
                providerId: provider.id,
                businessName: provider.businessName,
              ),
            ),
          ),
        ),
      );
    }

    if (provider.hasCatalog) {
      ctas.add(
        _FeatureCta(
          icon: Icons.storefront,
          label: 'Ver catálogo',
          accent: accent,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => CatalogScreen(
                providerId: provider.id,
                businessName: provider.businessName,
              ),
            ),
          ),
        ),
      );
    }

    if (provider.hasAgenda) {
      ctas.add(
        _FeatureCta(
          icon: Icons.event_available,
          label: 'Agendar cita',
          accent: accent,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => BookingScreen(
                providerId: provider.id,
                businessName: provider.businessName,
              ),
            ),
          ),
        ),
      );
    }

    if (ctas.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        children: [
          for (var i = 0; i < ctas.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            ctas[i],
          ],
        ],
      ),
    );
  }
}

class _FeatureCta extends StatelessWidget {
  const _FeatureCta({
    required this.icon,
    required this.label,
    required this.accent,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: accent.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: accent.withValues(alpha: 0.30)),
        ),
        child: Row(
          children: [
            Icon(icon, color: accent, size: 20),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                color: accent,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
            const Spacer(),
            Icon(Icons.arrow_forward, color: accent, size: 18),
          ],
        ),
      ),
    );
  }
}
