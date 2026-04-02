import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/shared/widgets/join_us_modal.dart';
import 'package:provider/provider.dart';
import '../providers/providers_provider.dart';
import '../widgets/service_card.dart';
import 'provider_detail_sheet.dart';
import '../../../../features/favorites/presentation/providers/favorites_provider.dart';

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

class _ProvidersView extends StatefulWidget {
  const _ProvidersView();

  @override
  State<_ProvidersView> createState() => _ProvidersViewState();
}

class _ProvidersViewState extends State<_ProvidersView>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      // ── Botón flotante "¡Quiero ser parte!" ────────────
      floatingActionButton: _JoinUsButton(),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      appBar: AppBar(
        backgroundColor: AppColors.bgDark,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.handshake_rounded,
                color: Colors.white,
                size: 16,
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              'OficioApp',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ],
        ),
        actions: [
          Consumer<ProvidersProvider>(
            builder: (_, prov, __) => IconButton(
              icon: Badge(
                isLabelVisible: prov.selectedCategory != null ||
                    prov.selectedAvailability != null ||
                    prov.onlyVerified,
                child: const Icon(
                  Icons.filter_list_rounded,
                  color: AppColors.textPrimary,
                ),
              ),
              onPressed: () => _showFilterSheet(context, prov),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          _SearchBar(),
          _CategoryChips(),
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

// ─── Botón flotante "¡Quiero ser parte!" ─────────────────

class _JoinUsButton extends StatefulWidget {
  @override
  State<_JoinUsButton> createState() => _JoinUsButtonState();
}

class _JoinUsButtonState extends State<_JoinUsButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnim;
  

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _pulseAnim = Tween<double>(begin: 1.0, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _pulseAnim,
      child: FloatingActionButton.extended(
        onPressed: () => JoinUsModal.show(context),
        backgroundColor: Colors.transparent,
        elevation: 0,
        label: Container(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFFFB347), Color(0xFFFF6B35)],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFFF6B35).withOpacity(0.4),
                blurRadius: 12,
                spreadRadius: 2,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.rocket_launch_rounded,
                  color: Colors.white, size: 18),
              SizedBox(width: 8),
              Text(
                '¡Quiero ser parte!',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Barra de búsqueda ─────────────────────────────────────

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
          prefixIcon: const Icon(
              Icons.search_rounded, color: AppColors.textMuted),
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
          fillColor: AppColors.bgCard,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none,
          ),
        ),
        onChanged: (v) {
          setState(() {});
          Future.delayed(const Duration(milliseconds: 500), () {
            if (_controller.text == v) {
              // ignore: use_build_context_synchronously
              context.read<ProvidersProvider>().setSearch(v);
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
        padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: prov.categories.length + 1,
        itemBuilder: (_, i) {
          if (i == 0) {
            final isSelected = prov.selectedCategory == null;
            return _CategoryChip(
              label: 'Todos',
              isSelected: isSelected,
              onTap: () => prov.setCategory(null),
            );
          }
          final cat = prov.categories[i - 1];
          final isSelected = prov.selectedCategory == cat.slug;
          return _CategoryChip(
            label: cat.name,
            isSelected: isSelected,
            onTap: () =>
                prov.setCategory(isSelected ? null : cat.slug),
          );
        },
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : AppColors.bgCard,
            borderRadius: BorderRadius.circular(20),
            border: isSelected
                ? null
                : Border.all(
                    color: Colors.white.withOpacity(0.08)),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : AppColors.textSecondary,
              fontSize: 13,
              fontWeight: isSelected
                  ? FontWeight.bold
                  : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Lista de proveedores ─────────────────────────────────

class _ProvidersList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final prov    = context.watch<ProvidersProvider>();
    final favProv = context.watch<FavoritesProvider>();

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
                style: const TextStyle(
                    color: AppColors.textSecondary)),
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
                style: TextStyle(
                    color: AppColors.textSecondary)),
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
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      // 100 de bottom para que el FAB no tape las tarjetas
      itemCount: prov.providers.length,
      itemBuilder: (context, index) {
        final provider = prov.providers[index].copyWith(
          isFavorite: favProv.isFavorite(prov.providers[index].id),
        );
        return ServiceCard(
          provider: provider,
          onTap: () => ProviderDetailSheet.show(context, provider),
          onFavoriteToggle: () {
            prov.toggleFavorite(provider.id);
            favProv.toggle(provider.id);
          },
        );
      },
    );
  }
}

// ─── Sheet de filtros ─────────────────────────────────────

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
              const Text(
                'Filtros',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
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
          const SizedBox(height: 12),
          const Text(
            'DISPONIBILIDAD',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: [
              _FilterChip(
                label: 'Disponible',
                isSelected: prov.selectedAvailability == 'DISPONIBLE',
                color: AppColors.available,
                onTap: () => prov.setAvailability(
                  prov.selectedAvailability == 'DISPONIBLE'
                      ? null
                      : 'DISPONIBLE',
                ),
              ),
              _FilterChip(
                label: 'Con demora',
                isSelected: prov.selectedAvailability == 'CON_DEMORA',
                color: AppColors.delayed,
                onTap: () => prov.setAvailability(
                  prov.selectedAvailability == 'CON_DEMORA'
                      ? null
                      : 'CON_DEMORA',
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
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
                    child: Text(
                      'Solo proveedores verificados',
                      style: TextStyle(color: AppColors.textPrimary),
                    ),
                  ),
                  if (prov.onlyVerified)
                    const Icon(Icons.check_rounded,
                        color: AppColors.verified, size: 20),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
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
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : AppColors.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? color.withOpacity(0.4)
                : Colors.transparent,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? color : AppColors.textSecondary,
            fontSize: 13,
            fontWeight:
                isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}