import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/theme/theme_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';
import '../../domain/models/dashboard_profile_model.dart';

class PanelSettingsTab extends StatelessWidget {
  const PanelSettingsTab({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth    = context.watch<AuthProvider>();
    final dash    = context.watch<DashboardProvider>();
    final theme   = context.watch<ThemeProvider>();
    final profile = dash.profile;

    return Scaffold(
      backgroundColor: c.bg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: c.bgCard,
            pinned: true,
            title: Text(
              'Configuración',
              style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar y nombre
                  _buildProfileHeader(context, auth, profile),
                  const SizedBox(height: 24),

                  // Cuenta
                  _SectionLabel(label: 'Cuenta'),
                  _SettingsTile(
                    icon: Icons.person_rounded,
                    label: 'Nombre de usuario',
                    subtitle: auth.user?.fullName ?? '',
                    onTap: null,
                  ),
                  _SettingsTile(
                    icon: Icons.email_rounded,
                    label: 'Correo electrónico',
                    subtitle: auth.user?.email ?? '',
                    onTap: null,
                  ),
                  _SettingsTile(
                    icon: Icons.phone_rounded,
                    label: 'Teléfono de cuenta',
                    subtitle: auth.user?.phone ?? 'No configurado',
                    onTap: null,
                  ),
                  const SizedBox(height: 16),

                  // Mi suscripción
                  if (profile?.subscription != null) ...[
                    _SectionLabel(label: 'Suscripción'),
                    _SubscriptionCard(sub: profile!.subscription!),
                    const SizedBox(height: 16),
                  ],

                  // Apariencia
                  _SectionLabel(label: 'Apariencia'),
                  _SettingsSwitch(
                    icon: theme.isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                    label: theme.isDark ? 'Tema oscuro' : 'Tema claro',
                    subtitle: 'Cambiar entre tema claro y oscuro',
                    value: !theme.isDark,
                    onChanged: (_) => theme.toggle(),
                  ),
                  const SizedBox(height: 16),

                  // Notificaciones
                  _SectionLabel(label: 'Notificaciones'),
                  _SettingsSwitch(
                    icon: Icons.notifications_rounded,
                    label: 'Nuevas reseñas',
                    subtitle: 'Recibir aviso cuando alguien te califica',
                    value: true,
                    onChanged: (_) {},
                  ),
                  _SettingsSwitch(
                    icon: Icons.chat_bubble_rounded,
                    label: 'Mensajes de WhatsApp',
                    subtitle: 'Notificación cuando alguien te contacta',
                    value: true,
                    onChanged: (_) {},
                  ),
                  const SizedBox(height: 16),

                  // Privacidad
                  _SectionLabel(label: 'Privacidad'),
                  _SettingsTile(
                    icon: Icons.privacy_tip_rounded,
                    label: 'Política de privacidad',
                    onTap: () {},
                  ),
                  _SettingsTile(
                    icon: Icons.description_rounded,
                    label: 'Términos y condiciones',
                    onTap: () {},
                  ),
                  const SizedBox(height: 16),

                  // Soporte
                  _SectionLabel(label: 'Soporte'),
                  _SettingsTile(
                    icon: Icons.help_outline_rounded,
                    label: 'Centro de ayuda',
                    onTap: () {},
                  ),
                  _SettingsTile(
                    icon: Icons.bug_report_rounded,
                    label: 'Reportar un problema',
                    onTap: () => _showReportDialog(context),
                  ),
                  const SizedBox(height: 24),

                  // Cerrar sesión
                  _LogoutButton(onTap: () => _confirmLogout(context, auth)),

                  // Versión
                  const SizedBox(height: 20),
                  Center(
                    child: Text(
                      'ConfiServ v1.0.0 — Panel de Profesionales',
                      style: TextStyle(color: c.textMuted, fontSize: 11),
                    ),
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileHeader(BuildContext context, AuthProvider auth, DashboardProfileModel? profile) {
    final c = context.colors;
    final name    = profile?.businessName ?? auth.user?.fullName ?? 'Mi negocio';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final type    = profile?.type == 'NEGOCIO' ? 'Negocio' : 'Profesional';
    final plan    = profile?.subscription?.planLabel ?? 'Gratis';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: c.warmDeep,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.amber, width: 2),
            ),
            child: Center(
              child: Text(
                initial,
                style: TextStyle(
                  color: AppColors.amber,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.amber.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        type,
                        style: TextStyle(color: AppColors.amber, fontSize: 11),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'Plan $plan',
                        style: TextStyle(color: AppColors.primary, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _confirmLogout(BuildContext context, AuthProvider auth) {
    final c = context.colors;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Cerrar sesión',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
        content: Text(
          '¿Seguro que quieres cerrar sesión en tu panel de profesional?',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              auth.logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text('Cerrar sesión', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showReportDialog(BuildContext context) {
    final c = context.colors;
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Reportar un problema',
          style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
        ),
        content: TextField(
          controller: ctrl,
          maxLines: 4,
          style: TextStyle(color: c.textPrimary, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Describe el problema que encontraste...',
            hintStyle: TextStyle(color: c.textMuted, fontSize: 13),
            filled: true,
            fillColor: c.bgInput,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Reporte enviado. ¡Gracias por ayudarnos a mejorar!'),
                  backgroundColor: c.bgCard,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.amber,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text('Enviar', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

// ─── WIDGETS LOCALES ──────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String label;
  const _SectionLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: AppColors.amber,
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final VoidCallback? onTap;
  final Color? iconColor;

  const _SettingsTile({
    required this.icon,
    required this.label,
    this.subtitle,
    this.onTap,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Row(
          children: [
            Icon(icon, color: iconColor ?? c.textSecondary, size: 20),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(color: c.textPrimary, fontSize: 14),
                  ),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: TextStyle(color: c.textMuted, fontSize: 12),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            if (onTap != null)
              Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}

class _SettingsSwitch extends StatefulWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SettingsSwitch({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  State<_SettingsSwitch> createState() => _SettingsSwitchState();
}

class _SettingsSwitchState extends State<_SettingsSwitch> {
  late bool _value;

  @override
  void initState() {
    super.initState();
    _value = widget.value;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        children: [
          Icon(widget.icon, color: c.textSecondary, size: 20),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.label, style: TextStyle(color: c.textPrimary, fontSize: 14)),
                const SizedBox(height: 2),
                Text(widget.subtitle, style: TextStyle(color: c.textMuted, fontSize: 12)),
              ],
            ),
          ),
          Switch(
            value: _value,
            onChanged: (v) {
              setState(() => _value = v);
              widget.onChanged(v);
            },
            activeColor: AppColors.amber,
          ),
        ],
      ),
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  final SubscriptionInfo sub;
  const _SubscriptionCard({required this.sub});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isActive = sub.isActive;
    final color = isActive ? AppColors.amber : AppColors.busy;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.workspace_premium_rounded,
            color: color,
            size: 28,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Plan ${sub.planLabel}',
                  style: TextStyle(
                    color: color,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  isActive ? 'Suscripción activa' : 'Suscripción inactiva',
                  style: TextStyle(color: c.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          if (!isActive)
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.amber,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text('Renovar', style: TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
    );
  }
}

class _LogoutButton extends StatelessWidget {
  final VoidCallback onTap;
  const _LogoutButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(Icons.logout_rounded, size: 18),
        label: Text('Cerrar sesión'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.busy,
          side: const BorderSide(color: AppColors.busy),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }
}
