import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/constants/feature_flags.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import 'package:mobile/features/ai_assistant/presentation/ai_assistant_fab.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../../features/subastas/presentation/providers/subastas_provider.dart';
import '../../../../features/subastas/presentation/screens/oportunidades_tab.dart';
import '../../../provider_dashboard/presentation/providers/dashboard_provider.dart';
import '../../../showcase/showcase_data.dart';
import '../../../showcase/showcase_overlay.dart';
import 'panel_home_tab.dart';
import 'panel_profile_tab.dart';
import 'panel_services_tab.dart';
import 'panel_stats_tab.dart';
import 'panel_settings_tab.dart';
import '../../../chat/presentation/screens/chat_list_screen.dart';
import '../../../chat/presentation/providers/chat_provider.dart';

/// Índices del IndexedStack/BottomNav del panel proveedor. Dependen de
/// kSubastasEnabled: el tab Oportunidades ('Ofertas', índice 2) se quita
/// con collection-if y los siguientes se corren un lugar. Cualquier salto
/// de tab hardcodeado debe usar estas constantes, nunca números sueltos.
const int kPanelTabInicio = 0;
const int kPanelTabPerfil = 1;
const int kPanelTabServicios = kSubastasEnabled ? 3 : 2;
const int kPanelTabStats = kSubastasEnabled ? 4 : 3;
const int kPanelTabMensajes = kSubastasEnabled ? 5 : 4;
const int kPanelTabAjustes = kSubastasEnabled ? 6 : 5;

class ProviderPanel extends StatefulWidget {
  /// Tipo de perfil que abre el panel: 'OFICIO' | 'NEGOCIO' | null (usa activeProfileType)
  final String? providerType;

  /// Tab inicial al abrir el panel. Por defecto 0 (Inicio). Se usa, por
  /// ejemplo, al pulsar "Editar oferta" para aterrizar en Servicios (3).
  final int initialTabIndex;
  const ProviderPanel({super.key, this.providerType, this.initialTabIndex = 0});

  @override
  State<ProviderPanel> createState() => _ProviderPanelState();
}

class _ProviderPanelState extends State<ProviderPanel> {
  // Clamp: deep-links viejos (?tab=N de notifs FCM persistidas) pueden
  // apuntar a un índice que ya no existe tras ocultar Oportunidades.
  late int _currentIndex = widget.initialTabIndex.clamp(0, kPanelTabAjustes);

  // Shared mutable state — paused flag visible to all tabs
  bool _isPaused = false;

  void _togglePause(bool paused) => setState(() => _isPaused = paused);

  void _changeTab(int i) {
    if (i == _currentIndex) return;
    setState(() => _currentIndex = i);
  }

  /// Back del sistema: desde CUALQUIER tab salta directo a Inicio (sin
  /// deshacer tab por tab — antes el historial hacía tedioso salir del
  /// panel); desde Inicio sí sale a la pantalla principal.
  void _handleBack() {
    if (_currentIndex != 0) {
      setState(() => _currentIndex = 0);
    }
  }

  @override
  void initState() {
    super.initState();
    // Si se especifica un tipo, sincronizar el perfil activo y cargar el dashboard correcto
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (widget.providerType != null) {
        auth.switchProfile(widget.providerType!);
      }
      final dash = context.read<DashboardProvider>();
      // Limpia la caché del dashboard al cerrar sesión (independencia de
      // cuentas) — requisito del stale-while-revalidate de loadDashboard.
      dash.attachAuth(auth);
      dash.loadDashboard(
        providerType: widget.providerType ?? auth.activeProfileType,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.watch<AuthProvider>();
    final isNeg = (widget.providerType ?? auth.activeProfileType) == 'NEGOCIO';

    return AdminShowcaseWrapper(
      child: PopScope(
        // Solo se sale del panel desde Inicio; en cualquier otra tab el back
        // salta a Inicio primero (un solo paso, sin historial).
        canPop: _currentIndex == 0,
        onPopInvokedWithResult: (didPop, _) {
          if (didPop) return;
          _handleBack();
        },
        child: Scaffold(
          backgroundColor: c.bg,
          // FAB ámbar de Ofi — abre el chat con el perfil activo como contexto.
          floatingActionButton: AiAssistantFab(
            providerType: widget.providerType ?? auth.activeProfileType,
          ),
          appBar: _PanelAppBar(
            activeType: isNeg ? 'NEGOCIO' : 'OFICIO',
            hasOficio: auth.hasOficioProfile,
            hasNegocio: auth.hasNegocioProfile,
            onSwitch: (type) {
              auth.switchProfile(type);
              context.read<DashboardProvider>().loadDashboard(
                providerType: type,
              );
            },
            onLogout: () => _confirmLogout(context),
          ),
          body: Stack(
            children: [
              ChangeNotifierProvider(
                create: (_) => SubastasProvider(),
                // Fade suave (~200ms) al cambiar de tab — el IndexedStack se
                // mantiene (preserva el estado de cada tab) y solo se anima la
                // opacidad mediante una key por índice. No altera navegación.
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  switchInCurve: Curves.easeOut,
                  switchOutCurve: Curves.easeIn,
                  child: IndexedStack(
                    key: ValueKey<int>(_currentIndex),
                    index: _currentIndex,
                    children: [
                      PanelHomeTab(
                        isNegocio: isNeg,
                        isPaused: _isPaused,
                        onChangeTab: _changeTab,
                      ),
                      PanelProfileTab(
                        isNegocio: isNeg,
                        isPaused: _isPaused,
                        onPauseToggle: _togglePause,
                      ),
                      // Feature OCULTA (kSubastasEnabled) — mismo flag en el
                      // nav item 'Ofertas' de abajo: índices siempre parejos.
                      if (kSubastasEnabled) const OportunidadesTab(),
                      PanelServicesTab(isNegocio: isNeg),
                      PanelStatsTab(
                        isNegocio: isNeg,
                        onNavigateToSettings: () =>
                            _changeTab(kPanelTabAjustes),
                      ),
                      // scope:'provider' + providerType separa la bandeja
                      // de cada perfil. Si el user es OFICIO y NEGOCIO a la
                      // vez, ver mensajes en el panel de NEGOCIO no muestra
                      // los del panel de OFICIO ni los del rol cliente.
                      ChatListScreen(
                        scope: 'provider',
                        providerType:
                            widget.providerType ?? auth.activeProfileType,
                      ),
                      const PanelSettingsTab(),
                    ],
                  ),
                ),
              ),
            ],
          ),
          bottomNavigationBar: _PanelBottomNav(
            currentIndex: _currentIndex,
            // Cancelar showcase activo ANTES de cambiar de tab — el
            // tutorial de un tab no debe seguir corriendo en otro.
            onTap: (i) {
              AdminTabShowcase.dismissActive(context);
              _changeTab(i);
            },
            isPaused: _isPaused,
            isNegocio: isNeg,
          ),
        ),
      ),
    );
  }

  // ── Confirmación de logout reutilizable desde el AppBar ────
  void _confirmLogout(BuildContext context) {
    final c = context.colors;
    final auth = context.read<AuthProvider>();
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Cerrar sesión',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
        content: Text(
          '¿Seguro que quieres cerrar sesión?',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(dialogCtx);
              await auth.logout();
              if (!context.mounted) return;
              // Pop hasta raíz para que _AppRoot reconstruya el árbol según el
              // nuevo estado (unauthenticated).
              Navigator.of(
                context,
                rootNavigator: true,
              ).popUntil((r) => r.isFirst);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(
              'Cerrar sesión',
              style: TextStyle(color: AppColors.onSolid(AppColors.busy)),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── AppBar del panel: switcher de perfil + menú ──────────────
//
// Cuando el usuario tiene los dos tipos de perfil (OFICIO y NEGOCIO),
// muestra un chip clickable en el title que abre un menú para alternar
// entre ambos. Si sólo tiene uno, muestra el tipo como etiqueta estática.
// El icono de menú overflow expone "Cerrar sesión" de forma siempre
// visible, sin importar en qué tab esté el usuario.

class _PanelAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String activeType; // 'OFICIO' | 'NEGOCIO'
  final bool hasOficio;
  final bool hasNegocio;
  final ValueChanged<String> onSwitch;
  final VoidCallback onLogout;

  const _PanelAppBar({
    required this.activeType,
    required this.hasOficio,
    required this.hasNegocio,
    required this.onSwitch,
    required this.onLogout,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  bool get _canSwitch => hasOficio && hasNegocio;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isNeg = activeType == 'NEGOCIO';
    final label = isNeg ? 'Panel Negocio' : 'Panel Profesional';

    return AppBar(
      backgroundColor: c.bg,
      elevation: 0,
      automaticallyImplyLeading: false,
      titleSpacing: 16,
      title: GestureDetector(
        onTap: _canSwitch ? () => _showSwitcher(context) : null,
        behavior: HitTestBehavior.opaque,
        child: Row(
          children: [
            // Solo el caso "ambos perfiles" lleva ShowcaseTarget — si
            // el user tiene un único perfil, el chip es estático y no
            // aporta valor destacarlo.
            _canSwitch
                ? ShowcaseTarget(
                    // C-10: misma constante que consume buildAdminHomeSteps —
                    // evita divergencia si los textos cambian. El switch
                    // role siempre es el ÚLTIMO paso del deck home (cuando
                    // existe, hasBothProfiles=true).
                    step: kAdminSwitchRoleStep,
                    isLast: true,
                    child: _buildSwitchChip(context, isNeg, label),
                  )
                : _buildSwitchChip(context, isNeg, label),
          ],
        ),
      ),
      actions: [
        PopupMenuButton<String>(
          tooltip: 'Más opciones',
          icon: Icon(Icons.more_vert_rounded, color: c.textSecondary),
          color: c.bgCard,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          onSelected: (value) {
            if (value == 'logout') onLogout();
            if (value == 'switch_oficio') onSwitch('OFICIO');
            if (value == 'switch_negocio') onSwitch('NEGOCIO');
          },
          itemBuilder: (_) => [
            if (_canSwitch && activeType != 'OFICIO')
              PopupMenuItem(
                value: 'switch_oficio',
                child: Row(
                  children: [
                    Icon(
                      Icons.handyman_rounded,
                      size: 16,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Ir a Panel Profesional',
                      style: TextStyle(color: c.textPrimary, fontSize: 13.5),
                    ),
                  ],
                ),
              ),
            if (_canSwitch && activeType != 'NEGOCIO')
              PopupMenuItem(
                value: 'switch_negocio',
                child: Row(
                  children: [
                    Icon(Icons.store_rounded, size: 16, color: AppColors.amber),
                    const SizedBox(width: 10),
                    Text(
                      'Ir a Panel Negocio',
                      style: TextStyle(color: c.textPrimary, fontSize: 13.5),
                    ),
                  ],
                ),
              ),
            if (_canSwitch) const PopupMenuDivider(),
            PopupMenuItem(
              value: 'logout',
              child: Row(
                children: [
                  Icon(Icons.logout_rounded, size: 16, color: AppColors.busy),
                  const SizedBox(width: 10),
                  Text(
                    'Cerrar sesión',
                    style: TextStyle(
                      color: AppColors.busy,
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSwitchChip(BuildContext context, bool isNeg, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isNeg
            ? AppColors.amber.withValues(alpha: 0.12)
            : AppColors.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: (isNeg ? AppColors.amber : AppColors.primary).withValues(
            alpha: 0.35,
          ),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isNeg ? Icons.store_rounded : Icons.handyman_rounded,
            size: 14,
            color: isNeg ? AppColors.amber : AppColors.primary,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: isNeg ? AppColors.amber : AppColors.primary,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (_canSwitch) ...[
            const SizedBox(width: 6),
            Icon(
              Icons.swap_horiz_rounded,
              size: 14,
              color: isNeg ? AppColors.amber : AppColors.primary,
            ),
          ],
        ],
      ),
    );
  }

  void _showSwitcher(BuildContext context) {
    final c = context.colors;
    showModalBottomSheet(
      context: context,
      backgroundColor: c.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: c.textMuted.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Cambiar de panel',
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 14),
              _SwitcherOption(
                icon: Icons.handyman_rounded,
                color: AppColors.primary,
                title: 'Panel Profesional',
                subtitle: 'Tu perfil OFICIO',
                selected: activeType == 'OFICIO',
                onTap: () {
                  Navigator.pop(context);
                  if (activeType != 'OFICIO') onSwitch('OFICIO');
                },
              ),
              const SizedBox(height: 8),
              _SwitcherOption(
                icon: Icons.store_rounded,
                color: AppColors.amber,
                title: 'Panel Negocio',
                subtitle: 'Tu perfil NEGOCIO',
                selected: activeType == 'NEGOCIO',
                onTap: () {
                  Navigator.pop(context);
                  if (activeType != 'NEGOCIO') onSwitch('NEGOCIO');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SwitcherOption extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _SwitcherOption({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.10) : c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? color : c.border,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: c.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(color: c.textMuted, fontSize: 11.5),
                  ),
                ],
              ),
            ),
            if (selected)
              Icon(Icons.check_circle_rounded, color: color, size: 20),
          ],
        ),
      ),
    );
  }
}

// ─── Barra de navegación del panel ───────────────────────────

class _PanelBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool isPaused;
  final bool isNegocio;

  const _PanelBottomNav({
    required this.currentIndex,
    required this.onTap,
    required this.isPaused,
    this.isNegocio = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        border: Border(top: BorderSide(color: c.border, width: 0.5)),
      ),
      child: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: onTap,
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppColors.amber,
        unselectedItemColor: c.textMuted,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: TextStyle(fontSize: 10),
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.home_rounded),
            label: 'Inicio',
          ),
          BottomNavigationBarItem(
            icon: Badge(
              isLabelVisible: isPaused,
              label: Text('!'),
              backgroundColor: AppColors.delayed,
              child: const Icon(Icons.manage_accounts_rounded),
            ),
            label: 'Perfil',
          ),
          // Feature OCULTA (kSubastasEnabled): tab Oportunidades del panel.
          if (kSubastasEnabled)
            const BottomNavigationBarItem(
              icon: Icon(Icons.bolt_rounded),
              label: 'Ofertas',
            ),
          BottomNavigationBarItem(
            icon: Icon(
              isNegocio
                  ? Icons.inventory_2_rounded
                  : Icons.design_services_rounded,
            ),
            label: isNegocio ? 'Productos' : 'Servicios',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.bar_chart_rounded),
            label: 'Estadísticas',
          ),
          BottomNavigationBarItem(
            icon: Consumer<ChatProvider>(
              builder: (_, chat, child) => Badge(
                isLabelVisible: chat.totalUnread > 0,
                label: Text(
                  chat.totalUnread > 99 ? '99+' : '${chat.totalUnread}',
                ),
                backgroundColor: AppColors.busy,
                child: child,
              ),
              child: const Icon(Icons.forum_rounded),
            ),
            label: 'Mensajes',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.settings_rounded),
            label: 'Ajustes',
          ),
        ],
      ),
    );
  }
}
