import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../chat/presentation/providers/chat_provider.dart';
import '../../../chat/presentation/screens/chat_screen.dart';
import '../../../favorites/presentation/providers/favorites_provider.dart';
import '../../../provider_dashboard/presentation/screens/provider_panel.dart';
import '../../../showcase/showcase_data.dart';
import '../../../showcase/showcase_overlay.dart';
import '../../domain/models/provider_model.dart';
import '../providers/providers_provider.dart';
import '../screens/provider_detail_screen.dart';
import '../sheets/filter_sheet.dart';
import 'login_required_dialog.dart';
import 'service_card.dart';

/// Lock per-provider para evitar que múltiples taps en "enviar mensaje"
/// abran múltiples ChatScreen apilados antes de que el primero responda.
/// Vive a nivel de library (no State) porque el widget es StatelessWidget
/// y se reconstruye en cada tap. Se libera en el finally del openChat.
final Set<int> _openingChatLock = {};

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
    final c = context.colors;
    final prov = context.watch<ProvidersProvider>();
    final favProv = context.watch<FavoritesProvider>();
    final auth = context.watch<AuthProvider>();

    if (prov.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
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
              child: const Text(
                'Reintentar',
                style: TextStyle(color: AppColors.primary),
              ),
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
                hasLocation
                    ? Icons.location_off_rounded
                    : Icons.search_off_rounded,
                color: c.textMuted,
                size: 48,
              ),
              const SizedBox(height: 12),
              Text(
                hasLocation
                    ? 'No hay servicios en tu zona aún'
                    : 'No encontramos resultados',
                style: TextStyle(
                  color: c.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
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
                  onPressed: () {
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: Colors.transparent,
                      builder: (_) => FilterSheet(prov: prov),
                    );
                  },
                  icon: const Icon(
                    Icons.close_rounded,
                    color: AppColors.primary,
                    size: 16,
                  ),
                  label: const Text(
                    'Quitar filtro de ubicación',
                    style: TextStyle(color: AppColors.primary),
                  ),
                )
              else
                TextButton(
                  onPressed: prov.clearFilters,
                  child: const Text(
                    'Limpiar filtros',
                    style: TextStyle(color: AppColors.primary),
                  ),
                ),
            ],
          ),
        ),
      );
    }

    // ── Fase 2: agrupación VISUAL en secciones (sin tocar la data) ──
    // Bucketing de PRESENTACIÓN sobre la MISMA lista ya filtrada (`prov.
    // providers`). No se altera nada del provider/API; solo se decide en qué
    // sección se renderiza cada item, de forma disjunta (sin duplicados).
    final all = prov.providers;
    final ranked = [...all]
      ..sort((a, b) {
        final byReviews = b.totalReviews.compareTo(a.totalReviews);
        return byReviews != 0
            ? byReviews
            : b.averageRating.compareTo(a.averageRating);
      });
    // "Más buscados": top por concurrencia (reseñas + rating). Se omite si la
    // lista es muy corta para no dejar secciones casi vacías.
    final topCount = all.length <= 4 ? 0 : (all.length < 8 ? 3 : 6);
    final topIds = ranked.take(topCount).map((p) => p.id).toSet();
    final mostSearched = ranked.take(topCount).toList();
    final rest = all.where((p) => !topIds.contains(p.id)).toList();
    final professionals = rest
        .where((p) => p.type == ProviderType.oficio)
        .toList();
    final businesses = rest
        .where((p) => p.type == ProviderType.negocio)
        .toList();

    final sections = <(String, List<ProviderModel>)>[
      if (mostSearched.isNotEmpty) ('Más buscados', mostSearched),
      if (professionals.isNotEmpty) ('Profesionales', professionals),
      if (businesses.isNotEmpty) ('Negocios', businesses),
    ];

    // Barra superior: total + toggle de vista (el toggle se mantiene intacto;
    // los títulos ahora los llevan los headers de sección).
    final headerSliver = SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 12, 2),
        child: Row(
          children: [
            Expanded(
              child: Text(
                '${all.length} ${all.length == 1 ? 'servicio' : 'servicios'}',
                style: TextStyle(color: c.textMuted, fontSize: 12),
              ),
            ),
            const _ViewModeToggle(),
          ],
        ),
      ),
    );

    // Per-item builder (lista / detalles / contenido). Recibe el provider y
    // si es la PRIMERA tarjeta global (para el target del showcase).
    Widget buildItem(ProviderModel base, bool isFirst) {
      final p = base.copyWith(isFavorite: favProv.isFavorite(base.id));
      final isOwnCard =
          auth.user != null && p.userId != null && p.userId == auth.user!.id;

      void handleFav() {
        if (auth.user == null) {
          showLoginRequiredDialog(context);
          return;
        }
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

      // `rootNavigator: true` empuja ProviderPanel POR ENCIMA del AppShell
      // (StatefulShellRoute) — sin esto la nueva ruta vive dentro del
      // shell y se sigue viendo la bottom nav del cliente debajo.
      void goToDashboard() => Navigator.of(context, rootNavigator: true).push(
        MaterialPageRoute(
          builder: (_) => ProviderPanel(
            providerType: p.type == ProviderType.negocio ? 'NEGOCIO' : 'OFICIO',
          ),
        ),
      );

      Future<void> openChat() async {
        // Guard: si ya hay una operación en vuelo para este provider,
        // ignorar taps adicionales. Antes 3 taps = 3 ChatScreen apilados;
        // al cerrar el primero quedaban 2 abajo persistiendo.
        if (_openingChatLock.contains(p.id)) return;
        final auth = context.read<AuthProvider>();
        if (auth.user == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Inicia sesión para chatear')),
          );
          return;
        }
        _openingChatLock.add(p.id);
        final chat = context.read<ChatProvider>();
        try {
          final roomId = await chat.openRoom(
            clientId: auth.user!.id,
            providerId: p.id,
          );
          if (!context.mounted) return;
          await Navigator.of(context).push(
            MaterialPageRoute(
              // Pasamos seeds para que el header del ChatScreen muestre
              // nombre + foto del provider de INMEDIATO, sin esperar a
              // que loadRooms termine de poblar el cache.
              builder: (_) => ChatScreen(
                roomId: roomId,
                seedTitle: p.businessName,
                seedAvatarUrl: p.coverImageUrl,
              ),
            ),
          );
        } catch (e) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('No se pudo abrir el chat: $e')),
          );
        } finally {
          _openingChatLock.remove(p.id);
        }
      }

      final card = switch (prov.viewMode) {
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
          onChat: isOwnCard ? null : openChat,
        ),
        _ => ServiceCardDefault(
          provider: p,
          isOwnCard: isOwnCard,
          onTap: () => ProviderDetailSheet.show(context, p),
          onGoToDashboard: isOwnCard ? goToDashboard : null,
          onFavoriteToggle: isOwnCard ? null : handleFav,
          onChat: isOwnCard ? null : openChat,
        ),
      };

      // Solo la PRIMERA tarjeta global es el target del paso "Tarjeta del
      // proveedor" — el spotlight necesita una sola key por paso.
      if (isFirst) {
        final isGuest = auth.isGuest || auth.user == null;
        return ShowcaseTarget(
          step: (isGuest ? kShowcaseStepsGuest : kShowcaseStepsRegistered)
              .firstWhere((s) => s.key == kShowcaseProviderCard),
          isLast: isLastShowcaseStep(kShowcaseProviderCard, isGuest: isGuest),
          targetHeight: 200,
          targetWidth: double.infinity,
          child: card,
        );
      }
      return card;
    }

    final isMosaicos = prov.viewMode == ViewMode.mosaicos;

    // Header de sección (acento + título + conteo).
    SliverToBoxAdapter sectionHeader(String title, int count) =>
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                Container(
                  width: 3,
                  height: 16,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.amber, AppColors.primary],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '$count',
                  style: TextStyle(color: c.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
        );

    // Sliver de items de una sección, respetando el viewMode (grid/list).
    // `sectionStart` = índice global del primer item → identifica la tarjeta
    // global 0 para el showcase. `.builder` mantiene el render lazy.
    Widget itemsSliver(List<ProviderModel> items, int sectionStart) {
      if (isMosaicos) {
        return SliverPadding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 4),
          sliver: SliverGrid.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 0.70,
            ),
            itemCount: items.length,
            itemBuilder: (ctx, i) => buildItem(items[i], sectionStart + i == 0),
          ),
        );
      }
      return SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
        sliver: SliverList.builder(
          itemCount: items.length,
          itemBuilder: (ctx, i) => buildItem(items[i], sectionStart + i == 0),
        ),
      );
    }

    final slivers = <Widget>[headerSliver];
    var globalStart = 0;
    for (final (title, items) in sections) {
      slivers.add(sectionHeader(title, items.length));
      slivers.add(itemsSliver(items, globalStart));
      globalStart += items.length;
    }
    // Colchón inferior para que la FAB/bottom-nav no tape el último item.
    slivers.add(const SliverToBoxAdapter(child: SizedBox(height: 100)));

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: prov.loadProviders,
      child: CustomScrollView(slivers: slivers),
    );
  }
}

// ─── Toggle de modo de vista ──────────────────────────────

class _ViewModeToggle extends StatelessWidget {
  const _ViewModeToggle();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final prov = context.watch<ProvidersProvider>();

    const modes = [
      (ViewMode.lista, Icons.view_list_rounded, 'Lista'),
      (ViewMode.detalles, Icons.view_agenda_rounded, 'Detalles'),
      (ViewMode.mosaicos, Icons.grid_view_rounded, 'Mosaicos'),
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
              width: 30,
              height: 30,
              margin: const EdgeInsets.only(left: 4),
              decoration: BoxDecoration(
                color: active
                    ? AppColors.primary.withValues(alpha: 0.15)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(7),
                border: Border.all(
                  color: active
                      ? AppColors.primary.withValues(alpha: 0.45)
                      : Colors.transparent,
                ),
              ),
              child: Icon(
                icon,
                size: 15,
                color: active ? AppColors.primary : c.textMuted,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
