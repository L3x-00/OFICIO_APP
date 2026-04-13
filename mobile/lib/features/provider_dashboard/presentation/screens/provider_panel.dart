import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:provider/provider.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import '../../../provider_dashboard/presentation/providers/dashboard_provider.dart';
import 'panel_home_tab.dart';
import 'panel_profile_tab.dart';
import 'panel_services_tab.dart';
import 'panel_stats_tab.dart';
import 'panel_settings_tab.dart';

class ProviderPanel extends StatefulWidget {
  /// Tipo de perfil que abre el panel: 'OFICIO' | 'NEGOCIO' | null (usa activeProfileType)
  final String? providerType;
  const ProviderPanel({super.key, this.providerType});

  @override
  State<ProviderPanel> createState() => _ProviderPanelState();
}

class _ProviderPanelState extends State<ProviderPanel> {
  int _currentIndex = 0;

  // Shared mutable state — paused flag visible to all tabs
  bool _isPaused = false;

  void _togglePause(bool paused) => setState(() => _isPaused = paused);

  @override
  void initState() {
    super.initState();
    // Si se especifica un tipo, sincronizar el perfil activo y cargar el dashboard correcto
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (widget.providerType != null) {
        auth.switchProfile(widget.providerType!);
      }
      context.read<DashboardProvider>().loadDashboard(
        providerType: widget.providerType ?? auth.activeProfileType,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth    = context.watch<AuthProvider>();
    final isNeg   = (widget.providerType ?? auth.activeProfileType) == 'NEGOCIO';

    return Scaffold(
      backgroundColor: c.bg,
      body: Stack(
        children: [
          IndexedStack(
            index: _currentIndex,
            children: [
              PanelHomeTab(
                isNegocio: isNeg,
                isPaused: _isPaused,
                onChangeTab: (i) => setState(() => _currentIndex = i),
              ),
              PanelProfileTab(
                isNegocio: isNeg,
                isPaused: _isPaused,
                onPauseToggle: _togglePause,
              ),
              PanelServicesTab(isNegocio: isNeg),
              const PanelStatsTab(),
              const PanelSettingsTab(),
            ],
          ),

          // ── Botón de atrás flotante ───────────────────────
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 12,
            child: SafeArea(
              child: GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: c.bgCard.withValues(alpha: 0.92),
                    shape: BoxShape.circle,
                    border: Border.all(color: c.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.18),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Icon(
                    Icons.arrow_back_ios_new_rounded,
                    color: c.textPrimary,
                    size: 16,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _PanelBottomNav(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        isPaused: _isPaused,
      ),
    );
  }
}

// ─── Barra de navegación del panel ───────────────────────────

class _PanelBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool isPaused;

  const _PanelBottomNav({
    required this.currentIndex,
    required this.onTap,
    required this.isPaused,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        border: Border(
          top: BorderSide(color: Colors.white.withValues(alpha: 0.06)),
        ),
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
          const BottomNavigationBarItem(
            icon: Icon(Icons.design_services_rounded),
            label: 'Servicios',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.bar_chart_rounded),
            label: 'Estadísticas',
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
