import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../chat/presentation/providers/chat_provider.dart';
import '../../../chat/presentation/screens/chat_screen.dart';
import '../../../favorites/presentation/providers/favorites_provider.dart';
import '../../../provider_dashboard/presentation/screens/provider_panel.dart';
import '../../domain/models/provider_model.dart';
import '../providers/providers_provider.dart';
import '../screens/provider_detail_screen.dart';
import 'login_required_dialog.dart';
import 'service_card.dart';

/// Lista de proveedores filtrada y ordenada por el [ProvidersProvider].
///
/// Adapta el widget renderizado al `viewMode` del provider:
///   - lista     → [ServiceCardList]
///   - detalles  → [ServiceCard]      (default)
///   - mosaicos  → [ServiceCardMosaic] (en grid 2 col)
///   - contenido → [ServiceCardContent]
class ProvidersListView extends StatelessWidget {
  const ProvidersListView({super.key});

  @override
  Widget build(BuildContext context) {
    final c       = context.colors;
    final prov    = context.watch<ProvidersProvider>();
    final favProv = context.watch<FavoritesProvider>();
    final auth    = context.watch<AuthProvider>();

    if (prov.isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }

    if (prov.hasError) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, color: c.textMuted, size: 48),
            const SizedBox(height: 12),
            Text(prov.errorMessage, style: TextStyle(color: c.textSecondary)),
            const SizedBox(height: 16),
            TextButton(
              onPressed: prov.loadProviders,
              child: const Text('Reintentar', style: TextStyle(color: AppColors.primary)),
            ),
          ],
        ),
      );
    }

    if (prov.providers.isEmpty) {
      // Empty state distinto cuando la causa es el filtro de ubicación —
      // el usuario debe entender que su zona no tiene proveedores aún
      // y que puede ampliar el área desde aquí mismo.
      final hasLocation = prov.department != null;
      final locationLabel = [
        if (prov.district != null) prov.district!,
        if (prov.province != null) prov.province!,
        if (prov.department != null) prov.department!,
      ].join(' · ');

      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                hasLocation ? Icons.location_off_rounded : Icons.search_off_rounded,
                color: c.textMuted,
                size: 48,
              ),
              const SizedBox(height: 12),
              Text(
                hasLocation
                    ? 'No hay servicios en tu zona aún'
                    : 'No encontramos resultados',
                style: TextStyle(color: c.textSecondary, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                hasLocation
                    ? 'Buscamos en: $locationLabel.\nAmplía tu zona o quita el filtro para ver más.'
                    : 'Prueba cambiando los filtros activos',
                style: TextStyle(color: c.textMuted, fontSize: 12, height: 1.4),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              if (hasLocation)
                TextButton.icon(
                  onPressed: () =>
                      context.read<ProvidersProvider>().setUserLocation(),
                  icon: const Icon(Icons.public_rounded,
                      color: AppColors.primary, size: 16),
                  label: const Text(
                    'Ver servicios de todo el Perú',
                    style: TextStyle(color: AppColors.primary),
                  ),
                )
              else
                TextButton(
                  onPressed: prov.clearFilters,
                  child: const Text('Limpiar filtros',
                      style: TextStyle(color: AppColors.primary)),
                ),
            ],
          ),
        ),
      );
    }

    // Título dinámico
    final typeLabel = switch (prov.selectedType) {
      'PROFESSIONAL' => 'Profesionales',
      'BUSINESS'     => 'Negocios',
      _              => 'Servicios',
    };
    String catLabel = '';
    if (prov.selectedCategory != null) {
      for (final parent in prov.categories) {
        final match = parent.children.where((s) => s.slug == prov.selectedCategory);
        if (match.isNotEmpty) { catLabel = ' · ${match.first.name}'; break; }
      }
    } else if (prov.expandedParentSlug != null) {
      catLabel = ' · ${prov.expandedParent?.name ?? ''}';
    }
    final sectionTitle = '$typeLabel$catLabel';

    // Header row: title + count + view mode toggle
    final headerSliver = SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 12, 8),
        child: Row(
          children: [
            Container(
              width: 3, height: 18,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.amber, AppColors.primary],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                sectionTitle,
                style: TextStyle(color: c.textPrimary, fontSize: 15, fontWeight: FontWeight.bold),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Text(
              '${prov.providers.length}',
              style: TextStyle(color: c.textMuted, fontSize: 12),
            ),
            const SizedBox(width: 8),
            const _ViewModeToggle(),
          ],
        ),
      ),
    );

    // Per-item builder (lista / detalles / contenido)
    Widget buildItem(int i) {
      final p = prov.providers[i].copyWith(
        isFavorite: favProv.isFavorite(prov.providers[i].id),
      );
      final isOwnCard = auth.user != null && p.userId != null && p.userId == auth.user!.id;

      void handleFav() {
        if (auth.user == null) { showLoginRequiredDialog(context); return; }
        final adding = !favProv.isFavorite(p.id);
        prov.toggleFavorite(p.id);
        favProv.toggle(p.id).then((ok) {
          if (!context.mounted) return;
          if (!ok) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(favProv.error ?? 'Error al actualizar favorito'),
                backgroundColor: Colors.red,
              ),
            );
          } else if (adding) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('${p.businessName} se añadió a favoritos'),
                duration: const Duration(seconds: 2),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        });
      }

      void goToDashboard() => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ProviderPanel(
          providerType: p.type == ProviderType.negocio ? 'NEGOCIO' : 'OFICIO',
        ),
      ));

      Future<void> openChat() async {
        final auth = context.read<AuthProvider>();
        if (auth.user == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Inicia sesión para chatear')),
          );
          return;
        }
        final chat = context.read<ChatProvider>();
        try {
          final roomId = await chat.openRoom(
            clientId:   auth.user!.id,
            providerId: p.id,
          );
          if (!context.mounted) return;
          Navigator.of(context).push(MaterialPageRoute(
            builder: (_) => ChatScreen(roomId: roomId),
          ));
        } catch (e) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('No se pudo abrir el chat: $e')),
          );
        }
      }

      return switch (prov.viewMode) {
        ViewMode.lista => ServiceCardList(
          provider: p,
          isOwnCard: isOwnCard,
          onTap: () => ProviderDetailSheet.show(context, p),
          onFavoriteToggle: isOwnCard ? null : handleFav,
        ),
        ViewMode.contenido => ServiceCardContent(
          provider: p,
          isOwnCard: isOwnCard,
          onTap: () => ProviderDetailSheet.show(context, p),
          onFavoriteToggle: isOwnCard ? null : handleFav,
          onGoToDashboard: isOwnCard ? goToDashboard : null,
          onChat: isOwnCard ? null : openChat,
        ),
        ViewMode.mosaicos => ServiceCardMosaic(
          provider: p,
          isOwnCard: isOwnCard,
          onTap: () => ProviderDetailSheet.show(context, p),
        ),
        _ => ServiceCard(
          provider: p,
          isOwnCard: isOwnCard,
          onTap: () => ProviderDetailSheet.show(context, p),
          onGoToDashboard: isOwnCard ? goToDashboard : null,
          onFavoriteToggle: isOwnCard ? null : handleFav,
          onChat: isOwnCard ? null : openChat,
        ),
      };
    }

    final isMosaicos = prov.viewMode == ViewMode.mosaicos;
    final contentSliver = isMosaicos
        ? SliverPadding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 100),
            sliver: SliverGrid.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 0.70,
              ),
              itemCount: prov.providers.length,
              itemBuilder: (ctx, i) => buildItem(i),
            ),
          )
        : SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
            sliver: SliverList.builder(
              itemCount: prov.providers.length,
              itemBuilder: (ctx, i) => buildItem(i),
            ),
          );

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: prov.loadProviders,
      child: CustomScrollView(
        slivers: [headerSliver, contentSliver],
      ),
    );
  }
}

// ─── Toggle de modo de vista ──────────────────────────────

class _ViewModeToggle extends StatelessWidget {
  const _ViewModeToggle();

  @override
  Widget build(BuildContext context) {
    final c    = context.colors;
    final prov = context.watch<ProvidersProvider>();

    const modes = [
      (ViewMode.lista,     Icons.view_list_rounded,   'Lista'),
      (ViewMode.detalles,  Icons.view_agenda_rounded, 'Detalles'),
      (ViewMode.mosaicos,  Icons.grid_view_rounded,   'Mosaicos'),
      (ViewMode.contenido, Icons.view_stream_rounded, 'Contenido'),
    ];

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: modes.map((entry) {
        final (mode, icon, label) = entry;
        final active = prov.viewMode == mode;
        return Tooltip(
          message: label,
          child: GestureDetector(
            onTap: () => context.read<ProvidersProvider>().setViewMode(mode),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 30, height: 30,
              margin: const EdgeInsets.only(left: 4),
              decoration: BoxDecoration(
                color: active ? AppColors.primary.withValues(alpha: 0.15) : Colors.transparent,
                borderRadius: BorderRadius.circular(7),
                border: Border.all(
                  color: active ? AppColors.primary.withValues(alpha: 0.45) : Colors.transparent,
                ),
              ),
              child: Icon(icon, size: 15,
                color: active ? AppColors.primary : c.textMuted),
            ),
          ),
        );
      }).toList(),
    );
  }
}
