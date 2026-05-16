import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../localities/data/dynamic_locations.dart';
import '../../../referrals/presentation/screens/referral_screen.dart';
import '../providers/providers_provider.dart';
import '../sheets/filter_sheet.dart';
import '../widgets/filter_bar.dart';
import '../widgets/greeting_header.dart';
import '../widgets/join_us_fab.dart';
import '../widgets/offers_banner.dart';
import '../widgets/providers_list_view.dart';
import '../widgets/search_bar.dart';
import '../widgets/subasta_banner.dart';

/// Pantalla principal: lista de proveedores con filtros, búsqueda y banners.
///
/// El cuerpo del Scaffold se compone de widgets focalizados — cada uno
/// vive en su propio archivo. Esta clase solo orquesta:
///   - Carga inicial de catálogo + proveedores con la ubicación del usuario.
///   - Sync de localidades dinámicas del backend.
///   - Arranque del stream GPS (delegado al [ProvidersProvider]).
///   - Apertura del [FilterSheet] desde el AppBar.
class ProvidersScreen extends StatelessWidget {
  const ProvidersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _ProvidersView();
  }
}

class _ProvidersView extends StatefulWidget {
  const _ProvidersView();

  @override
  State<_ProvidersView> createState() => _ProvidersViewState();
}

class _ProvidersViewState extends State<_ProvidersView>
    with AutomaticKeepAliveClientMixin, WidgetsBindingObserver {

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final user = context.read<AuthProvider>().user;
      final prov = context.read<ProvidersProvider>();
      prov.init(
        department: user?.department,
        province:   user?.province,
        district:   user?.district,
      );
      // Trae las localidades extras (USER/ADMIN) del backend para que los
      // dropdowns del filter y el chip de ubicación las muestren además
      // del catálogo estático. No bloquea: si falla, el catálogo seguido
      // funciona — sólo no incluye lo que otros usuarios hayan sugerido.
      DynamicLocations.instance.syncFromBackend();
      // Arranca el stream GPS — el Provider gestiona el StreamSubscription
      // y actualiza `liveProvince` en tiempo real.
      prov.startGpsStream();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    // No detenemos el stream aquí porque el provider sobrevive a la pantalla
    // (vive en el MultiProvider global). El provider lo limpia en su propio
    // dispose y cuando la app va a background (handler de lifecycle abajo).
    super.dispose();
  }

  // Pause GPS when app goes to background, resume when foregrounded.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final prov = context.read<ProvidersProvider>();
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      prov.stopGpsStream();
    } else if (state == AppLifecycleState.resumed) {
      prov.startGpsStream();
    }
  }

  void _showFilterSheet(BuildContext context, ProvidersProvider prov) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => FilterSheet(prov: prov),
    );
  }

 // ... todo el código anterior de _ProvidersViewState ...

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final c = context.colors;
    final providers   = context.watch<ProvidersProvider>();
    final liveProvince = providers.liveProvince;
    final liveDistrict = providers.liveDistrict;

    return Scaffold(
      backgroundColor: c.bg,
      floatingActionButton: const JoinUsFAB(),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        // ── Logo (esquina superior izquierda) ─────
        leading: Padding(
          padding: const EdgeInsets.only(left: 12),
          child: Image.asset(
            c.isDark
                ? 'assets/images/logo/logo_dark.png'
                : 'assets/images/logo/logo_light.png',
            width: 32,
            height: 32,
            filterQuality: FilterQuality.high,
          ),
        ),
        leadingWidth: 48,
        // ── Nombre de la app + monedas ─────────────
        title: Row(
          children: [
            Text(
              'OficioApp',
              style: TextStyle(
                color: c.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            const Spacer(),
            // Monedas a la derecha del título
            Consumer<AuthProvider>(
              builder: (_, auth, _) {
                final coins = auth.user?.coins ?? 0;
                return GestureDetector(
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const ReferralScreen(),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.monetization_on_rounded,
                          color: AppColors.amber, size: 20),
                      const SizedBox(width: 4),
                      Text(
                        '$coins',
                        style: const TextStyle(
                          color: AppColors.amber,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                );
              },
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
      // SafeArea horizontal: en phones con notch/dynamic-island las
      // sombras de las tarjetas se cortaban contra el borde del
      // display. top=false porque el AppBar ya respeta el inset; bottom
      // lo maneja la BottomNavigationBar del AppShell.
      body: SafeArea(
        top: false,
        bottom: false,
        child: Column(
          children: [
            GreetingHeader(liveProvince: liveProvince, liveDistrict: liveDistrict),
            const _SearchAndLocationRow(),
            const FilterBar(),
            const SubastaBanner(),
            const OffersBanner(),
            const Expanded(child: ProvidersListView()),
          ],
        ),
      ),
    );
  }
} // ← ESTE ES EL CIERRE DE _ProvidersViewState

// ══════════════════════════════════════════════════════════════
// CLASES AUXILIARES (FUERA de _ProvidersViewState)
// ══════════════════════════════════════════════════════════════

// ── Fila combinada: barra de búsqueda + chip de ubicación ──

class _SearchAndLocationRow extends StatelessWidget {
  const _SearchAndLocationRow();

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<ProvidersProvider>();
    final hasLocation = prov.hasLocationFilter;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Row(
        children: [
          const Expanded(child: CollapsibleSearchBar()),
          if (hasLocation) ...[
            const SizedBox(width: 8),
            _CompactLocationChip(prov: prov),
          ],
        ],
      ),
    );
  }
}

// ── Chip de ubicación compacto ────────────────────────────

class _CompactLocationChip extends StatelessWidget {
  final ProvidersProvider prov;
  const _CompactLocationChip({required this.prov});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final parts = [
      if (prov.district != null) prov.district!,
      if (prov.province != null) prov.province!,
      if (prov.department != null) prov.department!,
    ];
    final label = parts.isNotEmpty ? parts.first : '';

    return GestureDetector(
      onTap: prov.clearLocationFilter,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 16),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: c.textPrimary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(width: 4),
            Icon(Icons.close_rounded, color: c.textMuted, size: 14),
          ],
        ),
      ),
    );
  }
}