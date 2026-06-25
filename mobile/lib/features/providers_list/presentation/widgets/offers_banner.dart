import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../offer_posts/presentation/screens/offers_screen.dart';

/// Banner promocional que enlaza a la pantalla de ofertas activas.
/// PublicOffersProvider ya vive en el MultiProvider global, así que
/// abrir [OffersScreen] como ruta independiente funciona sin envolver.
class OffersBanner extends StatelessWidget {
  const OffersBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: () {
        // Cambiar al tab de Ofertas (índice 2) en lugar de abrir una ruta nueva
        final shell = StatefulNavigationShell.of(context);
        shell.goBranch(2); // Tab 2 = Ofertas
      },
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: c.bgCard, // Fondo dinámico (blanco en claro, oscuro en dark)
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: c.border, width: 0.5),
          // Sombra sutil en tema claro, casi nula en oscuro
          boxShadow: [
            BoxShadow(
              color: AppColors.amber.withValues(alpha: c.isDark ? 0.04 : 0.06),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.amber.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.local_offer_rounded,
                color: AppColors.amber,
                size: 17,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '¡Ofertas y promociones 💸',
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ), // Texto dinámico
                  Text(
                    'Descuentos de proveedores verificados',
                    style: TextStyle(color: c.textSecondary, fontSize: 11),
                  ), // Subtítulo dinámico
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios_rounded,
              color: c.textSecondary,
              size: 14,
            ),
          ],
        ),
      ),
    );
  }
}
