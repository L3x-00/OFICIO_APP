import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../ai_assistant/presentation/ai_assistant_fab.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../localities/data/dynamic_locations.dart';
import '../../../referrals/presentation/screens/referral_screen.dart';
import '../../../showcase/showcase_data.dart';
import '../../../showcase/showcase_overlay.dart';
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
      prov
          .init(
            department: user?.department,
            province: user?.province,
            district: user?.district,
          )
          .then((_) {
            // Pre-carga las portadas del Home apenas llegan los destacados, para
            // que la primera pintura sea instantánea (clave en invitado).
            if (mounted) prov.precacheFeaturedCovers(context);
          });
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
    final auth = context.watch<AuthProvider>();
    final isGuest = auth.isGuest || auth.user == null;
    final userId = auth.user?.id;

    return HomeShowcaseHost(
      userId: userId,
      isGuest: isGuest,
      child: Scaffold(
        backgroundColor: c.bg,
        // Dos FAB apilados: Ofi (asistente IA, ámbar) arriba y "Únete"
        // (showcase) abajo. Column min para no romper el layout existente.
        floatingActionButton: Column(
          mainAxisSize: MainAxisSize.min,
          // Ancla los FAB a la derecha: el globo de Ofi cambia el ancho y, sin
          // esto, el JoinUsFAB se movería horizontalmente al aparecer/ocultarse.
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const AiAssistantFab(),
            const SizedBox(height: 12),
            ShowcaseTarget(
              step: kShowcaseStepsRegistered.firstWhere(
                (s) => s.key == kShowcaseJoinUsFab,
              ),
              isLast: isLastShowcaseStep(kShowcaseJoinUsFab, isGuest: isGuest),
              targetHeight: 56,
              targetWidth: 56,
              child: const JoinUsFAB(),
            ),
          ],
        ),
        floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
        appBar: AppBar(
          backgroundColor: c.bg,
          elevation: 0,
          // ── Logo (esquina superior izquierda) ─────
          leading: Padding(
            padding: const EdgeInsets.only(left: 8),
            child: Image.asset(
              c.isDark
                  ? 'assets/images/logo/servi.png'
                  : 'assets/images/logo/servi.png',
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
                'Servi',
                style: TextStyle(
                  color: c.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 18,
                ),
              ),
              const Spacer(),
              // Monedas a la derecha del título — wrapper showcase
              // (solo aplica al deck registered; en guest la key no
              // aparece en startShowCase y el spotlight nunca se
              // dispara sobre ella).
              ShowcaseTarget(
                step: kShowcaseStepsRegistered.firstWhere(
                  (s) => s.key == kShowcaseCoinsIcon,
                ),
                isLast: isLastShowcaseStep(
                  kShowcaseCoinsIcon,
                  isGuest: isGuest,
                ),
                targetHeight: 28,
                targetWidth: 60,
                child: Consumer<AuthProvider>(
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
                          Icon(
                            Icons.monetization_on_rounded,
                            color: AppColors.amber,
                            size: 20,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$coins',
                            style: const TextStyle(
                              color: AppColors.amber,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
          actions: [
            // Botón de filtros — el deck lo destaca como "Filtros
            // avanzados". Mismo spec en registered y guest.
            ShowcaseTarget(
              step: kShowcaseStepsRegistered.firstWhere(
                (s) => s.key == kShowcaseFiltersIcon,
              ),
              isLast: isLastShowcaseStep(
                kShowcaseFiltersIcon,
                isGuest: isGuest,
              ),
              targetHeight: 40,
              targetWidth: 40,
              child: Consumer<ProvidersProvider>(
                builder: (_, prov, _) => IconButton(
                  tooltip: 'Filtros avanzados',
                  icon: Badge(
                    isLabelVisible: prov.hasActiveFilters,
                    backgroundColor: AppColors.amber,
                    child: Icon(
                      Icons.tune_rounded,
                      color: prov.hasActiveFilters
                          ? c.textPrimary
                          : c.textSecondary,
                    ),
                  ),
                  onPressed: () => _showFilterSheet(context, prov),
                ),
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _GreetingRow(),
              const _SearchAndLocationRow(),
              const FilterBar(),
              // Banner subasta wrapped — paso "publica tus necesidades"
              // del deck registered (no aparece en guest).
              ShowcaseTarget(
                step: kShowcaseStepsRegistered.firstWhere(
                  (s) => s.key == kShowcaseSubastaBanner,
                ),
                isLast: isLastShowcaseStep(
                  kShowcaseSubastaBanner,
                  isGuest: isGuest,
                ),
                targetHeight: 90,
                targetWidth: 360,
                child: const SubastaBanner(),
              ),
              const OffersBanner(),
              const Expanded(child: ProvidersListView()),
            ],
          ),
        ),
      ),
    );
  }
} // ← ESTE ES EL CIERRE DE _ProvidersViewState

// ══════════════════════════════════════════════════════════════
// CLASES AUXILIARES (FUERA de _ProvidersViewState)
// ══════════════════════════════════════════════════════════════

// ── Fila del saludo + chip de ubicación (Fase 1) ──────────
// El saludo va a la izquierda (misma posición de siempre) y el chip de
// ubicación a la derecha, en la MISMA fila, con spaceBetween. Antes el chip
// compartía fila con la búsqueda y se encimaba con fuentes grandes.

class _GreetingRow extends StatelessWidget {
  const _GreetingRow();

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<ProvidersProvider>();
    final auth = context.watch<AuthProvider>();
    final isGuest = auth.isGuest || auth.user == null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 12, 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Flexible(child: GreetingHeader()),
          const SizedBox(width: 8),
          Flexible(
            child: ShowcaseTarget(
              step: (isGuest ? kShowcaseStepsGuest : kShowcaseStepsRegistered)
                  .firstWhere((s) => s.key == kShowcaseLocationChip),
              isLast: isLastShowcaseStep(
                kShowcaseLocationChip,
                isGuest: isGuest,
              ),
              targetHeight: 36,
              targetWidth: 140,
              child: _CompactLocationChip(prov: prov),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Fila de búsqueda (ahora a ancho completo, sin el chip) ──

class _SearchAndLocationRow extends StatelessWidget {
  const _SearchAndLocationRow();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isGuest = auth.isGuest || auth.user == null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
      child: ShowcaseTarget(
        step: (isGuest ? kShowcaseStepsGuest : kShowcaseStepsRegistered)
            .firstWhere((s) => s.key == kShowcaseSearchBar),
        isLast: isLastShowcaseStep(kShowcaseSearchBar, isGuest: isGuest),
        targetHeight: 44,
        targetWidth: 240,
        child: const CollapsibleSearchBar(),
      ),
    );
  }
}

// ── Chip de ubicación compacto ────────────────────────────

// ── Chip de ubicación compacto ────────────────────────────

class _CompactLocationChip extends StatelessWidget {
  final ProvidersProvider prov;
  const _CompactLocationChip({required this.prov});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasFilter = prov.hasLocationFilter;

    // El chip refleja la zona REAL del usuario EN TIEMPO REAL: prioriza los
    // valores del stream GPS (liveDistrict/liveProvince) — que se actualizan
    // al instante en cada cambio de zona (independiente del reload de 2 km)
    // y disparan notifyListeners — y cae al filtro persistido si el stream
    // aún no tiene dato. Antes el chip leía solo el filtro persistido, por
    // eso se quedaba en "El Tambo" al moverse a otro distrito.
    final liveDistrict = prov.liveDistrict;
    final liveProvince = prov.liveProvince;
    final displayDistrict = (liveDistrict?.isNotEmpty ?? false)
        ? liveDistrict
        : prov.district;
    final displayProvince = (liveProvince?.isNotEmpty ?? false)
        ? liveProvince
        : prov.province;

    // Construir label solo si hay filtro
    String label = '';
    if (hasFilter) {
      final parts = [
        if (displayDistrict != null && displayDistrict.isNotEmpty)
          displayDistrict,
        if (displayProvince != null && displayProvince.isNotEmpty)
          displayProvince,
        if (prov.department != null) prov.department!,
      ];
      label = parts.isNotEmpty ? parts.first : '';
    }

    return GestureDetector(
      onTap: () {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => FilterSheet(prov: prov),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: hasFilter
              ? AppColors.primary.withValues(alpha: 0.10)
              : AppColors.amber.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: hasFilter
                ? AppColors.primary.withValues(alpha: 0.35)
                : AppColors.amber.withValues(alpha: 0.25),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              hasFilter ? Icons.location_on_rounded : Icons.public_rounded,
              // En claro el dorado claro pierde fuerza sobre la crema: amberDark.
              color: hasFilter
                  ? AppColors.primary
                  : (c.isDark ? AppColors.amber : AppColors.amberDark),
              size: 14,
            ),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                hasFilter ? ' $label' : 'Mostrando todos los servicios',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (hasFilter) ...[
              const SizedBox(width: 2),
              const Icon(
                Icons.arrow_drop_down_rounded,
                color: AppColors.primary,
                size: 18,
              ),
              const SizedBox(width: 2),
              GestureDetector(
                onTap: () => prov.clearLocationFilter(),
                child: Icon(Icons.close_rounded, color: c.textMuted, size: 14),
              ),
            ] else ...[
              const SizedBox(width: 2),
              Icon(
                Icons.arrow_drop_down_rounded,
                color: c.isDark ? AppColors.amber : AppColors.amberDark,
                size: 18,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
