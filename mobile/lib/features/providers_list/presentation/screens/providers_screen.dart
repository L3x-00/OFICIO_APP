import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/shared/widgets/join_us_modal.dart';
import 'package:provider/provider.dart';
import '../../data/providers_repository.dart';
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
          builder: (_, prov, _) => IconButton(
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
            builder: (_, prov, _) => IconButton(
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
// BARRA DE FILTROS JERÁRQUICA (tipo + macrocategoría → subcategoría)
// ═══════════════════════════════════════════════════════════

// Mapa de macrocategoría-slug → icono Flutter
const _kParentIcons = <String, IconData>{
  'hogar':               Icons.home_repair_service_rounded,
  'gastronomia':         Icons.restaurant_rounded,
  'belleza':             Icons.face_retouching_natural_rounded,
  'transporte-general':  Icons.directions_car_rounded,
  'tecnologia':          Icons.computer_rounded,
  'salud':               Icons.health_and_safety_rounded,
  'educacion':           Icons.school_rounded,
  'ingenieria':          Icons.engineering_rounded,
};

class _FilterBar extends StatelessWidget {
  const _FilterBar();

  static const _typeChips = [
    _TypeChipData(label: 'Todos',         icon: Icons.apps_rounded,       value: null,           activeColor: AppColors.amber),
    _TypeChipData(label: 'Profesionales', icon: Icons.handyman_rounded,   value: 'PROFESSIONAL', activeColor: AppColors.primary),
    _TypeChipData(label: 'Negocios',      icon: Icons.storefront_rounded, value: 'BUSINESS',     activeColor: Color(0xFF8E2DE2)),
  ];

  @override
  Widget build(BuildContext context) {
    final prov     = context.watch<ProvidersProvider>();
    final expanded = prov.expandedParentSlug;

    return AnimatedSize(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeInOut,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Fila 1: tipo chips (siempre visible) ──────
          SizedBox(
            height: 46,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: _typeChips.length,
              itemBuilder: (_, i) {
                final t = _typeChips[i];
                final isSel = prov.selectedType == t.value;
                return _TypeChip(
                  data: t,
                  isSelected: isSel,
                  onTap: () => prov.setType(isSel && t.value != null ? null : t.value),
                );
              },
            ),
          ),

          // ── Fila 2: macrocategorías o subcategorías ───
          if (prov.categories.isNotEmpty)
            SizedBox(
              height: 42,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                transitionBuilder: (child, anim) => FadeTransition(
                  opacity: anim,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0.06, 0),
                      end: Offset.zero,
                    ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOut)),
                    child: child,
                  ),
                ),
                child: expanded == null
                    ? _ParentChipRow(key: const ValueKey('parents'), prov: prov)
                    : _SubChipRow(key: ValueKey('sub_$expanded'), prov: prov),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Fila de macrocategorías ────────────────────────────────

class _ParentChipRow extends StatelessWidget {
  final ProvidersProvider prov;
  const _ParentChipRow({super.key, required this.prov});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ListView.builder(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      itemCount: prov.categories.length,
      itemBuilder: (_, i) {
        final parent = prov.categories[i];
        final icon   = _kParentIcons[parent.slug] ?? Icons.category_rounded;
        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: GestureDetector(
            onTap: () => prov.setParentCategory(parent.slug),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: c.bgCard,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: c.border),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 13, color: c.textSecondary),
                  const SizedBox(width: 5),
                  Text(
                    parent.name,
                    style: TextStyle(color: c.textSecondary, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(width: 3),
                  Icon(Icons.chevron_right_rounded, size: 14, color: c.textMuted),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

// ── Fila de subcategorías (con botón atrás) ───────────────

class _SubChipRow extends StatelessWidget {
  final ProvidersProvider prov;
  const _SubChipRow({super.key, required this.prov});

  @override
  Widget build(BuildContext context) {
    final c       = context.colors;
    final parent  = prov.expandedParent;
    final subs    = prov.expandedChildren;
    final icon    = _kParentIcons[prov.expandedParentSlug] ?? Icons.category_rounded;

    return ListView.builder(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      itemCount: 1 + 1 + subs.length, // back + separator + subcats
      itemBuilder: (_, i) {
        // Botón "← Nombre"
        if (i == 0) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: prov.collapseParent,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.arrow_back_ios_new_rounded, size: 11, color: AppColors.primary),
                    const SizedBox(width: 5),
                    Icon(icon, size: 13, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      parent?.name ?? '',
                      style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          );
        }
        // Separador
        if (i == 1) {
          return Padding(
            padding: const EdgeInsets.only(right: 12, left: 4),
            child: Center(
              child: Container(width: 1.5, height: 18, color: c.border),
            ),
          );
        }
        // Subcategorías
        final sub       = subs[i - 2];
        final isSel     = prov.selectedCategory == sub.slug;
        return _CategoryChip(
          label:      sub.name,
          isSelected: isSel,
          onTap:      () => prov.setCategory(isSel ? null : sub.slug),
        );
      },
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

    // Solo mostrar "Ir a mi panel" cuando el proveedor está APROBADO
    if (auth.hasApprovedProvider) {
      _pulseController.stop();
      return _buildProviderButton(context);
    }

    // Pendiente o sin perfil → siempre mostrar "¡Quiero ser parte!"
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
              color: const Color(0xFF1E88E5).withValues(alpha: 0.4),
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
                color: const Color(0xFFFF6B35).withValues(alpha: 0.4),
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
    // Busca nombre en subcategorías hijas
    String catLabel = '';
    if (prov.selectedCategory != null) {
      for (final parent in prov.categories) {
        final match = parent.children.where((s) => s.slug == prov.selectedCategory);
        if (match.isNotEmpty) { catLabel = ' · ${match.first.name}'; break; }
      }
    } else if (prov.expandedParentSlug != null) {
      catLabel = ' · ${prov.expandedParent?.name ?? ''}';
    }
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
            favProv.toggle(provider.id).then((ok) {
              if (!ok && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(favProv.error ?? 'Error al actualizar favorito'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            });
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
  // Categoría (estado local del sheet)
  String? _sheetParentSlug;   // macrocategoría expandida en el sheet
  String? _sheetCategory;     // subcategoría hoja seleccionada

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
    _availability      = widget.prov.selectedAvailability;
    _verifiedOnly      = widget.prov.verifiedOnly;
    _sortBy            = widget.prov.sortBy;
    _locationCtrl      = TextEditingController(text: widget.prov.location);
    _sheetParentSlug   = widget.prov.expandedParentSlug;
    _sheetCategory     = widget.prov.selectedCategory;
  }

  @override
  void dispose() {
    _locationCtrl.dispose();
    super.dispose();
  }

  void _apply() {
    widget.prov.applyFilters(
      availability:   _availability,
      verifiedOnly:   _verifiedOnly,
      sortBy:         _sortBy,
      location:       _locationCtrl.text.trim(),
      category:       _sheetCategory,
      parentCategory: _sheetCategory == null ? _sheetParentSlug : null,
    );
    Navigator.pop(context);
  }

  void _clear() {
    setState(() {
      _availability    = null;
      _verifiedOnly    = true;
      _sortBy          = null;
      _sheetParentSlug = null;
      _sheetCategory   = null;
      _locationCtrl.clear();
    });
  }

  bool get _hasLocalChanges =>
      _availability    != widget.prov.selectedAvailability ||
      _verifiedOnly    != widget.prov.verifiedOnly ||
      _sortBy          != widget.prov.sortBy ||
      _sheetCategory   != widget.prov.selectedCategory ||
      _sheetParentSlug != widget.prov.expandedParentSlug ||
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
                      color: c.textMuted.withValues(alpha: 0.3),
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
                  // ── CATEGORÍAS ───────────────────────
                  _SectionLabel(label: 'CATEGORÍA'),
                  const SizedBox(height: 10),
                  _CategorySheetSection(
                    categories:      widget.prov.categories,
                    selectedParent:  _sheetParentSlug,
                    selectedLeaf:    _sheetCategory,
                    onParentTap:     (slug) => setState(() {
                      _sheetParentSlug = _sheetParentSlug == slug ? null : slug;
                      _sheetCategory   = null;
                    }),
                    onLeafTap:       (slug) => setState(() {
                      _sheetCategory = _sheetCategory == slug ? null : slug;
                    }),
                  ),
                  const SizedBox(height: 20),

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
                            activeThumbColor: AppColors.verified,
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
          color: isSelected ? color.withValues(alpha: 0.15) : c.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color.withValues(alpha: 0.4) : c.border,
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

// ═══════════════════════════════════════════════════════════
// SECCIÓN DE CATEGORÍAS JERÁRQUICA PARA EL FILTER SHEET
// ═══════════════════════════════════════════════════════════

class _CategorySheetSection extends StatelessWidget {
  final List<CategoryModel> categories;
  final String? selectedParent;
  final String? selectedLeaf;
  final ValueChanged<String> onParentTap;
  final ValueChanged<String> onLeafTap;

  const _CategorySheetSection({
    required this.categories,
    required this.selectedParent,
    required this.selectedLeaf,
    required this.onParentTap,
    required this.onLeafTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Grid de macrocategorías ──────────────────────
        GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 0.85,
          ),
          itemCount: categories.length,
          itemBuilder: (_, i) {
            final parent   = categories[i];
            final icon     = _kParentIcons[parent.slug] ?? Icons.category_rounded;
            final isSel    = selectedParent == parent.slug;
            final hasLeaf  = isSel && selectedLeaf != null;

            return GestureDetector(
              onTap: () => onParentTap(parent.slug),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                decoration: BoxDecoration(
                  color: isSel
                      ? AppColors.primary.withValues(alpha: 0.12)
                      : c.bgCard,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isSel
                        ? AppColors.primary.withValues(alpha: 0.4)
                        : c.border,
                    width: isSel ? 1.5 : 1,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Icon(
                          icon,
                          size: 26,
                          color: isSel ? AppColors.primary : c.textMuted,
                        ),
                        if (hasLeaf)
                          Positioned(
                            top: -4, right: -6,
                            child: Container(
                              width: 10, height: 10,
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                                border: Border.all(color: c.bgCard, width: 1.5),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      parent.name,
                      style: TextStyle(
                        color: isSel ? AppColors.primary : c.textSecondary,
                        fontSize: 10,
                        fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                        height: 1.2,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          },
        ),

        // ── Subcategorías (se expanden al seleccionar padre) ─
        if (selectedParent != null) ...[
          const SizedBox(height: 12),
          AnimatedSize(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeInOut,
            child: Builder(builder: (context) {
              final parent = categories.where((p) => p.slug == selectedParent).firstOrNull;
              final subs   = parent?.children ?? [];
              if (subs.isEmpty) return const SizedBox.shrink();

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    parent!.name,
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 7,
                    runSpacing: 7,
                    children: subs.map((sub) {
                      final isSel = selectedLeaf == sub.slug;
                      return GestureDetector(
                        onTap: () => onLeafTap(sub.slug),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            color: isSel
                                ? AppColors.primary
                                : context.colors.bgCard,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSel
                                  ? AppColors.primary
                                  : context.colors.border,
                            ),
                          ),
                          child: Text(
                            sub.name,
                            style: TextStyle(
                              color: isSel
                                  ? Colors.white
                                  : context.colors.textSecondary,
                              fontSize: 12,
                              fontWeight: isSel
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              );
            }),
          ),
        ],
      ],
    );
  }
}