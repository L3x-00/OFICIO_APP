import 'package:flutter/material.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'onboarding_screen.dart';
import 'saved_accounts_screen.dart';
import 'welcome_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth  = context.watch<AuthProvider>();
    final theme = context.watch<ThemeProvider>();
    final c     = context.colors;
    final user  = auth.user;

    // ── Estado invitado ────────────────────────────────────
    if (user == null) {
      return Scaffold(
        backgroundColor: c.bg,
        appBar: AppBar(
          backgroundColor: c.bg,
          elevation: 0,
          title: Text('Mi perfil', style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
          actions: [
            IconButton(
              tooltip: theme.isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                transitionBuilder: (child, anim) =>
                    RotationTransition(turns: anim, child: FadeTransition(opacity: anim, child: child)),
                child: Icon(
                  theme.isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                  key: ValueKey(theme.isDark),
                  color: AppColors.amber,
                  size: 22,
                ),
              ),
              onPressed: theme.toggle,
            ),
            const SizedBox(width: 4),
          ],
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 36),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.person_outline_rounded, color: AppColors.primary, size: 40),
                ),
                const SizedBox(height: 20),
                Text(
                  'Tu perfil te espera',
                  style: TextStyle(color: c.textPrimary, fontSize: 20, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                Text(
                  'Inicia sesión para gestionar tu perfil, ver tus notificaciones y ser parte de la comunidad.',
                  style: TextStyle(color: c.textSecondary, fontSize: 14, height: 1.6),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text(
                      'Iniciar sesión / Registrarse',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        title: Text(
          'Mi perfil',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
        actions: [
          // ── Botón de cambio de tema ──────────────────────
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: IconButton(
              tooltip: theme.isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                transitionBuilder: (child, anim) =>
                    RotationTransition(turns: anim, child: FadeTransition(opacity: anim, child: child)),
                child: Icon(
                  theme.isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                  key: ValueKey(theme.isDark),
                  color: AppColors.amber,
                  size: 22,
                ),
              ),
              onPressed: theme.toggle,
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Avatar + nombre
          Center(
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [AppColors.primary, AppColors.primaryDark],
                    ),
                  ),
                  child: Center(
                    child: Text(
                      user?.firstName.isNotEmpty == true
                          ? user!.firstName[0].toUpperCase()
                          : '?',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  user?.fullName ?? 'Usuario',
                  style: TextStyle(color: c.textPrimary, fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? '',
                  style: TextStyle(color: c.textSecondary, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    _roleLabel(user?.role ?? 'USUARIO'),
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          _SectionTitle(title: 'Información de cuenta'),
          const SizedBox(height: 12),
          _InfoRow(icon: Icons.email_outlined,  label: 'Correo',         value: user?.email     ?? '-'),
          _InfoRow(icon: Icons.person_outline,  label: 'Nombre completo',value: user?.fullName  ?? '-'),
          _InfoRow(icon: Icons.shield_outlined, label: 'Tipo de cuenta', value: _roleLabel(user?.role ?? 'USUARIO')),
          const SizedBox(height: 28),

          if (auth.hasOficioProfile || auth.hasNegocioProfile) ...[
            const _SectionTitle(title: 'MIS PERFILES DE PROVEEDOR'),
            const SizedBox(height: 12),
            if (auth.hasOficioProfile && auth.hasNegocioProfile) ...[
              _ProfileSwitcher(auth: auth),
              const SizedBox(height: 12),
            ],
            _ActionButton(
              icon: Icons.tune_rounded,
              label: auth.activeProfileType == 'NEGOCIO'
                  ? 'Gestionar mi negocio'
                  : 'Gestionar mi perfil profesional',
              color: auth.activeProfileType == 'NEGOCIO'
                  ? const Color(0xFF8E2DE2)
                  : AppColors.primary,
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Edición de perfil — próximamente')),
                );
              },
            ),
            const SizedBox(height: 10),
            if (auth.hasOficioProfile && !auth.hasNegocioProfile)
              _ActionButton(
                icon: Icons.storefront_rounded,
                label: 'Agregar perfil de negocio',
                color: const Color(0xFF8E2DE2),
                onTap: () => _openAddProfile(context, 'NEGOCIO'),
              ),
            if (auth.hasNegocioProfile && !auth.hasOficioProfile)
              _ActionButton(
                icon: Icons.handyman_rounded,
                label: 'Agregar perfil profesional',
                color: AppColors.primary,
                onTap: () => _openAddProfile(context, 'OFICIO'),
              ),
            const SizedBox(height: 20),
          ],

          if (user?.isProvider != true) ...[
            _ActionButton(
              icon: Icons.rocket_launch_rounded,
              label: '¡Quiero ser proveedor!',
              color: AppColors.amber,
              onTap: () => _openAddProfile(context, 'OFICIO'),
            ),
            const SizedBox(height: 12),
          ],

          // ── Toggle de tema (también accesible aquí) ──────
          _ThemeToggleRow(theme: theme),
          const SizedBox(height: 12),

          // ── Cuentas guardadas ─────────────────────────────
          _ActionButton(
            icon: Icons.devices_rounded,
            label: 'Cuentas guardadas en este dispositivo',
            color: AppColors.primary,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                  builder: (_) => const SavedAccountsScreen()),
            ),
          ),
          const SizedBox(height: 12),

          _ActionButton(
            icon: Icons.logout_rounded,
            label: 'Cerrar sesión',
            color: AppColors.busy,
            onTap: () => _confirmLogout(context, auth),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  String _roleLabel(String role) {
    return switch (role) {
      'ADMIN'     => 'Administrador',
      'PROVEEDOR' => 'Proveedor',
      _           => 'Cliente',
    };
  }

  void _openAddProfile(BuildContext context, String type) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProviderOnboardingForm(providerType: type, isStandalone: true),
      ),
    );
  }

  void _confirmLogout(BuildContext context, AuthProvider auth) {
    final c = context.colors;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Cerrar sesión', style: TextStyle(color: c.textPrimary)),
        content: Text('¿Estás seguro de que deseas salir?', style: TextStyle(color: c.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await auth.logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Salir', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// ─── Widgets auxiliares ───────────────────────────────────

class _ThemeToggleRow extends StatelessWidget {
  final ThemeProvider theme;
  const _ThemeToggleRow({required this.theme});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: theme.toggle,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.border),
        ),
        child: Row(
          children: [
            Icon(
              theme.isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
              color: AppColors.amber,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                theme.isDark ? 'Tema oscuro' : 'Tema claro',
                style: TextStyle(color: c.textPrimary, fontSize: 15, fontWeight: FontWeight.w500),
              ),
            ),
            Switch(
              value: !theme.isDark,
              onChanged: (_) => theme.toggle(),
              activeColor: AppColors.amber,
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: TextStyle(
        color: context.colors.textMuted,
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border),
        boxShadow: c.isDark ? null : [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6)],
      ),
      child: Row(
        children: [
          Icon(icon, color: c.textMuted, size: 18),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(color: c.textMuted, fontSize: 11)),
              const SizedBox(height: 2),
              Text(value, style: TextStyle(color: c.textPrimary, fontSize: 14, fontWeight: FontWeight.w500)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 12),
            Text(label, style: TextStyle(color: color, fontSize: 15, fontWeight: FontWeight.w600)),
            const Spacer(),
            Icon(Icons.arrow_forward_ios_rounded, color: color, size: 14),
          ],
        ),
      ),
    );
  }
}

class _ProfileSwitcher extends StatelessWidget {
  final AuthProvider auth;
  const _ProfileSwitcher({required this.auth});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Row(
        children: [
          if (auth.hasOficioProfile)
            Expanded(child: _ProfileTab(icon: Icons.handyman_rounded,  label: 'Profesional', color: AppColors.primary,        isActive: auth.activeProfileType == 'OFICIO',  onTap: () => auth.switchProfile('OFICIO'))),
          if (auth.hasOficioProfile && auth.hasNegocioProfile)
            const SizedBox(width: 4),
          if (auth.hasNegocioProfile)
            Expanded(child: _ProfileTab(icon: Icons.storefront_rounded, label: 'Mi Negocio',  color: const Color(0xFF8E2DE2), isActive: auth.activeProfileType == 'NEGOCIO', onTap: () => auth.switchProfile('NEGOCIO'))),
        ],
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool isActive;
  final VoidCallback onTap;

  const _ProfileTab({required this.icon, required this.label, required this.color, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isActive ? color.withValues(alpha: 0.14) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: isActive ? Border.all(color: color.withValues(alpha: 0.4)) : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: isActive ? color : c.textMuted, size: 18),
            const SizedBox(width: 7),
            Text(
              label,
              style: TextStyle(
                color: isActive ? color : c.textMuted,
                fontSize: 13,
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
