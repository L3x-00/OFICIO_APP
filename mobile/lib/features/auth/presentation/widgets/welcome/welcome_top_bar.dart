import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

/// Barra superior del WelcomeScreen: logo + botón omitir.
class WelcomeTopBar extends StatelessWidget {
  final bool isDark;
  final bool isLastPage;

  const WelcomeTopBar({
    super.key,
    required this.isDark,
    required this.isLastPage,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 0),
      child: Row(
        children: [
          Image.asset(
            isDark
                ? 'assets/images/logo/servi.png'
                : 'assets/images/logo/servi.png',
            width: 34,
            height: 34,
            filterQuality: FilterQuality.high,
          ),
          const SizedBox(width: 8),
          Text(
            'Servi',
            style: TextStyle(
              color: c.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const Spacer(),
          AnimatedOpacity(
            opacity: isLastPage ? 0.0 : 1.0,
            duration: const Duration(milliseconds: 200),
            child: TextButton(
              onPressed: isLastPage
                  ? null
                  : () => context.read<AuthProvider>().browseAsGuest(),
              child: Text(
                'Omitir',
                style: TextStyle(color: c.textMuted, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
