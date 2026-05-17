import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../showcase/showcase_data.dart';
import '../../../showcase/showcase_overlay.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/welcome_provider_plan_modal.dart';
import '../widgets/home/home_header.dart';
import '../widgets/home/home_stat_cards.dart';
import '../widgets/home/home_contact_preview.dart';
import '../widgets/home/home_notifications_section.dart';
import '../widgets/home/home_weekly_chart.dart';
import '../widgets/home/home_reviews_section.dart';

/// Tab "Inicio" del panel del proveedor.
///
/// Orquesta el [CustomScrollView] con las secciones del home (header,
/// stats grid, preview de contacto, notificaciones, gráfico semanal,
/// reseñas). Cada sección vive en `widgets/home/`. La única lógica que
/// permanece aquí es del ciclo de vida del tab: carga inicial y modal
/// de bienvenida.
class PanelHomeTab extends StatefulWidget {
  final bool isNegocio;
  final bool isPaused;
  final ValueChanged<int> onChangeTab;

  const PanelHomeTab({
    super.key,
    required this.isNegocio,
    required this.isPaused,
    required this.onChangeTab,
  });

  @override
  State<PanelHomeTab> createState() => _PanelHomeTabState();
}

class _PanelHomeTabState extends State<PanelHomeTab> {
  String get _providerType => widget.isNegocio ? 'NEGOCIO' : 'OFICIO';

  /// Flag local para no encolar múltiples diálogos si el provider cambia
  /// varias veces tras el primer load (cambio de tab, switch de perfil).
  bool _welcomeChecked = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      await context.read<DashboardProvider>().loadDashboard(providerType: _providerType);
      if (!mounted) return;
      _maybeShowWelcome();
    });
  }

  /// Si el provider tiene el plan ESTANDAR de cortesía (GRACIA), abrimos
  /// el modal de bienvenida una sola vez (persistido en SharedPreferences
  /// por providerId).
  Future<void> _maybeShowWelcome() async {
    if (_welcomeChecked) return;
    final dash = context.read<DashboardProvider>();
    final p = dash.profile;
    if (p == null) return;
    final sub = p.subscription;
    if (sub == null) return;
    if (sub.plan != 'ESTANDAR' || sub.status != 'GRACIA') return;

    _welcomeChecked = true;
    final displayName = p.businessName.isNotEmpty
        ? p.businessName
        : (context.read<AuthProvider>().user?.firstName ?? '');
    await WelcomeProviderPlanModal.showIfFirstTime(
      context,
      displayName: displayName,
      providerId:  p.id,
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dash = context.watch<DashboardProvider>();
    final auth = context.watch<AuthProvider>();
    final defaultName = widget.isNegocio ? 'tu negocio' : 'tu servicio';
    final name = dash.profile?.businessName ?? auth.user?.firstName ?? defaultName;
    final coverUrl = dash.profile?.images.isNotEmpty == true
        ? dash.profile!.images.first.url
        : null;

    final plan = dash.profile?.subscription?.plan ?? 'GRATIS';
    final hasBothProfiles = auth.hasOficioProfile && auth.hasNegocioProfile;
    final homeSteps = buildAdminHomeSteps(
      plan:            plan,
      hasBothProfiles: hasBothProfiles,
    );

    return AdminTabShowcase(
      tab:          AdminTab.home,
      userId:       auth.user?.id,
      providerType: _providerType,
      isApproved:   dash.profile?.isVerified ?? false,
      steps:        homeSteps,
      child: RefreshIndicator(
      onRefresh: () => context.read<DashboardProvider>().loadDashboard(providerType: _providerType),
      color: AppColors.amber,
      backgroundColor: c.bgCard,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: HomeHeader(
              name: name,
              isNegocio: widget.isNegocio,
              isPaused: widget.isPaused,
              profile: dash.profile,
              coverUrl: coverUrl,
            ),
          ),
          HomeStatsGrid(
            isLoading: dash.isLoading,
            analytics: dash.analytics,
            profile: dash.profile,
          ),
          SliverToBoxAdapter(
            child: ShowcaseTarget(
              step: homeSteps.firstWhere((s) => s.key == kAdminPublicPreviewKey),
              isLast: isLastAdminStep(kAdminPublicPreviewKey, homeSteps),
              child: HomeContactPreview(profile: dash.profile),
            ),
          ),
          SliverToBoxAdapter(
            child: HomeNotificationsSection(
              notifications: dash.notifications,
              unread: dash.unreadNotifications,
              onMarkRead: (id) =>
                  context.read<DashboardProvider>().markNotificationRead(id),
            ),
          ),
          SliverToBoxAdapter(
            child: HomeWeeklyChart(
              isLoading: dash.isLoading,
              analytics: dash.analytics,
            ),
          ),
          SliverToBoxAdapter(
            child: HomeReviewsSection(
              isLoading: dash.isLoading,
              reviews: dash.reviews,
              onViewAll: () => widget.onChangeTab(3),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
      ),
    );
  }
}
