import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:mobile/core/constans/app_colors.dart';
import '../../../../core/network/dio_client.dart';
import '../../../providers_list/domain/models/provider_model.dart';
import '../../../providers_list/presentation/widgets/service_card.dart';
import '../../../providers_list/presentation/screens/provider_detail_sheet.dart';

class FavoritesScreen extends StatefulWidget {
  final int userId;
  const FavoritesScreen({super.key, required this.userId});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final Dio _dio = DioClient.instance.dio;
  List<ProviderModel> _favorites = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    try {
      final response = await _dio.get('/favorites/${widget.userId}');
      final list = response.data as List;
      setState(() {
        _favorites = list
            .map((p) => ProviderModel.fromJson(p as Map<String, dynamic>))
            .toList();
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleFavorite(int providerId) async {
    await _dio.post('/favorites/${widget.userId}/$providerId');
    await _loadFavorites(); // Recargar la lista
  }

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
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _favorites.isEmpty
              ? _buildEmpty()
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _favorites.length,
                  itemBuilder: (context, index) {
                    final provider = _favorites[index].copyWith(
                      isFavorite: true,
                    );
                    return ServiceCard(
                      provider: provider,
                      onTap: () =>
                          ProviderDetailSheet.show(context, provider),
                      onFavoriteToggle: () =>
                          _toggleFavorite(provider.id),
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
            color: AppColors.textMuted.withOpacity(0.4),
          ),
          const SizedBox(height: 16),
          const Text(
            'Aún no tienes favoritos',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Toca el corazón en cualquier tarjeta\npara guardar un proveedor',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
        ],
      ),
    );
  }
}