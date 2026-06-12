import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../showcase/showcase_data.dart';
import '../../../showcase/showcase_overlay.dart';
import '../../../chat/domain/models/chat_room_model.dart';
import '../../../chat/presentation/providers/chat_provider.dart';
import '../../../chat/presentation/screens/chat_screen.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/home/home_header.dart';
import '../widgets/home/home_stat_cards.dart';
import '../widgets/home/home_contact_preview.dart';
import '../widgets/home/home_notifications_section.dart';
import '../widgets/home/home_services_preview.dart';
import '../widgets/home/home_recent_chats.dart';

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

  @override
  void initState() {
    super.initState();
    // El modal de bienvenida del proveedor YA NO se dispara aquí.
    // Antes aparecía recién al entrar al panel (2da vez) — ahora se
    // muestra como mensaje emergente en la pantalla principal vía
    // `_tryShowProviderApproval` en main.dart, igual que el aviso de
    // eliminación de cuenta.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      // Carga las salas de chat para el bloque "Conversaciones recientes"
      // (no bloquea el dashboard — silencioso si falla).
      context.read<ChatProvider>().loadRooms();
      await context.read<DashboardProvider>().loadDashboard(
        providerType: _providerType,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dash = context.watch<DashboardProvider>();
    final auth = context.watch<AuthProvider>();
    final chat = context.watch<ChatProvider>();
    final myUserId = auth.user?.id;

    // Salas donde el usuario es el PROVEEDOR (no las que abrió como cliente),
    // ordenadas por última actividad — top 2 para el bloque de recientes.
    final recentRooms = myUserId == null
        ? const <ChatRoomSummary>[]
        : (chat.rooms.where((r) => r.provider.userId == myUserId).toList()
                ..sort((a, b) => b.lastActivityAt.compareTo(a.lastActivityAt)))
              .take(2)
              .toList();

    final defaultName = widget.isNegocio ? 'tu negocio' : 'tu servicio';
    final name =
        dash.profile?.businessName ?? auth.user?.firstName ?? defaultName;
    final coverUrl = dash.profile?.images.isNotEmpty == true
        ? dash.profile!.images.first.url
        : null;

    final plan = dash.profile?.subscription?.plan ?? 'GRATIS';
    final hasBothProfiles = auth.hasOficioProfile && auth.hasNegocioProfile;
    final homeSteps = buildAdminHomeSteps(
      plan: plan,
      hasBothProfiles: hasBothProfiles,
    );

    return AdminTabShowcase(
      tab: AdminTab.home,
      userId: auth.user?.id,
      providerType: _providerType,
      isApproved: dash.profile?.isVerified ?? false,
      steps: homeSteps,
      child: RefreshIndicator(
        onRefresh: () => context.read<DashboardProvider>().loadDashboard(
          providerType: _providerType,
        ),
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
                // C-10: pasamos el step real del deck. firstWhereOrNull
                // evita crash si el deck no incluye planBadge (futuro
                // flag que lo deshabilite). Hoy siempre está presente.
                planBadgeStep: homeSteps
                    .where((s) => s.key == kAdminPlanBadgeKey)
                    .firstOrNull,
                planBadgeIsLast: isLastAdminStep(kAdminPlanBadgeKey, homeSteps),
              ),
            ),
            HomeStatsGrid(
              isLoading: dash.isLoading,
              analytics: dash.analytics,
              profile: dash.profile,
            ),
            SliverToBoxAdapter(
              child: ShowcaseTarget(
                step: homeSteps.firstWhere(
                  (s) => s.key == kAdminPublicPreviewKey,
                ),
                isLast: isLastAdminStep(kAdminPublicPreviewKey, homeSteps),
                child: HomeContactPreview(profile: dash.profile),
              ),
            ),
            // Servicios/Productos del proveedor → tab Servicios (3).
            SliverToBoxAdapter(
              child: HomeServicesPreview(
                isNegocio: widget.isNegocio,
                services: dash.services,
                onViewAll: () => widget.onChangeTab(3),
              ),
            ),
            // Últimas 2 conversaciones → tab Mensajes (5).
            SliverToBoxAdapter(
              child: HomeRecentChats(
                myUserId: myUserId ?? 0,
                rooms: recentRooms,
                onOpen: (room) {
                  final other = room.otherParty(myUserId ?? 0);
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ChatScreen(
                        roomId: room.id,
                        seedTitle: other.title,
                        seedAvatarUrl: other.avatarUrl,
                      ),
                    ),
                  );
                },
                onViewAll: () => widget.onChangeTab(5),
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
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }
}
