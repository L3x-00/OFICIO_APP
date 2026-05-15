import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../screens/login_screen.dart';

/// Botones de acción del WelcomeScreen: principal (Siguiente/Explorar)
/// y secundario (Ya tengo una cuenta).
class WelcomeActionButtons extends StatelessWidget {
  final Size size;
  final bool isLastPage;
  final Color accentColor;
  final PageController pageController;

  const WelcomeActionButtons({
    super.key,
    required this.size,
    required this.isLastPage,
    required this.accentColor,
    required this.pageController,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 4, 24, 0),
      child: Column(
        children: [
          // Botón principal
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                if (isLastPage) {
                  context.read<AuthProvider>().browseAsGuest();
                } else {
                  pageController.nextPage(
                    duration: const Duration(milliseconds: 500),
                    curve: Curves.easeInOut,
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: isLastPage ? Colors.black87 : Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 15),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isLastPage ? 'Explorar Servicios' : 'Siguiente',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Icon(
                    isLastPage
                        ? Icons.explore_rounded
                        : Icons.arrow_forward_rounded,
                    size: 18,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Botón secundario
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const LoginScreen(initialMode: AuthMode.login),
                ),
              ),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: c.border),
                ),
              ),
              child: Text(
                'Ya tengo una cuenta',
                style: TextStyle(color: c.textSecondary, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}