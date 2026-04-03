import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:provider/provider.dart';
import '../../../../features/auth/presentation/providers/auth_provider.dart';
import 'panel_home_tab.dart';
import 'panel_profile_tab.dart';
import 'panel_services_tab.dart';
import 'panel_stats_tab.dart';
import 'panel_settings_tab.dart';

class ProviderPanel extends StatefulWidget {
  const ProviderPanel({super.key});

  @override
  State<ProviderPanel> createState() => _ProviderPanelState();
}

class _ProviderPanelState extends State<ProviderPanel> {
  int _currentIndex = 0;

  // Shared mutable state — paused flag visible to all tabs
  bool _isPaused = false;

  void _togglePause(bool paused) => setState(() => _isPaused = paused);

  @override
  Widget build(BuildContext context) {
    final auth    = context.watch<AuthProvider>();
    final isNeg   = auth.activeProfileType == 'NEGOCIO';

    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: IndexedStack(
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
    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        border: Border(
          top: BorderSide(color: Colors.white.withOpacity(0.06)),
        ),
      ),
      child: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: onTap,
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: AppColors.amber,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: const TextStyle(fontSize: 10),
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.home_rounded),
            label: 'Inicio',
          ),
          BottomNavigationBarItem(
            icon: Badge(
              isLabelVisible: isPaused,
              label: const Text('!'),
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
