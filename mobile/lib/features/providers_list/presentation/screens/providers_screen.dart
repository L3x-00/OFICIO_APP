import 'package:flutter/material.dart';
import 'package:mobile/features/favorites/presentation/providers/favorites_provider.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../providers/providers_provider.dart';
import '../widgets/service_card.dart';
import 'provider_detail_sheet.dart';

class ProvidersScreen extends StatelessWidget {
  const ProvidersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ProvidersProvider()..init(),
      child: const _ProvidersView(),
    );
  }
}

class _ProvidersView extends StatelessWidget {
  const _ProvidersView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      appBar: AppBar(
        backgroundColor: AppColors.bgDark,
        elevation: 0,
        title: const Text(
          'Servicios cerca de ti',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          Consumer<ProvidersProvider>(
            builder: (_, prov, __) => IconButton(
              icon: Badge(
                isLabelVisible: prov.selectedCategory != null ||
                    prov.selectedAvailability != null ||
                    prov.onlyVerified,
                label: const Text(''),
                child: const Icon(Icons.filter_list_rounded,
                    color: AppColors.textPrimary),
              ),
              onPressed: () => _showFilterSheet(context, prov),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Barra de búsqueda
          _SearchBar(),
          // Chips de categorías
          _CategoryChips(),
          // Lista de proveedores
          Expanded(child: _ProvidersList()),
        ],
      ),
    );
  }

  void _showFilterSheet(BuildContext context, ProvidersProvider prov) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => ChangeNotifierProvider.value(
        value: prov,
        child: const _FilterSheet(),
      ),
    );
  }
}

// ─── Barra de búsqueda ────────────────────────────────────

class _SearchBar extends StatefulWidget {
  @override
  State<_SearchBar> createState() => _SearchBarState();
}

class _SearchBarState extends State<_SearchBar> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: TextField(
        controller: _controller,
        style: const TextStyle(color: AppColors.textPrimary),
        decoration: InputDecoration(
          hintText: 'Buscar electricistas, pintores...',
          hintStyle: const TextStyle(color: AppColors.textMuted),
          prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textMuted),
          suffixIcon: _controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, color: AppColors.textMuted),
                  onPressed: () {
                    _controller.clear();
                    context.read<ProvidersProvider>().setSearch('');
                  },
                )
              : null,
          filled: true,
          fillColor: AppColors.bgInput,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none,
          ),
        ),
        onChanged: (value) {
          setState(() {});
          // Búsqueda con pequeño delay
          Future.delayed(const Duration(milliseconds: 500), () {
            if (_controller.text == value) {
              context.read<ProvidersProvider>().setSearch(value);
            }
          });
        },
      ),
    );
  }
}

// ─── Chips de categorías ──────────────────────────────────

class _CategoryChips extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final prov = context.watch<ProvidersProvider>();

    if (prov.categories.isEmpty) return const SizedBox(height: 8);

    return SizedBox(
      height: 52,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: prov.categories.length + 1, // +1 para "Todos"
        itemBuilder: (context, index) {
          if (index == 0) {
            // Chip "Todos"
            final isSelected = prov.selectedCategory == null;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => prov.setCategory(null),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : AppColors.bgInput,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Todos',
                    style: TextStyle(
                      color: isSelected ? Colors.white : AppColors.textSecondary,
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ),
              ),
            );
          }

          final cat = prov.categories[index - 1];
          final isSelected = prov.selectedCategory == cat.slug;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => prov.setCategory(isSelected ? null : cat.slug),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : AppColors.bgInput,
                  borderRadius: BorderRadius.circular(20),
                  border: isSelected
                      ? null
                      : Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Text(
                  cat.name,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─── Lista de proveedores ─────────────────────────────────

class _ProvidersList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final prov = context.watch<ProvidersProvider>();

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
            const Icon(Icons.wifi_off_rounded,
                color: AppColors.textMuted, size: 48),
            const SizedBox(height: 12),
            Text(prov.errorMessage,
                style: const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 16),
            TextButton(
              onPressed: prov.loadProviders,
              child: const Text('Reintentar',
                  style: TextStyle(color: AppColors.primary)),
            ),
          ],
        ),
      );
    }

    if (prov.providers.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.search_off_rounded,
                color: AppColors.textMuted, size: 48),
            const SizedBox(height: 12),
            const Text('No encontramos servicios',
                style: TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 16),
            TextButton(
              onPressed: prov.clearFilters,
              child: const Text('Limpiar filtros',
                  style: TextStyle(color: AppColors.primary)),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: prov.providers.length,
      itemBuilder: (context, index) {
        final provider = prov.providers[index];
        return ServiceCard(
          provider: provider,
          onTap: () => ProviderDetailSheet.show(context, provider),
          onFavoriteToggle: () {
            // Actualiza el estado visual local
            prov.toggleFavorite(provider.id);
            // También persiste en BD y actualiza el FavoritesProvider global
            context.read<FavoritesProvider>().toggle(provider.id);
          },
        );
      },
    );
  }
}

// ─── Sheet de filtros avanzados ───────────────────────────

class _FilterSheet extends StatelessWidget {
  const _FilterSheet();

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<ProvidersProvider>();

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Filtros', style: TextStyle(
                color: AppColors.textPrimary, fontSize: 18,
                fontWeight: FontWeight.bold,
              )),
              TextButton(
                onPressed: () {
                  prov.clearFilters();
                  Navigator.pop(context);
                },
                child: const Text('Limpiar',
                    style: TextStyle(color: AppColors.primary)),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Disponibilidad
          const Text('Disponibilidad', style: TextStyle(
              color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              _FilterChip(
                label: 'Disponible',
                isSelected: prov.selectedAvailability == 'DISPONIBLE',
                color: AppColors.available,
                onTap: () => prov.setAvailability(
                  prov.selectedAvailability == 'DISPONIBLE' ? null : 'DISPONIBLE',
                ),
              ),
              _FilterChip(
                label: 'Con demora',
                isSelected: prov.selectedAvailability == 'CON_DEMORA',
                color: AppColors.delayed,
                onTap: () => prov.setAvailability(
                  prov.selectedAvailability == 'CON_DEMORA' ? null : 'CON_DEMORA',
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Solo verificados
          GestureDetector(
            onTap: () {
              prov.toggleVerified();
              Navigator.pop(context);
            },
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: prov.onlyVerified
                    ? AppColors.verified.withOpacity(0.1)
                    : AppColors.bgInput,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: prov.onlyVerified
                      ? AppColors.verified.withOpacity(0.4)
                      : Colors.white.withOpacity(0.08),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.verified_rounded,
                    color: prov.onlyVerified
                        ? AppColors.verified
                        : AppColors.textMuted,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text('Solo proveedores verificados',
                        style: TextStyle(color: AppColors.textPrimary)),
                  ),
                  if (prov.onlyVerified)
                    const Icon(Icons.check_rounded,
                        color: AppColors.verified, size: 20),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color color;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : AppColors.bgInput,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color.withOpacity(0.4) : Colors.transparent,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? color : AppColors.textSecondary,
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}