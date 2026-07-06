import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../providers/favorites_provider.dart';
import '../../../providers_list/presentation/widgets/service_card.dart';
import '../../../providers_list/presentation/screens/provider_detail_screen.dart';
import '../../../auth/presentation/screens/login_screen.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../chat/presentation/providers/chat_provider.dart';
import '../../../chat/presentation/screens/chat_screen.dart';

/// Modos de visualización del listado de favoritos. Replican los tres
/// estilos consistentes con la pantalla principal:
///   - lista       → fila compacta (ServiceCardList)
///   - cuadricula  → grid 2 columnas (ServiceCardMosaic)
///   - mosaico     → tarjeta full-width compacta (ServiceCardContent)
enum _FavViewMode { lista, cuadricula, mosaico }

class FavoritesScreen extends StatefulWidget {
  final int? userId;
  const FavoritesScreen({super.key, this.userId});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  _FavViewMode _viewMode = _FavViewMode.lista;

  @override
  void initState() {
    super.initState();
    // Garantiza que los favoritos se carguen al entrar al tab, incluso si
    // el provider quedó en estado vacío tras un cambio de cuenta o el
    // primer toggle no disparó un reload completo.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || widget.userId == null) return;
      final favs = context.read<FavoritesProvider>();
      favs.initialize(widget.userId!);
    });
  }

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
                if (favProv.isLoading && favProv.favorites.isEmpty) {
                  return const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  );
                }
                if (favProv.favorites.isEmpty) {
                  return RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: favProv.loadFavorites,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        SizedBox(
                          height: MediaQuery.of(context).size.height * 0.15,
                        ),
                        _buildEmpty(c),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: favProv.loadFavorites,
                  child: _buildContent(favProv),
                );
              },
            ),
    );
  }

  Widget _buildContent(FavoritesProvider favProv) {
    final favs = favProv.favorites;

    switch (_viewMode) {
      case _FavViewMode.cuadricula:
        return GridView.builder(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.70,
          ),
          itemCount: favs.length,
          itemBuilder: (_, i) {
            final provider = favs[i].copyWith(isFavorite: true);
            return ServiceCardMosaic(
              provider: provider,
              onTap: () => ProviderDetailSheet.show(context, provider),
              onChat: () => _openChat(context, provider.id),
            );
          },
        );

      case _FavViewMode.mosaico:
        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          itemCount: favs.length,
          itemBuilder: (_, i) {
            final provider = favs[i].copyWith(isFavorite: true);
            return ServiceCardContent(
              provider: provider,
              onTap: () => ProviderDetailSheet.show(context, provider),
              onFavoriteToggle: () => favProv.toggle(provider.id),
              onChat: () => _openChat(context, provider.id),
            );
          },
        );

      case _FavViewMode.lista:
        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          itemCount: favs.length,
          itemBuilder: (_, i) {
            final provider = favs[i].copyWith(isFavorite: true);
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ServiceCardList(
                provider: provider,
                onTap: () => ProviderDetailSheet.show(context, provider),
                onFavoriteToggle: () => favProv.toggle(provider.id),
              ),
            );
          },
        );
    }
  }

  Future<void> _openChat(BuildContext context, int providerId) async {
    final auth = context.read<AuthProvider>();
    if (auth.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Inicia sesión para chatear')),
      );
      return;
    }
    final chat = context.read<ChatProvider>();
    final nav = Navigator.of(context);
    final scaffold = ScaffoldMessenger.of(context);
    try {
      final roomId = await chat.openRoom(
        clientId: auth.user!.id,
        providerId: providerId,
      );
      if (!mounted) return;
      nav.push(MaterialPageRoute(builder: (_) => ChatScreen(roomId: roomId)));
    } catch (e) {
      if (!mounted) return;
      scaffold.showSnackBar(
        SnackBar(content: Text('No se pudo abrir el chat: $e')),
      );
    }
  }

  Widget _buildEmpty(AppThemeColors c) {
    return Padding(
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
            child: Icon(
              Icons.favorite_border_rounded,
              color: AppColors.tintOn(AppColors.favorite, c.isDark),
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
            style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ── Toggle de modos (Lista / Cuadrícula / Mosaico) ────────

class _ViewToggle extends StatelessWidget {
  final _FavViewMode viewMode;
  final ValueChanged<_FavViewMode> onChanged;
  const _ViewToggle({required this.viewMode, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: c.border),
        ),
        padding: const EdgeInsets.all(2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _ToggleBtn(
              icon: Icons.view_list_rounded,
              tooltip: 'Lista',
              active: viewMode == _FavViewMode.lista,
              onTap: () => onChanged(_FavViewMode.lista),
              c: c,
            ),
            _ToggleBtn(
              icon: Icons.grid_view_rounded,
              tooltip: 'Cuadrícula',
              active: viewMode == _FavViewMode.cuadricula,
              onTap: () => onChanged(_FavViewMode.cuadricula),
              c: c,
            ),
            _ToggleBtn(
              icon: Icons.view_stream_rounded,
              tooltip: 'Mosaico',
              active: viewMode == _FavViewMode.mosaico,
              onTap: () => onChanged(_FavViewMode.mosaico),
              c: c,
            ),
          ],
        ),
      ),
    );
  }
}

class _ToggleBtn extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final bool active;
  final VoidCallback onTap;
  final AppThemeColors c;
  const _ToggleBtn({
    required this.icon,
    required this.tooltip,
    required this.active,
    required this.onTap,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          decoration: BoxDecoration(
            color: active
                ? AppColors.primary.withValues(alpha: 0.15)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            icon,
            color: active ? AppColors.primary : c.textMuted,
            size: 18,
          ),
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
                // rootNavigator: el login debe salir del shell del
                // cliente para no dejar visible la bottom nav debajo.
                onPressed: () => Navigator.of(
                  context,
                  rootNavigator: true,
                ).push(MaterialPageRoute(builder: (_) => const LoginScreen())),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: AppColors.onSolid(AppColors.primary),
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
