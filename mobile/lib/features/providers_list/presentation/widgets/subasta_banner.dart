import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../subastas/presentation/providers/subastas_provider.dart';
import '../../../subastas/presentation/screens/my_requests_screen.dart';
import '../../../subastas/presentation/screens/publish_request_sheet.dart';

/// Banner promocional para subastas — solo visible para clientes (no
/// proveedores). Abre el sheet de publicar pedido y, si el usuario lo
/// publica, navega a la pantalla de mis pedidos.
class SubastaBanner extends StatelessWidget {
  const SubastaBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.watch<AuthProvider>();
    if (auth.user == null || auth.user!.isProvider) return const SizedBox.shrink();

    return GestureDetector(
      onTap: () async {
        final nav = Navigator.of(context);
        final result = await showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => ChangeNotifierProvider(
            create: (_) => SubastasProvider(),
            child: const PublishRequestSheet(),
          ),
        );
        if (result == true && context.mounted) {
          nav.push(MaterialPageRoute(
            builder: (_) => ChangeNotifierProvider(
              create: (_) => SubastasProvider(),
              child: const MyRequestsScreen(),
            ),
          ));
        }
      },
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 4, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF0A2647), Color(0xFF144272)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.campaign_rounded,
                  color: AppColors.primary, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('¿No encuentras lo que buscas?',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700)),
                  Text('Publica tu necesidad y recibe ofertas',
                      style: TextStyle(
                          color: c.textMuted, fontSize: 11)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded,
                color: AppColors.primary, size: 14),
          ],
        ),
      ),
    );
  }
}
