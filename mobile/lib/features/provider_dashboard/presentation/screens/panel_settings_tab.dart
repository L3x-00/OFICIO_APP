import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:mobile/shared/widgets/app_snack_bar.dart';
import 'package:provider/provider.dart';
import '../../../../core/constans/app_colors.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/theme/theme_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';
import '../../domain/models/dashboard_profile_model.dart';
import '../../data/dashboard_repository.dart';
import '../../../payments/presentation/screens/yape_payment_screen.dart';

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
                  const SizedBox(height: 20),

                  _SettingsSection(
                    icon: Icons.person_rounded,
                    title: 'Cuenta',
                    children: [
                      _SettingsTile(
                        icon: Icons.person_rounded,
                        label: 'Nombre de usuario',
                        subtitle: auth.user?.fullName ?? '',
                      ),
                      _SettingsTile(
                        icon: Icons.email_rounded,
                        label: 'Correo electrónico',
                        subtitle: auth.user?.email ?? '',
                      ),
                      _SettingsTile(
                        icon: Icons.phone_rounded,
                        label: 'Teléfono de cuenta',
                        subtitle: auth.user?.phone ?? 'No configurado',
                      ),
                      _DangerTile(
                        icon: Icons.person_remove_rounded,
                        label: profile?.type == 'NEGOCIO'
                            ? 'Eliminar perfil de negocio'
                            : 'Eliminar perfil profesional',
                        subtitle: auth.hasOficioProfile && auth.hasNegocioProfile
                            ? 'Solo elimina este perfil, el otro se mantiene'
                            : 'Pasarás a ser cliente al eliminar este perfil',
                        onTap: () => _confirmDeleteProfile(context, dash, auth, profile?.type),
                      ),
                    ],
                  ),

                  _SettingsSection(
                    icon: Icons.workspace_premium_rounded,
                    title: 'Suscripción y planes',
                    children: [
                      if (profile?.subscription != null) ...[
                        _SubscriptionCard(sub: profile!.subscription!),
                        const SizedBox(height: 10),
                      ],
                      _CollapsiblePlansSection(
                        currentPlan: profile?.subscription?.plan ?? 'GRATIS',
                      ),
                      if (profile?.subscription != null &&
                          profile!.subscription!.isActive &&
                          profile.subscription!.plan != 'GRATIS') ...[
                        const SizedBox(height: 10),
                        _CancelPlanButton(dash: dash),
                      ],
                    ],
                  ),

                  if (profile?.type == 'OFICIO')
                    _SettingsSection(
                      icon: Icons.home_repair_service_rounded,
                      title: 'Servicio a domicilio',
                      children: [
                        _HomeServiceToggle(profile: profile, dash: dash),
                      ],
                    ),

                  _SettingsSection(
                    icon: Icons.palette_outlined,
                    title: 'Apariencia',
                    children: [
                      _SettingsSwitch(
                        icon: theme.isDark
                            ? Icons.dark_mode_rounded
                            : Icons.light_mode_rounded,
                        label: theme.isDark ? 'Tema oscuro' : 'Tema claro',
                        subtitle: 'Cambiar entre tema claro y oscuro',
                        value: !theme.isDark,
                        onChanged: (_) => theme.toggle(),
                      ),
                    ],
                  ),

                  _SettingsSection(
                    icon: Icons.notifications_outlined,
                    title: 'Notificaciones',
                    children: [
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
                    ],
                  ),

                  _SettingsSection(
                    icon: Icons.shield_outlined,
                    title: 'Legal y privacidad',
                    children: [
                      _SettingsTile(
                        icon: Icons.privacy_tip_rounded,
                        label: 'Política de privacidad',
                        onTap: () => _LegalSheet.show(
                          context,
                          type:    profile?.type ?? 'OFICIO',
                          section: _LegalSection.privacy,
                        ),
                      ),
                      _SettingsTile(
                        icon: Icons.description_rounded,
                        label: 'Términos y condiciones',
                        onTap: () => _LegalSheet.show(
                          context,
                          type:    profile?.type ?? 'OFICIO',
                          section: _LegalSection.terms,
                        ),
                      ),
                    ],
                  ),

                  _SettingsSection(
                    icon: Icons.help_outline_rounded,
                    title: 'Soporte',
                    children: [
                      _SettingsTile(
                        icon: Icons.help_outline_rounded,
                        label: 'Centro de ayuda',
                        onTap: () => _LegalSheet.show(
                          context,
                          type:    profile?.type ?? 'OFICIO',
                          section: _LegalSection.help,
                        ),
                      ),
                      _SettingsTile(
                        icon: Icons.bug_report_rounded,
                        label: 'Reportar un problema',
                        onTap: () => _showReportDialog(context),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  _LogoutButton(onTap: () => _confirmLogout(context, auth)),

                  const SizedBox(height: 20),
                  Center(
                    child: Text(
                      profile?.type == 'NEGOCIO'
                          ? 'ConfiServ v1.0.0 — Panel de Negocios'
                          : 'ConfiServ v1.0.0 — Panel Profesional',
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
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
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
                        color: AppColors.amber.withValues(alpha: 0.1),
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
                        color: AppColors.primary.withValues(alpha: 0.1),
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
            onPressed: () async {
              Navigator.pop(context); // cierra el diálogo de confirmación
              await auth.logout();
              if (!context.mounted) return;
              // Limpia todo el stack para que _AppRoot reconstruya desde la pantalla raíz
              Navigator.of(context, rootNavigator: true).popUntil((r) => r.isFirst);
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

  void _confirmDeleteProfile(
    BuildContext context,
    DashboardProvider dash,
    AuthProvider auth,
    String? profileType,
  ) {
    final c = context.colors;
    final isNegocio  = profileType == 'NEGOCIO';
    final typeLabel  = isNegocio ? 'negocio' : 'profesional';
    final hasBoth    = auth.hasOficioProfile && auth.hasNegocioProfile;
    final controller = TextEditingController();

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Eliminar perfil de $typeLabel',
          style: const TextStyle(color: AppColors.busy, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Se eliminará permanentemente tu tarjeta, fotos, reseñas y todos los datos de tu perfil de $typeLabel.',
              style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
            ),
            const SizedBox(height: 6),
            Text(
              hasBoth
                  ? 'Tu otro perfil se mantendrá activo.'
                  : 'Sin perfiles activos pasarás a ser cliente.',
              style: TextStyle(
                color: hasBoth ? c.textSecondary : AppColors.busy,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Escribe ELIMINAR para confirmar:',
              style: TextStyle(color: c.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: controller,
              style: TextStyle(color: c.textPrimary),
              decoration: InputDecoration(
                hintText: 'ELIMINAR',
                hintStyle: TextStyle(color: c.textMuted),
                filled: true,
                fillColor: c.bgInput,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              if (controller.text.trim().toUpperCase() != 'ELIMINAR') return;
              Navigator.pop(context);
              final ok = await dash.deleteProviderProfile();
              if (!context.mounted) return;
              if (ok) {
                await auth.refreshProviderStatus();
                if (!context.mounted) return;
                Navigator.of(context, rootNavigator: true).popUntil((r) => r.isFirst);
              } else {
                context.showErrorSnack(dash.error ?? 'Error al eliminar el perfil');
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Eliminar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showReportDialog(BuildContext context) {
    final c    = context.colors;
    final ctrl = TextEditingController();
    final auth = context.read<AuthProvider>();

    showDialog(
      context: context,
      builder: (ctx) => _ReportProblemDialog(
        colors: c,
        ctrl: ctrl,
        onSend: (description) async {
          final userId = auth.user?.id;
          if (userId == null) return;
          await DashboardRepository().reportPlatformIssue(
            userId:      userId,
            description: description,
          );
        },
      ),
    );
  }
}

// ─── WIDGETS LOCALES ──────────────────────────────────────────

class _SettingsSection extends StatefulWidget {
  final IconData icon;
  final String title;
  final List<Widget> children;
  const _SettingsSection({required this.icon, required this.title, required this.children});

  @override
  State<_SettingsSection> createState() => _SettingsSectionState();
}

class _SettingsSectionState extends State<_SettingsSection>
    with SingleTickerProviderStateMixin {
  bool _expanded = false;
  late final AnimationController _ctrl;
  late final Animation<double> _rotation;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 220));
    _rotation = Tween<double>(begin: 0.0, end: 0.5).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _expanded = !_expanded);
    _expanded ? _ctrl.forward() : _ctrl.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: _toggle,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Icon(widget.icon, color: AppColors.amber, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      widget.title,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  RotationTransition(
                    turns: _rotation,
                    child: Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.amber, size: 20),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 240),
            curve: Curves.easeInOut,
            child: _expanded
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                    child: Column(children: widget.children),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.label,
    this.subtitle,
    this.onTap,
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
          border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
        ),
        child: Row(
          children: [
            Icon(icon, color: c.textSecondary, size: 20),
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

class _DangerTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final VoidCallback? onTap;

  const _DangerTile({
    required this.icon,
    required this.label,
    this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(top: 4, bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.busy.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.busy.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.busy, size: 20),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      color: AppColors.busy,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: TextStyle(
                        color: AppColors.busy.withValues(alpha: 0.7),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded,
                color: AppColors.busy.withValues(alpha: 0.6), size: 18),
          ],
        ),
      ),
    );
  }
}

// ─── Dialog de reporte de problema ───────────────────────────

class _ReportProblemDialog extends StatefulWidget {
  final AppThemeColors colors;
  final TextEditingController ctrl;
  final Future<void> Function(String description) onSend;

  const _ReportProblemDialog({
    required this.colors,
    required this.ctrl,
    required this.onSend,
  });

  @override
  State<_ReportProblemDialog> createState() => _ReportProblemDialogState();
}

class _ReportProblemDialogState extends State<_ReportProblemDialog> {
  bool _sending = false;

  @override
  Widget build(BuildContext context) {
    final c = widget.colors;
    return AlertDialog(
      backgroundColor: c.bgCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text(
        'Reportar un problema',
        style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold),
      ),
      content: TextField(
        controller: widget.ctrl,
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
          onPressed: _sending ? null : () => Navigator.pop(context),
          child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
        ),
        ElevatedButton(
          onPressed: _sending ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.amber,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: _sending
              ? const SizedBox(
                  width: 16, height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                )
              : const Text('Enviar', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Future<void> _submit() async {
    final text = widget.ctrl.text.trim();
    if (text.length < 5) {
      context.showWarningSnack('Describe el problema con más detalle.');
      return;
    }
    setState(() => _sending = true);
    try {
      await widget.onSend(text);
      if (!mounted) return;
      Navigator.pop(context);
      context.showSuccessSnack('Reporte enviado. ¡Gracias por ayudarnos a mejorar!');
    } catch (_) {
      if (!mounted) return;
      setState(() => _sending = false);
      context.showErrorSnack('No se pudo enviar el reporte. Intenta de nuevo.');
    }
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
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
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
            activeThumbColor: AppColors.amber,
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
    final isFree   = sub.plan == 'GRATIS';
    final isActive = sub.isActive || isFree;
    final color    = isFree
        ? const Color(0xFF22C55E)
        : isActive ? AppColors.amber : AppColors.busy;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(
            isFree ? Icons.storefront_rounded : Icons.workspace_premium_rounded,
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
                  style: TextStyle(color: color, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                Text(
                  isFree ? 'Plan gratuito activo' : isActive ? 'Suscripción activa' : 'Suscripción inactiva',
                  style: TextStyle(color: c.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Datos de plan ────────────────────────────────────────────

class _PlanData {
  final String id;
  final String label;
  final String price;
  final String priceNote;
  final List<String> features;
  final Color color;
  final IconData icon;
  final bool isPopular;

  const _PlanData({
    required this.id,
    required this.label,
    required this.price,
    required this.priceNote,
    required this.features,
    required this.color,
    required this.icon,
    this.isPopular = false,
  });
}

const _kPlans = [
  _PlanData(
    id: 'GRATIS',
    label: 'Gratis',
    price: 'S/ 0',
    priceNote: 'Para siempre',
    features: [
      'Perfil básico visible',
      'Hasta 2 fotos',
      'Sin estadísticas',
      'Posición estándar en búsqueda',
    ],
    color: Color(0xFF6B7280),
    icon: Icons.storefront_rounded,
  ),
  _PlanData(
    id: 'ESTANDAR',
    label: 'Estándar',
    price: 'S/ 29',
    priceNote: 'por mes',
    features: [
      'Badge verificado azul',
      'Hasta 4 fotos',
      'Estadísticas básicas',
      'Mayor visibilidad en búsqueda',
    ],
    color: AppColors.standard,
    icon: Icons.verified_rounded,
    isPopular: true,
  ),
  _PlanData(
    id: 'PREMIUM',
    label: 'Premium',
    price: 'S/ 59',
    priceNote: 'por mes',
    features: [
      'Badge dorado Premium',
      'Fotos ilimitadas',
      'Estadísticas avanzadas',
      'Posición #1 garantizada',
      'Soporte prioritario 24/7',
    ],
    color: AppColors.premium,
    icon: Icons.workspace_premium_rounded,
  ),
];

// ─── Planes colapsables ("Ver planes disponibles") ───────────

class _CollapsiblePlansSection extends StatefulWidget {
  final String currentPlan;
  const _CollapsiblePlansSection({required this.currentPlan});

  @override
  State<_CollapsiblePlansSection> createState() => _CollapsiblePlansSectionState();
}

class _CollapsiblePlansSectionState extends State<_CollapsiblePlansSection> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: _expanded
                  ? AppColors.amber.withValues(alpha: 0.08)
                  : c.bgCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _expanded
                    ? AppColors.amber.withValues(alpha: 0.4)
                    : c.border,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.workspace_premium_rounded,
                  color: _expanded ? AppColors.amber : c.textMuted,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Ver planes disponibles',
                    style: TextStyle(
                      color: _expanded ? AppColors.amber : c.textSecondary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Icon(
                  _expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                  color: _expanded ? AppColors.amber : c.textMuted,
                ),
              ],
            ),
          ),
        ),
        if (_expanded) ...[
          const SizedBox(height: 12),
          ..._kPlans.map((plan) {
            final isCurrent = plan.id == widget.currentPlan;
            return _PlanCard(plan: plan, isCurrent: isCurrent);
          }),
        ],
      ],
    );
  }
}

// ─── Tarjeta de plan interactiva ─────────────────────────────

class _PlanCard extends StatefulWidget {
  final _PlanData plan;
  final bool isCurrent;
  const _PlanCard({required this.plan, required this.isCurrent});

  @override
  State<_PlanCard> createState() => _PlanCardState();
}

class _PlanCardState extends State<_PlanCard> {
  bool _pressed = false;

  Future<void> _openConfirmSheet() async {
    if (widget.isCurrent || widget.plan.id == 'GRATIS') return;

    // If user has an active paid plan, block and redirect to cancel flow
    final dash = context.read<DashboardProvider>();
    final sub  = dash.profile?.subscription;
    final hasActivePaidPlan = sub != null && sub.isActive && sub.plan != 'GRATIS';
    if (hasActivePaidPlan) {
      final c = context.colors;
      await showDialog(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: c.bgCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Plan activo detectado',
              style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
          content: Text(
            'TIENES QUE CANCELAR TU PLAN ACTUAL (${sub.planLabel}) antes de adquirir uno nuevo. Ve a Ajustes → Suscripción → Cancelar plan.',
            style: TextStyle(color: c.textSecondary, height: 1.5),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Entendido', style: TextStyle(color: AppColors.primary)),
            ),
          ],
        ),
      );
      return;
    }

    final ok = await YapePaymentScreen.show(context, plan: widget.plan.id);
    if (ok == true && mounted) {
      context.showInfoSnack('Comprobante enviado. Te notificaremos cuando se valide.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final c       = context.colors;
    final plan    = widget.plan;
    final current = widget.isCurrent;
    final isFree  = plan.id == 'GRATIS';
    final tappable = !current && !isFree;

    return GestureDetector(
      onTapDown:   tappable ? (_) => setState(() => _pressed = true)  : null,
      onTapUp:     tappable ? (_) => setState(() => _pressed = false) : null,
      onTapCancel: tappable ? ()  => setState(() => _pressed = false) : null,
      onTap:       tappable ? _openConfirmSheet : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: current
              ? plan.color.withValues(alpha: c.isDark ? 0.12 : 0.06)
              : _pressed
                  ? plan.color.withValues(alpha: 0.08)
                  : c.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: current
                ? plan.color.withValues(alpha: 0.55)
                : _pressed
                    ? plan.color.withValues(alpha: 0.4)
                    : c.border,
            width: current ? 1.8 : 1.0,
          ),
          boxShadow: current
              ? [BoxShadow(color: plan.color.withValues(alpha: 0.18), blurRadius: 16, offset: const Offset(0, 4))]
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header ─────────────────────────────────────
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: plan.color.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(plan.icon, color: plan.color, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            plan.label,
                            style: TextStyle(
                              color: plan.color,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (current) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: plan.color.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                'Plan actual',
                                style: TextStyle(color: plan.color, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                          if (plan.isPopular && !current) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.standard.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.standard.withValues(alpha: 0.4)),
                              ),
                              child: Text(
                                '⭐ Popular',
                                style: TextStyle(color: AppColors.standard, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: plan.price,
                              style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            TextSpan(
                              text: ' ${plan.priceNote}',
                              style: TextStyle(color: c.textMuted, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (tappable)
                  Icon(Icons.chevron_right_rounded, color: plan.color.withValues(alpha: 0.6), size: 22),
              ],
            ),
            const SizedBox(height: 14),

            // ── Features con SVG check ──────────────────────
            ...plan.features.map((f) => Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child: Row(
                children: [
                  _SvgCheckIcon(color: plan.color),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      f,
                      style: TextStyle(
                        color: c.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            )),

            // ── CTA button (solo si no es actual ni gratis) ─
            if (tappable) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _openConfirmSheet,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: plan.color,
                    foregroundColor: plan.id == 'PREMIUM' ? const Color(0xFF3D2B00) : Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: Text(
                    'Solicitar plan ${plan.label}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── Icono de check en SVG inline ────────────────────────────

class _SvgCheckIcon extends StatelessWidget {
  final Color color;
  const _SvgCheckIcon({required this.color});

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(
      '''<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="9" fill="${_hex(color)}" fill-opacity="0.18"/>
        <path d="M6 10.5L8.8 13.5L14 7.5" stroke="${_hex(color)}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>''',
      width: 18,
      height: 18,
    );
  }

  String _hex(Color c) {
    return '#${c.toARGB32().toRadixString(16).substring(2).toUpperCase()}';
  }
}

// ─── Bottom sheet de confirmación ────────────────────────────

class _PlanConfirmSheet extends StatefulWidget {
  final _PlanData plan;
  const _PlanConfirmSheet({required this.plan});

  @override
  State<_PlanConfirmSheet> createState() => _PlanConfirmSheetState();
}

class _PlanConfirmSheetState extends State<_PlanConfirmSheet> {
  bool _loading = false;

  Future<void> _submit() async {
    setState(() => _loading = true);
    final dash = context.read<DashboardProvider>();
    final nav  = Navigator.of(context);

    final ok = await dash.requestPlanUpgrade(widget.plan.id);

    if (!mounted) return;
    setState(() => _loading = false);
    nav.pop();

    if (ok) {
      context.showInfoSnack('Solicitud enviada. Te notificaremos cuando sea procesada.');
    } else {
      context.showErrorSnack(dash.error ?? 'Error al enviar la solicitud');
    }
  }

  @override
  Widget build(BuildContext context) {
    final c    = context.colors;
    final plan = widget.plan;

    return Container(
      decoration: BoxDecoration(
        color: c.bgCard,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(24, 8, 24, MediaQuery.of(context).viewInsets.bottom + 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 36, height: 4,
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(
              color: c.textMuted.withValues(alpha: 0.35),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Icono del plan
          Container(
            width: 70, height: 70,
            decoration: BoxDecoration(
              color: plan.color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(color: plan.color.withValues(alpha: 0.4), width: 1.5),
            ),
            child: Icon(plan.icon, color: plan.color, size: 34),
          ),
          const SizedBox(height: 16),

          // Título
          Text(
            'Plan ${plan.label}',
            style: TextStyle(
              color: plan.color,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: plan.price,
                  style: TextStyle(color: c.textPrimary, fontSize: 20, fontWeight: FontWeight.bold),
                ),
                TextSpan(
                  text: ' ${plan.priceNote}',
                  style: TextStyle(color: c.textMuted, fontSize: 14),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Lista completa de beneficios
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: plan.color.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: plan.color.withValues(alpha: 0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Beneficios incluidos',
                  style: TextStyle(
                    color: plan.color,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 12),
                ...plan.features.map((f) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      _SvgCheckIcon(color: plan.color),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          f,
                          style: TextStyle(color: c.textPrimary, fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                )),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Nota informativa
          Row(
            children: [
              Icon(Icons.info_outline_rounded, color: c.textMuted, size: 14),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Tu solicitud será revisada por el administrador. Te notificaremos el resultado.',
                  style: TextStyle(color: c.textMuted, fontSize: 12, height: 1.4),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Botón de acción
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: plan.color,
                foregroundColor: plan.id == 'PREMIUM' ? const Color(0xFF3D2B00) : Colors.white,
                disabledBackgroundColor: plan.color.withValues(alpha: 0.4),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: _loading
                  ? SizedBox(
                      height: 20, width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: plan.id == 'PREMIUM' ? const Color(0xFF3D2B00) : Colors.white,
                      ),
                    )
                  : Text(
                      'Solicitar este plan',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
        ],
      ),
    );
  }
}

// ─── Toggle Servicio a domicilio ─────────────────────────────

class _HomeServiceToggle extends StatefulWidget {
  final DashboardProfileModel? profile;
  final dynamic dash; // DashboardProvider

  const _HomeServiceToggle({required this.profile, required this.dash});

  @override
  State<_HomeServiceToggle> createState() => _HomeServiceToggleState();
}

class _HomeServiceToggleState extends State<_HomeServiceToggle> {
  bool _loading = false;

  Future<void> _toggle(bool value) async {
    setState(() => _loading = true);
    await widget.dash.setHomeService(value);
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final active = widget.profile?.hasHomeService ?? false;

    return Container(
      decoration: BoxDecoration(
        color: active
            ? AppColors.primary.withValues(alpha: 0.07)
            : c.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: active
              ? AppColors.primary.withValues(alpha: 0.3)
              : c.border,
        ),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: active
                        ? AppColors.primary.withValues(alpha: 0.15)
                        : c.bgInput,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.home_repair_service_rounded,
                    color: active ? AppColors.primary : c.textMuted,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Servicio a domicilio',
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        active
                            ? 'Activo — los clientes verán que vas a domicilio'
                            : 'Inactivo — solo atiendes en tu dirección',
                        style: TextStyle(color: c.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                _loading
                    ? SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      )
                    : Switch(
                        value: active,
                        onChanged: _toggle,
                        activeThumbColor: Colors.white,
                        activeTrackColor: AppColors.primary,
                      ),
              ],
            ),
          ),
          if (active)
            Container(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.04),
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                border: Border(top: BorderSide(color: AppColors.primary.withValues(alpha: 0.15))),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 14),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Tu tarjeta mostrará el badge "Va a domicilio" para los clientes que busquen atención en casa.',
                      style: TextStyle(
                        color: AppColors.primary.withValues(alpha: 0.8),
                        fontSize: 11,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Botón cancelar plan ─────────────────────────────────────

class _CancelPlanButton extends StatefulWidget {
  final DashboardProvider dash;
  const _CancelPlanButton({required this.dash});

  @override
  State<_CancelPlanButton> createState() => _CancelPlanButtonState();
}

class _CancelPlanButtonState extends State<_CancelPlanButton> {
  bool _loading = false;

  Future<void> _confirm() async {
    final c = context.colors;
    final plan = widget.dash.profile?.subscription?.planLabel ?? 'actual';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('¿Cancelar tu plan?',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
        content: Text(
          'Al cancelar tu plan $plan perderás los beneficios inmediatamente y volverás al plan Gratis. Esta acción no reembolsa pagos anteriores.',
          style: TextStyle(color: c.textSecondary, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Mantener plan', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Sí, cancelar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;
    setState(() => _loading = true);
    try {
      await DashboardRepository().cancelPlan();
      if (!mounted) return;
      await widget.dash.loadDashboard();
      if (!mounted) return;
      context.showSuccessSnack('Plan cancelado. Ahora estás en el plan Gratis.');
    } catch (e) {
      if (!mounted) return;
      context.showErrorSnack('No se pudo cancelar: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _loading ? null : _confirm,
        icon: _loading
            ? const SizedBox(width: 16, height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.busy))
            : const Icon(Icons.cancel_outlined, size: 18, color: AppColors.busy),
        label: const Text('Cancelar plan',
            style: TextStyle(color: AppColors.busy, fontWeight: FontWeight.w600)),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: AppColors.busy.withValues(alpha: 0.5)),
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
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

// ─── Legal / Ayuda ────────────────────────────────────────────

enum _LegalSection { privacy, terms, help }

class _LegalSheet extends StatelessWidget {
  final String profileType; // 'OFICIO' | 'NEGOCIO'
  final _LegalSection section;

  const _LegalSheet({required this.profileType, required this.section});

  static void show(BuildContext context, {required String type, required _LegalSection section}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _LegalSheet(profileType: type, section: section),
    );
  }

  // ── Metadatos por sección y rol ──────────────────────────
  String get _title => switch (section) {
    _LegalSection.privacy => 'Política de Privacidad',
    _LegalSection.terms   => 'Términos y Condiciones',
    _LegalSection.help    => 'Centro de Ayuda',
  };

  IconData get _icon => switch (section) {
    _LegalSection.privacy => Icons.privacy_tip_rounded,
    _LegalSection.terms   => Icons.description_rounded,
    _LegalSection.help    => Icons.help_outline_rounded,
  };

  Color get _accentColor =>
      profileType == 'NEGOCIO' ? AppColors.amber : AppColors.primary;

  // ══════════════════════════════════════════════════════════
  // CONTENIDOS LEGALES — pega el texto definitivo en cada const
  // ══════════════════════════════════════════════════════════

  static const _privacyOficio = '''
POLÍTICA DE PRIVACIDAD — Profesionales (OFICIO)
ConfiServ · Versión 1.0

1. Identidad del Responsable: ConfiServ (en adelante "La Plataforma"), con domicilio en [Tu Ciudad], Perú, es el responsable del tratamiento de sus datos personales.
2. Datos Recolectados y Finalidad: * Datos Identificativos: Nombre completo, DNI (foto ambas caras), y selfie de validación. Finalidad: Verificar la identidad y otorgar la insignia "Confiable".
Datos de Contacto: Número de celular. Finalidad: Permitir que los clientes se contacten con usted fuera de la App.
Datos de Ubicación: Departamento y Distrito. Finalidad: Mostrar su zona de influencia a los clientes.
Marketing de Terceros: Sus datos de contacto (no sensibles) podrán ser transferidos a empresas aliadas para fines publicitarios, siempre que usted lo autorice expresamente.
3. Transferencia de Datos: * Supabase: Se utiliza para la gestión técnica de correos electrónicos y autenticación.
Autoridades: Los datos se entregarán ante mandato judicial. En caso de reporte de fraude, se colaborará con la víctima facilitando datos de identificación para la denuncia legal respectiva.
4. Almacenamiento y Seguridad: Sus fotos de DNI y selfies se almacenan de forma segura en nuestros servidores hasta que usted decida eliminar su cuenta. El acceso está restringido exclusivamente al administrador de la plataforma.
5. Derechos ARCO: Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición escribiendo a nuestro soporte técnico en la App.

Esta política describe cómo ConfiServ recopila, usa y protege
la información de los profesionales registrados en la plataforma.

Datos recopilados: nombre, DNI, teléfono, ubicación, foto de perfil,
historial de reseñas y métricas de actividad.

Última actualización: 2026
''';

  static const _privacyNegocio = '''
POLÍTICA DE PRIVACIDAD — Negocios (NEGOCIO)
ConfiServ · Versión 1.0 · 2026

1. Naturaleza de los Datos: Tratándose de negocios (Personas Jurídicas o Personas Naturales con Negocio - RUC 10), se recopilan datos para fortalecer la transparencia comercial.
2. Información Pública por Defecto: Para generar confianza en el mercado, los siguientes datos serán PÚBLICOS:
Nombre Comercial y Razón Social.
Número de RUC.
Ubicación (Distrito/Departamento).
Información sobre Delivery (si aplica).
3. Geolocalización (GPS): En el perfil de Negocio, la aplicación podrá utilizar la ubicación en tiempo real para:
Validar la veracidad de las reseñas de los clientes (verificar que el cliente estuvo en el establecimiento).
Mostrar el negocio en el mapa de proveedores locales.
No se guardará un historial de rutas del administrador del negocio.
4. Verificación de Confianza: Para obtener el badge de "Confiable", el negocio debe presentar documentación de SUNAT. Estos documentos no serán públicos y se tratarán bajo los mismos estándares de seguridad que los datos de los profesionales.
5. Uso Comercial: Al registrarse como Negocio, acepta que la información pública de su establecimiento pueda ser utilizada en campañas de marketing de ConfiServ o transferida a socios comerciales para potenciar el ecosistema de servicios locales.

Esta política describe cómo ConfiServ recopila, usa y protege
la información de los negocios registrados en la plataforma.

Datos recopilados: razón social, RUC, nombre comercial, dirección,
horario, fotos del local, historial de reseñas y métricas de ventas.

Última actualización: 2026
''';

  static const _termsOficio = '''
TÉRMINOS Y CONDICIONES — Profesionales (OFICIO)
ConfiServ · Versión 1.0 · 2026

[PEGAR TEXTO AQUÍ — Términos para profesionales/oficios]

Al registrarte como profesional en ConfiServ aceptas prestar
servicios de manera responsable, mantener tu perfil actualizado
y respetar las calificaciones y reseñas de los clientes.

Última actualización: 2026
''';

  static const _termsNegocio = '''
TÉRMINOS Y CONDICIONES — Negocios (NEGOCIO)
ConfiServ · Versión 1.0 · 2026

[PEGAR TEXTO AQUÍ — Términos para negocios]

Al registrar tu negocio en ConfiServ aceptas publicar información
veraz sobre tus productos y servicios, respetar los horarios
declarados y cumplir con la normativa comercial vigente.

Última actualización: 2026
''';

  static const _helpOficio = '''
CENTRO DE AYUDA — Profesionales
ConfiServ · 2026

1.1. ¿Cómo obtengo la insignia "Confiable"?
Para obtenerla, debes completar el formulario de Validación de Datos en tu panel. Requerimos una foto nítida de tu DNI (ambas caras) y una selfie sosteniendo tu documento para evitar suplantaciones. Una vez enviada, el administrador verificará que los datos coincidan con los registros públicos en un plazo de 24 a 48 horas.
1.2. ¿Por qué rechazaron mi documento de identidad?
Las razones más comunes son:
La foto está borrosa o tiene reflejos que impiden leer el DNI.
El documento está vencido.
La selfie no coincide con la foto del DNI.
Los nombres registrados en la App no coinciden exactamente con el documento físico.
1.3. ¿Cómo recibo los pagos de mis clientes?
ConfiServ no interviene en los pagos por tus servicios. Tú acuerdas el precio y el método de pago (efectivo, Yape, transferencia) directamente con el cliente a través de WhatsApp o llamada telefónica. Recomendamos siempre pedir un adelanto solo si el trabajo lo justifica y dar un comprobante si eres formal.
3.1. Un cliente me estafó o me trató mal, ¿qué hago?
Puedes reportar al usuario desde la opción de soporte en la App. Si el incidente es grave (robo o agresión), te proporcionaremos la información de registro del usuario (dentro de los límites legales) para que realices la denuncia ante la PNP o el Ministerio Público.
3.2. ¿Cómo funciona el sistema de reseñas?
Las reseñas son de los usuarios y ConfiServ no las borra a menos que contengan insultos o sean falsas demostrables. Si consideras que una reseña es injusta, puedes solicitar una Mediación de Perfil para ocultarla temporalmente mientras se aclara el incidente con el cliente.
3.3. ¿Mis datos están seguros?
Sí. Tus fotos de documentos (DNI/RUC) no son visibles para ningún usuario; solo las ve el administrador para fines de validación. Usamos almacenamiento encriptado para proteger tu información sensible.
PREGUNTAS FRECUENTES

¿Cómo mejoro mi visibilidad?
Completa al 100% tu perfil, agrega fotos y responde rápido a los clientes.

¿Cómo activo el servicio a domicilio?
Ve a Configuración → Servicio a domicilio y activa el toggle.

¿Cómo subo de plan?
Ve a Configuración → Subir de rango y elige el plan que más te convenga.

¿Cómo contacto soporte?
Escribe a soporte@confiserv.pe o usa "Reportar un problema".
''';

  static const _helpNegocio = '''
CENTRO DE AYUDA — Negocios
ConfiServ · 2026

2.1. ¿Qué ventajas tengo al registrar mi RUC?
Registrar tu RUC permite que los clientes verifiquen que eres un negocio formal ante la SUNAT, lo cual aumenta drásticamente tu tasa de clics y llamadas. Además, habilita campos específicos como Nombre Comercial y Razón Social en tu tarjeta de presentación.
2.2. ¿Cómo funciona el sistema de Delivery?
En tu panel de configuración, puedes activar el toggle de "Tiene Delivery". Si marcas la opción "Plena Coordinación", el cliente entenderá que el costo y la zona de envío se negocian directamente contigo al momento del contacto.
2.3. ¿Puedo tener un perfil de Oficio y uno de Negocio a la vez?
Sí, pero bajo las siguientes condiciones:
Debes usar el mismo correo, pero gestionarás perfiles separados en tu dashboard.
Cada perfil requiere su propia validación de datos para garantizar la transparencia ante el usuario final.

PREGUNTAS FRECUENTES

¿Cómo actualizo mi horario de atención?
Ve a tu perfil de negocio → Editar → Horario.

¿Cómo activo la opción de delivery?
Ve a Configuración → Servicio a domicilio y activa el toggle.

¿Cómo subo de plan?
Ve a Configuración → Subir de rango y elige el plan que más te convenga.

¿Cómo contacto soporte?
Escribe a soporte@confiserv.pe o usa "Reportar un problema".
''';

  // ══════════════════════════════════════════════════════════

  String get _content => switch (section) {
    _LegalSection.privacy => profileType == 'NEGOCIO' ? _privacyNegocio : _privacyOficio,
    _LegalSection.terms   => profileType == 'NEGOCIO' ? _termsNegocio   : _termsOficio,
    _LegalSection.help    => profileType == 'NEGOCIO' ? _helpNegocio    : _helpOficio,
  };

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final accent = _accentColor;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) => Container(
        decoration: BoxDecoration(
          color: c.bgCard,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            // ── Handle ───────────────────────────────────────
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 8),
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: c.textMuted.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // ── Header con badge de rol ───────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 16, 12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(_icon, color: accent, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _title,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: accent.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            profileType == 'NEGOCIO' ? 'Panel de Negocios' : 'Panel Profesional',
                            style: TextStyle(color: accent, fontSize: 10, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: c.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            Divider(height: 1, color: c.border),

            // ── Contenido scrollable ─────────────────────────
            Expanded(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
                child: Text(
                  _content,
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 13,
                    height: 1.75,
                  ),
                ),
              ),
            ),

            // ── Botón cerrar ─────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accent,
                    foregroundColor: profileType == 'NEGOCIO'
                        ? const Color(0xFF3D2B00)
                        : Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Entendido',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
