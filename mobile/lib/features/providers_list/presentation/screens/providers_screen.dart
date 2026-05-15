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

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final c = context.colors;
    // Watch para que la pill del header se actualice cuando el stream GPS
    // emite una nueva provincia / distrito en tiempo real.
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
        // ── Ícono de monedas (esquina superior izquierda) ─────
        leading: Consumer<AuthProvider>(
          builder: (_, auth, _) {
            final coins = auth.user?.coins ?? 0;
            return GestureDetector(
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const ReferralScreen(),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.monetization_on_rounded,
                        color: AppColors.amber, size: 22),
                    const SizedBox(width: 4),
                    Text(
                      '$coins',
                      style: TextStyle(
                        color: AppColors.amber,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        leadingWidth: 72,
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
              'OficioApp',
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
          GreetingHeader(liveProvince: liveProvince, liveDistrict: liveDistrict),
          const CollapsibleSearchBar(),
          const FilterBar(),
          const SubastaBanner(),
          const OffersBanner(),
          const Expanded(child: ProvidersListView()),
        ],
      ),
    );
  }
}
