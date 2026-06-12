import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../chat/presentation/providers/chat_provider.dart';
import '../../../chat/presentation/screens/chat_screen.dart';
import '../../data/providers_repository.dart' show FeaturedGroup;
import '../../domain/models/provider_model.dart';
import '../screens/provider_detail_screen.dart';
import 'service_card.dart';

/// Lock per-provider para abrir el chat — evita dobles taps apilando rooms.
/// Propio del carrusel (el de la lista vive en otro archivo, library-private).
final Set<int> _carouselChatLock = {};

/// Carruseles de la Home Agrupada (FASE 2 · punto 1).
///
/// Pinta los `featured-grouped` del backend: por cada categoría padre, un
/// header + un carrusel horizontal de tiles [ServiceCardMosaic] (ancho fijo).
/// Se inserta ARRIBA del listado paginado "Explorar más" sin tocar su data —
/// solo presenta otra fuente ([ProvidersProvider.featuredGroups]).
class FeaturedCarousels extends StatelessWidget {
  final List<FeaturedGroup> groups;
  const FeaturedCarousels({super.key, required this.groups});

  /// Helper para inyectarlo como sliver en el [CustomScrollView] del home.
  static Widget sliver(List<FeaturedGroup> groups) =>
      SliverToBoxAdapter(child: FeaturedCarousels(groups: groups));

  @override
  Widget build(BuildContext context) {
    // Solo grupos con proveedores (un carrusel vacío no aporta nada).
    final visible = groups.where((g) => g.providers.isNotEmpty).toList();
    if (visible.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [for (final g in visible) _CarouselSection(group: g)],
    );
  }
}

class _CarouselSection extends StatelessWidget {
  final FeaturedGroup group;
  const _CarouselSection({required this.group});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final providers = group.providers;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header de categoría (acento degradado + nombre + conteo).
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
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
              Expanded(
                child: Text(
                  group.category.name,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '${providers.length}',
                style: TextStyle(color: c.textMuted, fontSize: 12),
              ),
            ],
          ),
        ),
        // Carrusel horizontal: tiles de ancho fijo, render lazy (.builder).
        SizedBox(
          height: 196,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: providers.length,
            itemBuilder: (ctx, i) => Padding(
              padding: const EdgeInsets.only(right: 10),
              child: SizedBox(
                width: 152,
                child: _CarouselCard(provider: providers[i]),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CarouselCard extends StatelessWidget {
  final ProviderModel provider;
  const _CarouselCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isOwnCard =
        auth.user != null &&
        provider.userId != null &&
        provider.userId == auth.user!.id;

    Future<void> openChat() async {
      if (_carouselChatLock.contains(provider.id)) return;
      final a = context.read<AuthProvider>();
      if (a.user == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Inicia sesión para chatear')),
        );
        return;
      }
      _carouselChatLock.add(provider.id);
      final chat = context.read<ChatProvider>();
      try {
        final roomId = await chat.openRoom(
          clientId: a.user!.id,
          providerId: provider.id,
        );
        if (!context.mounted) return;
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ChatScreen(
              roomId: roomId,
              seedTitle: provider.businessName,
              seedAvatarUrl: provider.coverImageUrl,
            ),
          ),
        );
      } catch (e) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('No se pudo abrir el chat: $e')));
      } finally {
        _carouselChatLock.remove(provider.id);
      }
    }

    return ServiceCardMosaic(
      provider: provider,
      isOwnCard: isOwnCard,
      onTap: () => ProviderDetailSheet.show(context, provider),
      onChat: isOwnCard ? null : openChat,
    );
  }
}
