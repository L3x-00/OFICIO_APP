import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../subastas/presentation/providers/subastas_provider.dart';
import '../../../subastas/presentation/screens/my_requests_screen.dart';
import '../../../subastas/presentation/screens/publish_request_sheet.dart';
import '../../../auth/presentation/screens/login_screen.dart';

/// Banner promocional para subastas — solo visible para clientes (no
/// proveedores). Abre el sheet de publicar pedido y, si el usuario lo
/// publica, navega a la pantalla de mis pedidos.
class SubastaBanner extends StatelessWidget {
  const SubastaBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Mostrar para todos: invitados, clientes y proveedores
    return GestureDetector(
      onTap: () async {
        final auth = context.read<AuthProvider>();

        // Si es invitado, mostrar diálogo de registro
        if (auth.user == null) {
          _showLoginRequired(context);
          return;
        }

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
          nav.push(
            MaterialPageRoute(
              builder: (_) => ChangeNotifierProvider(
                create: (_) => SubastasProvider(),
                child: const MyRequestsScreen(),
              ),
            ),
          );
        }
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
              child: Icon(
                Icons.campaign_rounded,
                color: AppColors.tintOn(AppColors.amber, c.isDark),
                size: 17,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '¿No encuentras lo que buscas? 🔍',
                    style: TextStyle(
                      color: c.textPrimary, // Texto dinámico
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    'Publica tu necesidad y recibe ofertas',
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: 11,
                    ), // Subtítulo dinámico
                  ),
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

void _showLoginRequired(BuildContext context) {
  final c = context.colors;
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Icon(Icons.lock_outline_rounded, color: AppColors.primary, size: 24),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              'Inicia sesión / Registrarse',
              style: TextStyle(fontSize: 17),
            ),
          ),
        ],
      ),
      content: const Text(
        'Para publicar una necesidad y recibir ofertas de profesionales, necesitas crear una cuenta gratuita.',
        style: TextStyle(fontSize: 13, height: 1.5),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Ahora no'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.of(
            context,
            rootNavigator: true,
          ).push(MaterialPageRoute(builder: (_) => const LoginScreen())),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          child: const Text('Iniciar sesión'),
        ),
      ],
    ),
  );
}
