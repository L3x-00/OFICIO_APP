import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/join_us_modal.dart';
import 'package:provider/provider.dart';
import '../providers/providers_provider.dart';
import '../widgets/service_card.dart';
import 'provider_detail_sheet.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../features/auth/presentation/screens/login_screen.dart';
import '../../../../features/favorites/presentation/providers/favorites_provider.dart';
import '../../../../features/provider_dashboard/presentation/screens/provider_panel.dart';

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

// ─── Vista principal ──────────────────────────────────────

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
    final c = context.colors;

    return Scaffold(
      backgroundColor: c.bg,
      floatingActionButton: _JoinUsButton(),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        // ── Botón refresh (esquina superior izquierda) ─────
        leading: Consumer<ProvidersProvider>(
          builder: (_, prov, __) => IconButton(
            tooltip: 'Actualizar lista',
            icon: prov.isLoading
                ? SizedBox(
                    width: 18, height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: c.textPrimary,
                    ),
                  )
                : Icon(Icons.refresh_rounded, color: c.textPrimary),
            onPressed: prov.isLoading ? null : prov.loadProviders,
          ),
        ),
        title: Row(
          children: [
            Image.asset(
              c.isDark
                  ? 'assets/images/logo/logo_dark.png'
                  : 'assets/images/logo/logo_light.png',
              width: 32,
              height: 32,
              filterQuality: FilterQuality.high,
            ),
            const SizedBox(width: 10),
            Text(
              'ConfiServ',
              style: TextStyle(
                color: c.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ],
        ),
        actions: [
          Consumer<ProvidersProvider>(
            builder: (_, prov, __) => IconButton(
              tooltip: 'Filtros avanzados',
              icon: Badge(
                isLabelVisible: prov.hasActiveFilters,
                backgroundColor: AppColors.amber,
                child: Icon(Icons.tune_rounded, color: c.textPrimary),
              ),
              onPressed: () => _showFilterSheet(context, prov),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          _GreetingHeader(),
          _SearchBar(),
          // ── Chips unificados: tipo + categoría ────────────
          _FilterBar(),
          const Expanded(child: _ProvidersList()),
        ],
      ),
    );
  }

  void _showFilterSheet(BuildContext context, ProvidersProvider prov) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FilterSheet(prov: prov),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// BARRA DE FILTROS UNIFICADA (tipo + categoría)
// ═══════════════════════════════════════════════════════════

class _FilterBar extends StatelessWidget {
  const _FilterBar();

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<ProvidersProvider>();

    // Definición de los chips de tipo
    final typeChips = [
      _TypeChipData(
        label: 'Todos',
        icon: Icons.apps_rounded,
        value: null,
        activeColor: AppColors.amber,
      ),
      _TypeChipData(
        label: 'Profesionales',
        icon: Icons.handyman_rounded,
        value: 'PROFESSIONAL',
        activeColor: AppColors.primary,
      ),
      _TypeChipData(
        label: 'Negocios',
        icon: Icons.storefront_rounded,
        value: 'BUSINESS',
        activeColor: const Color(0xFF8E2DE2),
      ),
    ];

    // Calcula el total: tipos + separador (si hay categorías) + categorías
    final catCount  = prov.categories.length;
    // Solo mostramos separador si existen categorías
    final hasCats   = catCount > 0;
    final totalItems = typeChips.length + (hasCats ? 1 + catCount : 0);

    return SizedBox(
      height: 52,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: totalItems,
        itemBuilder: (_, i) {
          // ── Chips de tipo (0, 1, 2) ───────────────────
          if (i < typeChips.length) {
            final t = typeChips[i];
            final isSelected = prov.selectedType == t.value;
            return _TypeChip(
              data: t,
              isSelected: isSelected,
              onTap: () => prov.setType(isSelected && t.value != null ? null : t.value),
            );
          }

          // ── Separador visual ──────────────────────────
          if (i == typeChips.length) {
            return Padding(
              padding: const EdgeInsets.only(right: 12, left: 4),
              child: Center(
                child: Container(
                  width: 1.5,
                  height: 20,
                  color: context.colors.border,
                ),
              ),
            );
          }

          // ── Chips de categoría (sin chip "Todas" extra) ─
          final catIndex = i - typeChips.length - 1; // offset por separador
          final cat = prov.categories[catIndex];
          final isCatSelected = prov.selectedCategory == cat.slug;
          return _CategoryChip(
            label: cat.name,
            isSelected: isCatSelected,
            // Toca de nuevo para deseleccionar
            onTap: () => prov.setCategory(isCatSelected ? null : cat.slug),
          );
        },
      ),
    );
  }
}

// ── Chip de tipo (Todos / Profesionales / Negocios) ────────

class _TypeChipData {
  final String label;
  final IconData icon;
  final String? value;
  final Color activeColor;
  const _TypeChipData({
    required this.label,
    required this.icon,
    required this.value,
    required this.activeColor,
  });
}

class _TypeChip extends StatelessWidget {
  final _TypeChipData data;
  final bool isSelected;
  final VoidCallback onTap;
  const _TypeChip({required this.data, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? data.activeColor
                : data.activeColor.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? data.activeColor
                  : data.activeColor.withValues(alpha: 0.25),
              width: isSelected ? 0 : 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                data.icon,
                size: 13,
                color: isSelected ? Colors.white : data.activeColor,
              ),
              const SizedBox(width: 5),
              Text(
                data.label,
                style: TextStyle(
                  color: isSelected ? Colors.white : data.activeColor,
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Chip de categoría ──────────────────────────────────────

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  const _CategoryChip({required this.label, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : c.bgCard,
            borderRadius: BorderRadius.circular(20),
            border: isSelected
                ? null
                : Border.all(color: c.border),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : c.textSecondary,
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// BOTÓN FLOTANTE DINÁMICO
// ═══════════════════════════════════════════════════════════

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
    final auth = context.watch<AuthProvider>();
    final isProvider = auth.user?.isProvider ?? false;

    // Si ya tiene un perfil aprobado → no mostrar ningún FAB de acción
    if (auth.hasApprovedProvider) {
      _pulseController.stop();
      return _buildProviderButton(context);
    }

    // Si es proveedor (aún pendiente) → mostrar panel
    if (isProvider) {
      _pulseController.stop();
      return _buildProviderButton(context);
    }

    if (!_pulseController.isAnimating) _pulseController.repeat(reverse: true);
    return _buildJoinUsButton(context);
  }

  Widget _buildProviderButton(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: () => _openProviderPanel(context),
      backgroundColor: Colors.transparent,
      elevation: 0,
      label: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1E88E5), Color(0xFF1565C0)],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1E88E5).withOpacity(0.4),
              blurRadius: 12, spreadRadius: 2, offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.dashboard_rounded, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text('Ir a mi panel',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildJoinUsButton(BuildContext context) {
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
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFFF6B35).withOpacity(0.4),
                blurRadius: 12, spreadRadius: 2, offset: const Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 18),
              SizedBox(width: 8),
              Text('¡Quiero ser parte!',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }

  void _openProviderPanel(BuildContext context) {
    final auth = context.read<AuthProvider>();
    // Ir directamente al perfil activo (o al único que tiene)
    final type = auth.activeProfileType
        ?? (auth.hasOficioProfile ? 'OFICIO' : 'NEGOCIO');
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProviderPanel(providerType: type),
      ),
    );
  }
}

// ─── Diálogo de login requerido ───────────────────────────

void _showLoginRequiredDialog(BuildContext context) {
  final c = context.colors;
  showDialog(
    context: context,
    builder: (_) => AlertDialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text('Inicia sesión para continuar',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 17)),
      content: Text('Necesitas una cuenta para agregar favoritos y dejar reseñas.',
          style: TextStyle(color: c.textSecondary, height: 1.5)),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Ahora no', style: TextStyle(color: c.textMuted)),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => const LoginScreen(initialMode: AuthMode.register),
            ));
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: const Text('Registrarme', style: TextStyle(color: Colors.white)),
        ),
      ],
    ),
  );
}

// ─── Encabezado de saludo ─────────────────────────────────

class _GreetingHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final firstName = user?.firstName ?? (auth.isGuest ? null : 'Usuario');

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  firstName != null ? '¡Hola, $firstName!' : '¡Explora los servicios!',
                  style: TextStyle(color: c.textPrimary, fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 2),
                Text(
                  firstName != null ? '¿Qué necesitas hoy?' : 'Contrata sin registro • Es gratis',
                  style: TextStyle(color: c.textSecondary, fontSize: 13),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: c.bgCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: c.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.location_on_rounded, color: AppColors.amber, size: 14),
                const SizedBox(width: 4),
                Text('Cerca de ti',
                    style: TextStyle(color: c.textSecondary, fontSize: 11, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
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
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: TextField(
        controller: _controller,
        style: TextStyle(color: c.textPrimary),
        decoration: InputDecoration(
          hintText: 'Buscar electricistas, pintores...',
          hintStyle: TextStyle(color: c.textMuted),
          prefixIcon: Icon(Icons.search_rounded, color: c.textMuted),
          suffixIcon: _controller.text.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.clear, color: c.textMuted),
                  onPressed: () {
                    _controller.clear();
                    context.read<ProvidersProvider>().setSearch('');
                  },
                )
              : null,
          filled: true,
          fillColor: c.bgCard,
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

// ─── Lista de proveedores ─────────────────────────────────

class _ProvidersList extends StatelessWidget {
  const _ProvidersList();

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
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_rounded, color: c.textMuted, size: 48),
            const SizedBox(height: 12),
            Text('No encontramos resultados', style: TextStyle(color: c.textSecondary)),
            const SizedBox(height: 4),
            Text('Prueba cambiando los filtros activos',
                style: TextStyle(color: c.textMuted, fontSize: 12)),
            const SizedBox(height: 16),
            TextButton(
              onPressed: prov.clearFilters,
              child: const Text('Limpiar filtros', style: TextStyle(color: AppColors.primary)),
            ),
          ],
        ),
      );
    }

    // Título dinámico según filtros activos
    final typeLabel = switch (prov.selectedType) {
      'PROFESSIONAL' => 'Profesionales',
      'BUSINESS'     => 'Negocios',
      _              => 'Servicios',
    };
    final catLabel = prov.selectedCategory != null
        ? ' · ${prov.categories.firstWhere((c) => c.slug == prov.selectedCategory, orElse: () => prov.categories.first).name}'
        : '';
    final sectionTitle = '$typeLabel$catLabel Cerca de Ti';

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: prov.loadProviders,
      child: ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
      itemCount: prov.providers.length + 1,
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12, top: 4),
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
                    style: TextStyle(
                        color: c.textPrimary, fontSize: 15, fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  '${prov.providers.length} resultado${prov.providers.length == 1 ? '' : 's'}',
                  style: TextStyle(color: c.textMuted, fontSize: 12),
                ),
              ],
            ),
          );
        }

        final provider = prov.providers[index - 1].copyWith(
          isFavorite: favProv.isFavorite(prov.providers[index - 1].id),
        );
        return ServiceCard(
          provider: provider,
          onTap: () => ProviderDetailSheet.show(context, provider),
          onFavoriteToggle: () {
            if (auth.user == null) {
              _showLoginRequiredDialog(context);
              return;
            }
            prov.toggleFavorite(provider.id);
            favProv.toggle(provider.id);
          },
        );
      },
    ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
// HOJA DE FILTROS AVANZADOS
// ═══════════════════════════════════════════════════════════

class _FilterSheet extends StatefulWidget {
  final ProvidersProvider prov;
  const _FilterSheet({required this.prov});

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late String? _availability;
  late bool    _verifiedOnly;
  late String? _sortBy;
  late final TextEditingController _locationCtrl;

  // Opciones de ordenamiento
  static const _sortOptions = [
    _SortOption(
      value: null,
      label: 'Relevancia',
      subtitle: 'Resultados más relevantes primero',
      icon: Icons.auto_awesome_rounded,
    ),
    _SortOption(
      value: 'reviews',
      label: 'Más reseñas',
      subtitle: 'Mayor número de opiniones de clientes',
      icon: Icons.chat_bubble_outline_rounded,
    ),
    _SortOption(
      value: 'availability',
      label: 'Mayor disponibilidad',
      subtitle: 'Disponibles primero, con demora después',
      icon: Icons.schedule_rounded,
    ),
    _SortOption(
      value: 'rating',
      label: 'Mejor calificación',
      subtitle: 'Ordenar por puntuación promedio',
      icon: Icons.star_outline_rounded,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _availability = widget.prov.selectedAvailability;
    _verifiedOnly = widget.prov.verifiedOnly;
    _sortBy       = widget.prov.sortBy;
    _locationCtrl = TextEditingController(text: widget.prov.location);
  }

  @override
  void dispose() {
    _locationCtrl.dispose();
    super.dispose();
  }

  void _apply() {
    widget.prov.applyFilters(
      availability: _availability,
      verifiedOnly: _verifiedOnly,
      sortBy: _sortBy,
      location: _locationCtrl.text.trim(),
    );
    Navigator.pop(context);
  }

  void _clear() {
    setState(() {
      _availability = null;
      _verifiedOnly = true;
      _sortBy       = null;
      _locationCtrl.clear();
    });
  }

  bool get _hasLocalChanges =>
      _availability != widget.prov.selectedAvailability ||
      _verifiedOnly != widget.prov.verifiedOnly ||
      _sortBy != widget.prov.sortBy ||
      _locationCtrl.text.trim() != widget.prov.location;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Container(
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Handle + Header ───────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(
                      color: c.textMuted.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.tune_rounded, color: AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Filtros avanzados',
                          style: TextStyle(
                              color: c.textPrimary,
                              fontSize: 18,
                              fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    TextButton.icon(
                      onPressed: _clear,
                      icon: const Icon(Icons.refresh_rounded,
                          size: 16, color: AppColors.primary),
                      label: const Text('Limpiar',
                          style: TextStyle(color: AppColors.primary, fontSize: 13)),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // ── Contenido con scroll ──────────────────────
          Flexible(
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                left: 20, right: 20, top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── DISPONIBILIDAD ────────────────────
                  _SectionLabel(label: 'DISPONIBILIDAD'),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    children: [
                      _FilterChip(
                        label: '🟢  Disponible ahora',
                        isSelected: _availability == 'DISPONIBLE',
                        color: AppColors.available,
                        onTap: () => setState(() => _availability =
                            _availability == 'DISPONIBLE' ? null : 'DISPONIBLE'),
                      ),
                      _FilterChip(
                        label: '🟠  Con demora',
                        isSelected: _availability == 'CON_DEMORA',
                        color: AppColors.delayed,
                        onTap: () => setState(() => _availability =
                            _availability == 'CON_DEMORA' ? null : 'CON_DEMORA'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // ── VERIFICACIÓN ──────────────────────
                  _SectionLabel(label: 'VERIFICACIÓN'),
                  const SizedBox(height: 10),
                  GestureDetector(
                    onTap: () => setState(() => _verifiedOnly = !_verifiedOnly),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: _verifiedOnly
                            ? AppColors.verified.withValues(alpha: 0.08)
                            : c.bgCard,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _verifiedOnly
                              ? AppColors.verified.withValues(alpha: 0.4)
                              : c.border,
                          width: _verifiedOnly ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.verified_rounded,
                            color: _verifiedOnly
                                ? AppColors.verified
                                : c.textMuted,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Solo proveedores verificados',
                                  style: TextStyle(
                                    color: c.textPrimary,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                Text(
                                  'Con el check azul de confianza',
                                  style: TextStyle(
                                      color: c.textMuted, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: _verifiedOnly,
                            onChanged: (v) =>
                                setState(() => _verifiedOnly = v),
                            activeColor: AppColors.verified,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── ORDENAR POR ───────────────────────
                  _SectionLabel(label: 'ORDENAR POR'),
                  const SizedBox(height: 10),
                  Container(
                    decoration: BoxDecoration(
                      color: c.bgCard,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: c.border),
                    ),
                    child: Column(
                      children: List.generate(_sortOptions.length, (i) {
                        final opt = _sortOptions[i];
                        final isSelected = _sortBy == opt.value;
                        final isLast = i == _sortOptions.length - 1;
                        return Column(
                          children: [
                            GestureDetector(
                              onTap: () =>
                                  setState(() => _sortBy = opt.value),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? AppColors.primary
                                          .withValues(alpha: 0.06)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.vertical(
                                    top: i == 0
                                        ? const Radius.circular(14)
                                        : Radius.zero,
                                    bottom: isLast
                                        ? const Radius.circular(14)
                                        : Radius.zero,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 36,
                                      height: 36,
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? AppColors.primary
                                                .withValues(alpha: 0.15)
                                            : c.bgInput,
                                        shape: BoxShape.circle,
                                      ),
                                      child: Icon(
                                        opt.icon,
                                        size: 18,
                                        color: isSelected
                                            ? AppColors.primary
                                            : c.textMuted,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            opt.label,
                                            style: TextStyle(
                                              color: isSelected
                                                  ? AppColors.primary
                                                  : c.textPrimary,
                                              fontSize: 14,
                                              fontWeight: isSelected
                                                  ? FontWeight.bold
                                                  : FontWeight.w500,
                                            ),
                                          ),
                                          Text(
                                            opt.subtitle,
                                            style: TextStyle(
                                                color: c.textMuted,
                                                fontSize: 11),
                                          ),
                                        ],
                                      ),
                                    ),
                                    // Radio indicator
                                    AnimatedContainer(
                                      duration:
                                          const Duration(milliseconds: 180),
                                      width: 20,
                                      height: 20,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: isSelected
                                              ? AppColors.primary
                                              : c.border,
                                          width: isSelected ? 0 : 1.5,
                                        ),
                                        color: isSelected
                                            ? AppColors.primary
                                            : Colors.transparent,
                                      ),
                                      child: isSelected
                                          ? const Icon(Icons.check,
                                              color: Colors.white, size: 13)
                                          : null,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            if (!isLast)
                              Divider(
                                height: 1,
                                indent: 14,
                                endIndent: 14,
                                color: c.border,
                              ),
                          ],
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── UBICACIÓN ─────────────────────────
                  _SectionLabel(label: 'UBICACIÓN'),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _locationCtrl,
                    style: TextStyle(color: c.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Ej: Miraflores, Jr. Lima...',
                      hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
                      prefixIcon: const Icon(
                          Icons.location_on_outlined,
                          color: AppColors.amber, size: 20),
                      filled: true,
                      fillColor: c.bgCard,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                            color: AppColors.primary, width: 1.5),
                      ),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),

          // ── Botones fijos en la parte inferior ────────
          Container(
            padding: EdgeInsets.fromLTRB(
              20, 12, 20,
              MediaQuery.of(context).padding.bottom + 16,
            ),
            decoration: BoxDecoration(
              color: c.bg,
              border: Border(top: BorderSide(color: c.border)),
            ),
            child: Row(
              children: [
                // Botón Limpiar
                Expanded(
                  flex: 2,
                  child: OutlinedButton(
                    onPressed: _clear,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: BorderSide(color: c.border),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: Text(
                      'Limpiar',
                      style: TextStyle(
                          color: c.textSecondary,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Botón Aplicar
                Expanded(
                  flex: 4,
                  child: ElevatedButton(
                    onPressed: _apply,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.check_rounded, size: 18),
                        const SizedBox(width: 6),
                        const Text(
                          'Aplicar filtros',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                        if (_hasLocalChanges) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.amber,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Datos de opción de ordenamiento (const) ───────────────

class _SortOption {
  final String? value;
  final String label;
  final String subtitle;
  final IconData icon;
  const _SortOption({
    required this.value,
    required this.label,
    required this.subtitle,
    required this.icon,
  });
}

// ─── Widgets auxiliares ───────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: TextStyle(
        color: context.colors.textMuted,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
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
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : c.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color.withOpacity(0.4) : c.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? color : c.textSecondary,
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
