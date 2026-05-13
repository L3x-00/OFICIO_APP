import 'package:flutter/material.dart';
import '../../../../core/constans/app_colors.dart';
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
        Navigator.of(context, rootNavigator: false).push(
          MaterialPageRoute(
            builder: (_) => const _OffersFullPage(),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF2D1B00), Color(0xFF4A2E00)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.amber.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: AppColors.amber.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.local_offer_rounded, color: AppColors.amber, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('¡Ofertas y promociones 💸',
                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
                  Text('Descuentos de proveedores verificados',
                      style: TextStyle(color: c.textMuted, fontSize: 11)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, color: AppColors.amber, size: 14),
          ],
        ),
      ),
    );
  }
}

class _OffersFullPage extends StatelessWidget {
  const _OffersFullPage();

  @override
  Widget build(BuildContext context) => const OffersScreen();
}
