import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../providers/favorites_provider.dart';
import '../../../providers_list/presentation/widgets/service_card.dart';
import '../../../providers_list/presentation/screens/provider_detail_sheet.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../chat/presentation/providers/chat_provider.dart';
import '../../../chat/presentation/screens/chat_screen.dart';

enum _FavViewMode { lista, mosaico }

class FavoritesScreen extends StatefulWidget {
  final int? userId;
  const FavoritesScreen({super.key, this.userId});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  _FavViewMode _viewMode = _FavViewMode.lista;

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
        actions: [
          if (widget.userId != null)
            _ViewToggle(
              viewMode: _viewMode,
              onChanged: (v) => setState(() => _viewMode = v),
            ),
        ],
      ),
      body: widget.userId == null
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

                final isMosaic = _viewMode == _FavViewMode.mosaico;
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: favProv.loadFavorites,
                  child: ListView.builder(
                    padding: EdgeInsets.all(isMosaic ? 12 : 16),
                    itemCount: isMosaic
                        ? (favProv.favorites.length / 2).ceil()
                        : favProv.favorites.length,
                    itemBuilder: (context, index) {
                      if (!isMosaic) {
                        final provider = favProv.favorites[index].copyWith(
                          isFavorite: true,
                        );
                        return ServiceCard(
                          provider: provider,
                          onTap: () =>
                              ProviderDetailSheet.show(context, provider),
                          onFavoriteToggle: () => favProv.toggle(provider.id),
                          onChat: () => _openChat(context, provider.id),
                        );
                      }
                      // Mosaic: pair two cards per row
                      final left = index * 2;
                      final right = left + 1;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          children: [
                            Expanded(
                              child: ServiceCardMosaic(
                                provider: favProv.favorites[left]
                                    .copyWith(isFavorite: true),
                                onTap: () => ProviderDetailSheet.show(
                                    context, favProv.favorites[left]),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: right < favProv.favorites.length
                                  ? ServiceCardMosaic(
                                      provider: favProv.favorites[right]
                                          .copyWith(isFavorite: true),
                                      onTap: () => ProviderDetailSheet.show(
                                          context, favProv.favorites[right]),
                                    )
                                  : const SizedBox.shrink(),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                );
              },
            ),
    );
  }

  Future<void> _openChat(BuildContext context, int providerId) async {
    final auth = context.read<AuthProvider>();
    if (auth.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inicia sesión para chatear')),
      );
      return;
    }
    final chat    = context.read<ChatProvider>();
    final nav     = Navigator.of(context);
    final scaffold = ScaffoldMessenger.of(context);
    try {
      final roomId = await chat.openRoom(
        clientId: auth.user!.id,
        providerId: providerId,
      );
      if (!mounted) return;
      nav.push(MaterialPageRoute(
        builder: (_) => ChatScreen(roomId: roomId),
      ));
    } catch (e) {
      if (!mounted) return;
      scaffold.showSnackBar(
        SnackBar(content: Text('No se pudo abrir el chat: $e')),
      );
    }
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

// ── Toggle mosaico / lista ────────────────────────────────

class _ViewToggle extends StatelessWidget {
  final _FavViewMode viewMode;
  final ValueChanged<_FavViewMode> onChanged;
  const _ViewToggle({required this.viewMode, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ToggleBtn(
            icon: Icons.view_list_rounded,
            active: viewMode == _FavViewMode.lista,
            onTap: () => onChanged(_FavViewMode.lista),
            c: c,
          ),
          const SizedBox(width: 4),
          _ToggleBtn(
            icon: Icons.grid_view_rounded,
            active: viewMode == _FavViewMode.mosaico,
            onTap: () => onChanged(_FavViewMode.mosaico),
            c: c,
          ),
        ],
      ),
    );
  }
}

class _ToggleBtn extends StatelessWidget {
  final IconData icon;
  final bool active;
  final VoidCallback onTap;
  final AppThemeColors c;
  const _ToggleBtn({required this.icon, required this.active, required this.onTap, required this.c});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: active ? AppColors.primary.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          color: active ? AppColors.primary : c.textMuted,
          size: 20,
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
