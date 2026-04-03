import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/shared/widgets/join_us_modal.dart';
import 'package:provider/provider.dart';
import '../providers/providers_provider.dart';
import '../widgets/service_card.dart';
import 'provider_detail_sheet.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../features/auth/presentation/screens/login_screen.dart';
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
                  colors: [AppColors.amber, AppColors.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
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
          _GreetingHeader(),
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

// ─── Botón flotante dinámico ──────────────────────────────
// Naranja "¡Quiero ser parte!" → si el usuario NO es proveedor
// Azul   "Ir a mi panel"      → si el usuario SÍ es proveedor

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
    final isProvider = context.watch<AuthProvider>().user?.isProvider ?? false;

    // Pausar la animación si no es necesaria
    if (isProvider) {
      _pulseController.stop();
    } else if (!_pulseController.isAnimating) {
      _pulseController.repeat(reverse: true);
    }

    if (isProvider) {
      return _buildProviderButton(context);
    }
    return _buildJoinUsButton(context);
  }

  // ── Botón azul: "Ir a mi panel" ──────────────────────────
  Widget _buildProviderButton(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: () => _openProviderPanel(context),
      backgroundColor: Colors.transparent,
      elevation: 0,
      label: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1E88E5), Color(0xFF1565C0)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1E88E5).withOpacity(0.4),
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
            Icon(Icons.dashboard_rounded, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text(
              'Ir a mi panel',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Botón naranja: "¡Quiero ser parte!" con pulso ─────────
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
              Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 18),
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

  void _openProviderPanel(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _ProviderPanelSheet(
        user: context.read<AuthProvider>().user,
      ),
    );
  }
}

// ─── Panel rápido del proveedor ───────────────────────────

class _ProviderPanelSheet extends StatelessWidget {
  final dynamic user;
  const _ProviderPanelSheet({this.user});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40, height: 4,
            decoration: BoxDecoration(
              color: AppColors.textMuted.withOpacity(0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          // Avatar e info
          Row(
            children: [
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1E88E5), Color(0xFF1565C0)],
                  ),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.store_rounded, color: Colors.white, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.fullName ?? 'Mi panel',
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Text(
                      'Proveedor verificado',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Acciones rápidas
          _PanelAction(
            icon: Icons.edit_rounded,
            label: 'Editar mi perfil',
            color: AppColors.primary,
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Editor de perfil próximamente'), behavior: SnackBarBehavior.floating),
              );
            },
          ),
          const SizedBox(height: 12),
          _PanelAction(
            icon: Icons.bar_chart_rounded,
            label: 'Ver mis estadísticas',
            color: AppColors.available,
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Estadísticas próximamente'), behavior: SnackBarBehavior.floating),
              );
            },
          ),
          const SizedBox(height: 12),
          _PanelAction(
            icon: Icons.schedule_rounded,
            label: 'Cambiar disponibilidad',
            color: AppColors.delayed,
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Gestión de disponibilidad próximamente'), behavior: SnackBarBehavior.floating),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _PanelAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _PanelAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 12),
            Text(
              label,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            Icon(Icons.arrow_forward_ios_rounded, color: AppColors.textMuted, size: 14),
          ],
        ),
      ),
    );
  }
}

// ─── Helper: diálogo de login requerido ──────────────────

void _showLoginRequiredDialog(BuildContext context) {
  showDialog(
    context: context,
    builder: (_) => AlertDialog(
      backgroundColor: AppColors.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: const Text(
        'Inicia sesión para continuar',
        style: TextStyle(
          color: AppColors.textPrimary,
          fontWeight: FontWeight.bold,
          fontSize: 17,
        ),
      ),
      content: const Text(
        'Necesitas una cuenta para agregar favoritos y dejar reseñas.',
        style: TextStyle(color: AppColors.textSecondary, height: 1.5),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Ahora no',
              style: TextStyle(color: AppColors.textMuted)),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context);
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => const LoginScreen(initialMode: AuthMode.register),
              ),
            );
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12)),
          ),
          child: const Text('Registrarme',
              style: TextStyle(color: Colors.white)),
        ),
      ],
    ),
  );
}

// ─── Encabezado de saludo personalizado ──────────────────

class _GreetingHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
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
                  firstName != null
                      ? '¡Hola, $firstName!'
                      : '¡Explora los servicios!',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  firstName != null
                      ? '¿Qué necesitas hoy?'
                      : 'Contrata sin registro • Es gratis',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          // Indicador de ubicación
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.bgCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.location_on_rounded,
                    color: AppColors.amber, size: 14),
                SizedBox(width: 4),
                Text(
                  'Cerca de ti',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
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
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
      // 100 de bottom para que el FAB no tape las tarjetas
      itemCount: prov.providers.length + 1, // +1 para el encabezado de sección
      itemBuilder: (context, index) {
        // Primer ítem: encabezado de sección
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12, top: 4),
            child: Row(
              children: [
                Container(
                  width: 3,
                  height: 18,
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
                const Text(
                  'Profesionales Destacados Cerca de Ti',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
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