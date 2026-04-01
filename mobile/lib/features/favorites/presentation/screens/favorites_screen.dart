import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:provider/provider.dart';
import '../providers/favorites_provider.dart';
import '../../../providers_list/presentation/widgets/service_card.dart';
import '../../../providers_list/presentation/screens/provider_detail_sheet.dart';

class FavoritesScreen extends StatelessWidget {
  final int userId;
  const FavoritesScreen({super.key, required this.userId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        backgroundColor: AppColors.bgDark,
        elevation: 0,
        title: const Text(
          'Mis favoritos',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: Consumer<FavoritesProvider>(
        builder: (context, favProv, _) {
          if (favProv.isLoading) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          if (favProv.favorites.isEmpty) {
            return _buildEmpty();
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
                  onTap: () => ProviderDetailSheet.show(context, provider),
                  onFavoriteToggle: () => favProv.toggle(provider.id),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.favorite_border_rounded,
            size: 64,
            color: AppColors.textMuted.withOpacity(0.3),
          ),
          const SizedBox(height: 16),
          const Text(
            'Aún no tienes favoritos',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Toca el ❤ en cualquier tarjeta\npara guardar un servicio aquí',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
        ],
      ),
    );
  }
}