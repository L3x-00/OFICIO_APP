import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile/core/constans/app_colors.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../../../providers_list/presentation/providers/providers_provider.dart';
import 'change_password_screen.dart';
import 'edit_profile_screen.dart';
import 'onboarding_screen.dart';
import 'saved_accounts_screen.dart';
import 'login_screen.dart';
import '../../../../features/provider_dashboard/presentation/screens/provider_panel.dart';
import '../../../../features/provider_dashboard/data/dashboard_repository.dart';
import '../../../../features/subastas/presentation/providers/subastas_provider.dart';
import '../../../../features/subastas/presentation/screens/my_requests_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _uploadingAvatar = false;

  Future<void> _pickAndUploadAvatar(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: source,
      imageQuality: 80,
      maxWidth: 800,
    );
    if (picked == null || !mounted) return;

    setState(() => _uploadingAvatar = true);
    final auth = context.read<AuthProvider>();
    final ok = await auth.updateProfilePicture(File(picked.path));
    if (!mounted) return;
    setState(() => _uploadingAvatar = false);

    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? 'Error al subir la imagen'),
          backgroundColor: AppColors.busy,
        ),
      );
    }
  }

  void _showAvatarOptions() {
    final c = context.colors;
    showModalBottomSheet(
      context: context,
      backgroundColor: c.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(
                Icons.camera_alt_rounded,
                color: AppColors.primary,
              ),
              title: Text('Tomar foto', style: TextStyle(color: c.textPrimary)),
              onTap: () {
                Navigator.pop(context);
                _pickAndUploadAvatar(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.photo_library_rounded,
                color: AppColors.primary,
              ),
              title: Text(
                'Seleccionar de la galería',
                style: TextStyle(color: c.textPrimary),
              ),
              onTap: () {
                Navigator.pop(context);
                _pickAndUploadAvatar(ImageSource.gallery);
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final theme = context.watch<ThemeProvider>();
    final c = context.colors;
    final user = auth.user;

    // ── Estado invitado ────────────────────────────────────
    if (user == null) {
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
            IconButton(
              tooltip: theme.isDark
                  ? 'Cambiar a tema claro'
                  : 'Cambiar a tema oscuro',
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                transitionBuilder: (child, anim) => RotationTransition(
                  turns: anim,
                  child: FadeTransition(opacity: anim, child: child),
                ),
                child: Icon(
                  theme.isDark
                      ? Icons.light_mode_rounded
                      : Icons.dark_mode_rounded,
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
                  child: const Icon(
                    Icons.person_outline_rounded,
                    color: AppColors.primary,
                    size: 40,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Tu perfil te espera',
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                Text(
                  'Inicia sesión o regístrate para gestionar tu perfil, ver tus notificaciones y ser parte de la comunidad.',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontSize: 14,
                    height: 1.6,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Iniciar sesión / Registrarse',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // After the null-check guard above, user is guaranteed non-null
    final u = user;

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
              tooltip: theme.isDark
                  ? 'Cambiar a tema claro'
                  : 'Cambiar a tema oscuro',
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                transitionBuilder: (child, anim) => RotationTransition(
                  turns: anim,
                  child: FadeTransition(opacity: anim, child: child),
                ),
                child: Icon(
                  theme.isDark
                      ? Icons.light_mode_rounded
                      : Icons.dark_mode_rounded,
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
                // ── Avatar tappable ──────────────────────────
                GestureDetector(
                  onTap: _showAvatarOptions,
                  child: Stack(
                    children: [
                      // Círculo del avatar
                      Container(
                        width: 90,
                        height: 90,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: u.avatarUrl == null
                              ? const LinearGradient(
                                  colors: [
                                    AppColors.primary,
                                    AppColors.primaryDark,
                                  ],
                                )
                              : null,
                          color: u.avatarUrl != null ? c.bgCard : null,
                          border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.4),
                            width: 2,
                          ),
                        ),
                        child: ClipOval(
                          child: _uploadingAvatar
                              ? const Center(
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2.5,
                                  ),
                                )
                              : u.avatarUrl != null
                              ? CachedNetworkImage(
                                  key: ValueKey('avatar_${u.id}_${u.avatarUrl}'),
                                  imageUrl: u.avatarUrl!,
                                  fit: BoxFit.cover,
                                  placeholder: (_, _) => const Center(
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  ),
                                  errorWidget: (_, _, _) =>
                                      _InitialsAvatar(name: u.firstName),
                                )
                              : _InitialsAvatar(name: u.firstName),
                        ),
                      ),
                      // Badge cámara
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                            border: Border.all(color: c.bg, width: 2),
                          ),
                          child: const Icon(
                            Icons.camera_alt_rounded,
                            color: Colors.white,
                            size: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  u.fullName,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  u.email,
                  style: TextStyle(color: c.textSecondary, fontSize: 14),
                ),
                const SizedBox(height: 8),
                _AccountTypeBadge(auth: auth),
              ],
            ),
          ),
          const SizedBox(height: 32),

          _SectionTitle(title: 'Información de cuenta'),
          const SizedBox(height: 12),
          _InfoRow(icon: Icons.email_outlined, label: 'Correo', value: u.email),
          _InfoRow(
            icon: Icons.person_outline,
            label: 'Nombre completo',
            value: u.fullName,
          ),
          if (u.phone != null && u.phone!.isNotEmpty)
            _InfoRow(
              icon: Icons.phone_outlined,
              label: 'Teléfono',
              value: u.phone!,
            ),
          _InfoRow(
            icon: Icons.shield_outlined,
            label: 'Tipo de cuenta',
            value: _accountTypeLabel(auth),
          ),
          const SizedBox(height: 20),

          // ── Acciones de perfil ────────────────────────────
          _SectionTitle(title: 'Gestión de cuenta'),
          const SizedBox(height: 12),
          _ActionButton(
            icon: Icons.edit_outlined,
            label: 'Editar información',
            color: AppColors.primary,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const EditProfileScreen()),
            ),
          ),
          const SizedBox(height: 10),
          _ActionButton(
            icon: Icons.lock_outline,
            label: 'Cambiar contraseña',
            color: AppColors.primary,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ChangePasswordScreen()),
            ),
          ),
          const SizedBox(height: 10),
          _ActionButton(
            icon: Icons.assignment_outlined,
            label: 'Mis solicitudes',
            color: AppColors.amber,
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ChangeNotifierProvider(
                  create: (_) => SubastasProvider(),
                  child: const MyRequestsScreen(),
                ),
              ),
            ),
          ),
          const SizedBox(height: 28),

          if (auth.hasOficioProfile || auth.hasNegocioProfile) ...[
            const _SectionTitle(title: 'MIS PERFILES DE PROVEEDOR'),
            const SizedBox(height: 12),

            // ── Decisión por perfil independiente ─────────────────────
            // APROBADO → botón de panel | otro estado → banner
            if (auth.hasOficioProfile) ...[
              if (auth.verificationStatusFor('OFICIO') == 'APROBADO')
                _ActionButton(
                  icon: Icons.handyman_rounded,
                  label: 'Panel Profesional',
                  color: AppColors.primary,
                  onTap: () => _openProviderPanel(context, 'OFICIO'),
                )
              else
                _PendingApprovalBanner(
                  providerType: 'OFICIO',
                  status: auth.verificationStatusFor('OFICIO') ?? 'PENDIENTE',
                  rejectionReason: auth.rejectionReasonFor('OFICIO'),
                ),
            ],

            if (auth.hasOficioProfile && auth.hasNegocioProfile)
              const SizedBox(height: 10),

            if (auth.hasNegocioProfile) ...[
              if (auth.verificationStatusFor('NEGOCIO') == 'APROBADO')
                _ActionButton(
                  icon: Icons.storefront_rounded,
                  label: 'Panel de Negocio',
                  color: const Color(0xFF8E2DE2),
                  onTap: () => _openProviderPanel(context, 'NEGOCIO'),
                )
              else
                _PendingApprovalBanner(
                  providerType: 'NEGOCIO',
                  status: auth.verificationStatusFor('NEGOCIO') ?? 'PENDIENTE',
                  rejectionReason: auth.rejectionReasonFor('NEGOCIO'),
                ),
            ],

            // Opción de segundo perfil — solo si al menos uno está APROBADO
            if (auth.hasApprovedProvider) ...[
              const SizedBox(height: 10),
              if (auth.hasOficioProfile && !auth.hasNegocioProfile)
                _ActionButton(
                  icon: Icons.storefront_rounded,
                  label: 'Registrar un Negocio',
                  color: const Color(0xFF8E2DE2),
                  onTap: () => _openAddProfile(context, 'NEGOCIO'),
                ),
              if (auth.hasNegocioProfile && !auth.hasOficioProfile)
                _ActionButton(
                  icon: Icons.handyman_rounded,
                  label: 'Ofrecer Servicios como Profesional',
                  color: AppColors.primary,
                  onTap: () => _openAddProfile(context, 'OFICIO'),
                ),
            ],

            const SizedBox(height: 20),
          ],

          // Mostrar botones de alta según los perfiles que faltan
          if (auth.canBecomeRole('OFICIO') || auth.canBecomeRole('NEGOCIO')) ...[
            if (auth.canBecomeRole('OFICIO'))
              _ActionButton(
                icon: Icons.handyman_rounded,
                label: 'Ser profesional independiente',
                color: AppColors.primary,
                onTap: () => _openAddProfile(context, 'OFICIO'),
              ),
            if (auth.canBecomeRole('OFICIO') && auth.canBecomeRole('NEGOCIO'))
              const SizedBox(height: 10),
            if (auth.canBecomeRole('NEGOCIO'))
              _ActionButton(
                icon: Icons.storefront_rounded,
                label: 'Registrar un negocio',
                color: const Color(0xFF8E2DE2),
                onTap: () => _openAddProfile(context, 'NEGOCIO'),
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
              MaterialPageRoute(builder: (_) => const SavedAccountsScreen()),
            ),
          ),
          const SizedBox(height: 12),

          _ActionButton(
            icon: Icons.bug_report_rounded,
            label: 'Reportar un problema',
            color: AppColors.amber,
            onTap: () => _showReportProblemDialog(context, auth),
          ),
          const SizedBox(height: 8),
          _ActionButton(
            icon: Icons.logout_rounded,
            label: 'Cerrar sesión',
            color: AppColors.busy,
            onTap: () => _confirmLogout(context, auth),
          ),
          const SizedBox(height: 8),
          _ActionButton(
            icon: Icons.delete_forever_rounded,
            label: 'Eliminar cuenta',
            color: const Color(0xFF991B1B),
            onTap: () => _confirmDeleteAccount(context, auth),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }


  /// Tipo de cuenta visible en la UI.
  /// Solo muestra "Profesional" / "Negocio" cuando el proveedor ha sido APROBADO;
  /// mientras esté pendiente, el tipo sigue siendo "Cliente".
  String _accountTypeLabel(AuthProvider auth) {
    if (auth.user?.role == 'ADMIN') return 'Administrador';
    if (!auth.hasApprovedProvider) return 'Cliente';

    final parts = <String>['Cliente'];
    if (auth.hasOficioProfile) parts.add('Profesional');
    if (auth.hasNegocioProfile) parts.add('Negocio');
    return parts.join(' + ');
  }

  /// Navega directamente al panel del tipo indicado ('OFICIO' o 'NEGOCIO').
  void _openProviderPanel(BuildContext context, String type) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProviderPanel(providerType: type),
      ),
    );
  }

  void _openAddProfile(BuildContext context, String type) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            ProviderOnboardingForm(providerType: type, isStandalone: true),
      ),
    );
  }

  void _confirmLogout(BuildContext ctx, AuthProvider auth) {
    final c = ctx.colors;
    showDialog(
      context: ctx,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Cerrar sesión', style: TextStyle(color: c.textPrimary)),
        content: Text(
          '¿Estás seguro de que deseas salir?',
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
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.busy,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Salir', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showReportProblemDialog(BuildContext ctx, AuthProvider auth) {
    final c = ctx.colors;
    final ctrl = TextEditingController();
    showDialog(
      context: ctx,
      builder: (dCtx) => AlertDialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Reportar un problema',
            style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold)),
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
            onPressed: () => Navigator.pop(dCtx),
            child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
          ),
          ElevatedButton(
            onPressed: () async {
              final text = ctrl.text.trim();
              if (text.length < 5) return;
              try {
                final userId = auth.user?.id;
                if (userId != null) {
                  await DashboardRepository().reportPlatformIssue(
                    userId: userId,
                    description: text,
                  );
                }
                if (dCtx.mounted) {
                  Navigator.pop(dCtx);
                  ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
                    content: Text('Reporte enviado. ¡Gracias por tu ayuda!'),
                    backgroundColor: Color(0xFF10B981),
                  ));
                }
              } catch (_) {}
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.amber,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Enviar',
                style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteAccount(BuildContext ctx, AuthProvider auth) {
    final c = ctx.colors;
    const red = Color(0xFF991B1B);
    final controller = TextEditingController();
    showDialog(
      context: ctx,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (_, setS) => AlertDialog(
          backgroundColor: c.bgCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            '¿Eliminar tu cuenta?',
            style: TextStyle(color: red, fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Esta acción es IRREVERSIBLE. Se eliminarán tu cuenta y todos los datos asociados (perfiles, reseñas, favoritos, etc.).\n\nEscribe ELIMINAR para confirmar:',
                style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                onChanged: (_) => setS(() {}),
                style: TextStyle(color: c.textPrimary),
                decoration: InputDecoration(
                  hintText: 'Escribe ELIMINAR',
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
              onPressed: () => Navigator.pop(dialogCtx),
              child: Text('Cancelar', style: TextStyle(color: c.textMuted)),
            ),
            ElevatedButton(
              onPressed: controller.text.trim().toUpperCase() == 'ELIMINAR'
                  ? () async {
                      Navigator.pop(dialogCtx);
                      final ok = await auth.deleteAccount();
                      if (!ok && ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(
                            content: Text('Error al eliminar la cuenta. Inténtalo de nuevo.'),
                            backgroundColor: Color(0xFFEF4444),
                          ),
                        );
                      }
                    }
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: red,
                disabledBackgroundColor: c.bgCard,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Eliminar cuenta', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Widgets auxiliares ───────────────────────────────────

class _InitialsAvatar extends StatelessWidget {
  final String name;
  const _InitialsAvatar({required this.name});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.transparent,
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 32,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

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
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Switch(
              value: !theme.isDark,
              onChanged: (_) => theme.toggle(),
              activeThumbColor: AppColors.amber,
            ),
          ],
        ),
      ),
    );
  }
}

/// Badge de tipo de cuenta con color según rol aprobado.
/// Cliente = azul | Profesional aprobado = verde | Negocio aprobado = morado
class _AccountTypeBadge extends StatelessWidget {
  final AuthProvider auth;
  const _AccountTypeBadge({required this.auth});

  @override
  Widget build(BuildContext context) {
    // Color según el tipo aprobado más relevante
    final Color color;
    if (auth.user?.role == 'ADMIN') {
      color = AppColors.amber;
    } else if (auth.hasApprovedProvider && auth.hasNegocioProfile) {
      color = const Color(0xFF8E2DE2); // morado
    } else if (auth.hasApprovedProvider && auth.hasOficioProfile) {
      color = AppColors.available; // verde
    } else {
      color = AppColors.primary; // azul (cliente o pendiente)
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        _label(),
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }

  String _label() {
    if (auth.user?.role == 'ADMIN') return 'Administrador';
    if (!auth.hasApprovedProvider) return 'Cliente';
    final parts = <String>['Cliente'];
    if (auth.hasOficioProfile) parts.add('Profesional');
    if (auth.hasNegocioProfile) parts.add('Negocio');
    return parts.join(' + ');
  }
}


// ─────────────────────────────────────────────────────────────

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

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

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
        boxShadow: c.isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 6,
                ),
              ],
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
              Text(
                value,
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PendingApprovalBanner extends StatelessWidget {
  /// 'OFICIO' | 'NEGOCIO'
  final String providerType;
  /// 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'
  final String status;
  /// Motivo de rechazo (solo cuando status == 'RECHAZADO')
  final String? rejectionReason;

  const _PendingApprovalBanner({
    required this.providerType,
    required this.status,
    this.rejectionReason,
  });

  bool get _isNegocio    => providerType == 'NEGOCIO';
  bool get _isRejected   => status == 'RECHAZADO';

  Color get _accentColor {
    if (_isRejected) return const Color(0xFFEF4444); // rojo
    return _isNegocio ? const Color(0xFF8E2DE2) : AppColors.available;
  }

  IconData get _icon {
    if (_isRejected) return Icons.cancel_rounded;
    return _isNegocio ? Icons.storefront_rounded : Icons.handyman_rounded;
  }

  String get _title {
    if (_isRejected) {
      return _isNegocio
          ? 'Tu negocio fue rechazado'
          : 'Tu perfil profesional fue rechazado';
    }
    return _isNegocio
        ? 'Esperando la aprobación del negocio'
        : 'Esperando la aprobación del perfil profesional';
  }

  String get _subtitle {
    if (_isRejected) return 'Toca para ver el motivo del rechazo';
    return 'Toca para conocer el proceso de revisión';
  }

  void _showDialog(BuildContext context) {
    if (_isRejected) {
      _showRejectionDialog(context);
    } else {
      _showApprovalInfoDialog(context);
    }
  }

  void _showRejectionDialog(BuildContext context) {
    final c = context.colors;
    const accent = Color(0xFFEF4444);
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.cancel_rounded, color: accent, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      _isNegocio ? 'Negocio rechazado' : 'Perfil rechazado',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'El administrador ha rechazado tu solicitud por el siguiente motivo:',
                style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: accent.withValues(alpha: 0.25)),
                ),
                child: Text(
                  rejectionReason ?? 'No se especificó un motivo.',
                  style: const TextStyle(
                    color: Color(0xFFEF4444),
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    height: 1.5,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: c.bgInput,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: AppColors.amber, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Puedes corregir la información e intentar registrarte nuevamente.',
                        style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: accent,
                        side: BorderSide(color: accent.withValues(alpha: 0.5)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Entendido', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        final auth = context.read<AuthProvider>();
                        Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => ProviderOnboardingForm(
                            providerType: providerType,
                            isStandalone: true,
                            initialData: auth.providerDataFor(providerType),
                          ),
                        ));
                      },
                      icon: const Icon(Icons.refresh_rounded, size: 16),
                      label: const Text('Reintentar'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        textStyle: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showApprovalInfoDialog(BuildContext context) {
    final c = context.colors;
    final accent = _accentColor;
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: c.bgCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(_icon, color: accent, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      _isNegocio ? 'Aprobación del Negocio' : 'Aprobación del Perfil Profesional',
                      style: TextStyle(
                        color: c.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _ApprovalStep(
                number: '1',
                title: 'Revisión de datos',
                description: 'El equipo de OficioApp verifica que la información de tu perfil sea correcta y completa.',
              ),
              const SizedBox(height: 14),
              _ApprovalStep(
                number: '2',
                title: 'Verificación de identidad',
                description: 'Si proporcionaste DNI u otros documentos, se valida su autenticidad.',
              ),
              const SizedBox(height: 14),
              _ApprovalStep(
                number: '3',
                title: 'Notificación de aprobación',
                description: 'Recibirás una notificación en la app cuando tu perfil sea aprobado y esté visible para los clientes.',
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: c.bgInput,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_rounded, color: AppColors.amber, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'El proceso suele demorar entre 24 y 48 horas hábiles.',
                        style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Entendido', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final accent = _accentColor;
    return GestureDetector(
      onTap: () => _showDialog(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: accent.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: accent.withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Icon(_icon, color: accent, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _title,
                    style: TextStyle(
                      color: accent,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _subtitle,
                    style: TextStyle(color: c.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: accent, size: 20),
          ],
        ),
      ),
    );
  }
}

class _ApprovalStep extends StatelessWidget {
  final String number;
  final String title;
  final String description;

  const _ApprovalStep({
    required this.number,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              number,
              style: const TextStyle(
                color: AppColors.primary,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
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
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.4),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

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
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            Icon(Icons.arrow_forward_ios_rounded, color: color, size: 14),
          ],
        ),
      ),
    );
  }
}

