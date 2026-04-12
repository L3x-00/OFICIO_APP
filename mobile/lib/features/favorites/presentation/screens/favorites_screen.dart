import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../providers/favorites_provider.dart';
import '../../../providers_list/presentation/widgets/service_card.dart';
import '../../../providers_list/presentation/screens/provider_detail_sheet.dart';
// ignore: unused_import
import '../../../auth/presentation/screens/login_screen.dart';

class FavoritesScreen extends StatelessWidget {
  final int? userId;
  const FavoritesScreen({super.key, this.userId});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        title: Text(
          'Mis favoritos',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
      ),
      body: userId == null
          ? _GuestBody(
              icon: Icons.favorite_border_rounded,
              iconColor: AppColors.favorite,
              title: 'Guarda tus favoritos',
              message:
                  'Regístrate o inicia sesión para guardar tus proveedores favoritos y acceder a más funciones.',
            )
          : Consumer<FavoritesProvider>(
              builder: (context, favProv, _) {
                if (favProv.isLoading) {
                  return const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  );
                }
                if (favProv.favorites.isEmpty) {
                  return _buildEmpty(c);
                }
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: favProv.loadFavorites,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: favProv.favorites.length,
                    itemBuilder: (context, index) {
                      final provider = favProv.favorites[index].copyWith(
                        isFavorite: true,
                      );
                      return ServiceCard(
                        provider: provider,
                        onTap: () =>
                            ProviderDetailSheet.show(context, provider),
                        onFavoriteToggle: () => favProv.toggle(provider.id),
                      );
                    },
                  ),
                );
              },
            ),
    );
  }

  Widget _buildEmpty(AppThemeColors c) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.favorite.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.favorite_border_rounded,
                color: AppColors.favorite,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Sin favoritos aún',
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Guarda profesionales y negocios\nque te interesen para encontrarlos rápido.',
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 13,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Estado invitado reutilizable ──────────────────────────

class _GuestBody extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String message;

  const _GuestBody({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.message,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 36),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 40),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              message,
              style: TextStyle(
                color: c.textSecondary,
                fontSize: 14,
                height: 1.6,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'Iniciar sesión / Registrarse',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
