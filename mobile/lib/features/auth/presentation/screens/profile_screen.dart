import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/core/constants/feature_flags.dart';
import 'package:mobile/core/theme/app_theme_colors.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:mobile/shared/widgets/app_network_image.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/profile/contact_us_section.dart';
import '../../../agenda/presentation/screens/my_appointments_screen.dart';
import '../../../quotation/presentation/screens/my_quotations_screen.dart';
import '../widgets/profile/guest_profile_view.dart';
import '../widgets/profile/profile_avatar_picker.dart';
import '../widgets/profile/profile_badges.dart';
import '../widgets/profile/profile_dialogs.dart';
import '../widgets/profile/profile_helpers.dart';
import '../widgets/profile/profile_sections.dart';
import '../widgets/profile/profile_toggles.dart';
import '../../../providers_list/presentation/providers/providers_provider.dart';
import '../../../subastas/presentation/providers/subastas_provider.dart';
import '../../../subastas/presentation/screens/my_requests_screen.dart';
import '../../../chat/presentation/screens/chat_list_screen.dart';
import '../../../referrals/presentation/screens/referral_screen.dart';
import 'change_password_screen.dart';
import 'edit_profile_screen.dart';
import 'saved_accounts_screen.dart';

// ── Barrel exports: otros archivos pueden importar
//    `profile_screen.dart` y acceder a todos los componentes extraídos.
export '../widgets/profile/guest_profile_view.dart';
export '../widgets/profile/profile_avatar_picker.dart';
export '../widgets/profile/profile_badges.dart';
export '../widgets/profile/profile_dialogs.dart';
export '../widgets/profile/profile_helpers.dart';
export '../widgets/profile/profile_sections.dart';
export '../widgets/profile/profile_toggles.dart';

/// Pantalla de perfil del usuario. Orquesta:
///   - Vista de invitado ([GuestProfileView]) si `auth.user == null`.
///   - Avatar + nombre + badge de tipo de cuenta.
///   - Secciones colapsables: información, gestión, perfiles de proveedor,
///     conversión a proveedor, preferencias, soporte.
///   - Botones de cerrar sesión y eliminar cuenta.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _avatarPicker = AvatarPickerManager();

  @override
  void dispose() {
    _avatarPicker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final theme = context.watch<ThemeProvider>();
    final c = context.colors;
    final user = auth.user;

    if (user == null) return GuestProfileView(theme: theme);

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
          // ── Avatar + nombre + badge ──────────────────────────
          Center(
            child: Column(
              children: [
                GestureDetector(
                  onTap: () => _avatarPicker.showOptions(context),
                  child: Stack(
                    children: [
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
                          child: ValueListenableBuilder<bool>(
                            valueListenable: _avatarPicker.uploading,
                            builder: (_, uploading, _) {
                              if (uploading) {
                                return const Center(
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2.5,
                                  ),
                                );
                              }
                              if (u.avatarUrl != null) {
                                return AppNetworkImage(
                                  key: ValueKey(
                                    'avatar_${u.id}_${u.avatarUrl}',
                                  ),
                                  url: u.avatarUrl!,
                                  fit: BoxFit.cover,
                                  placeholder: const Center(
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  ),
                                  errorWidget: InitialsAvatar(
                                    name: u.firstName,
                                  ),
                                );
                              }
                              return InitialsAvatar(name: u.firstName);
                            },
                          ),
                        ),
                      ),
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
                  style: TextStyle(color: c.textMuted, fontSize: 14),
                ),
                const SizedBox(height: 8),
                AccountTypeBadge(auth: auth),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // ── Información de cuenta ─────────────────────────
          ExpandableSection(
            icon: Icons.person_outline_rounded,
            title: 'Información de cuenta',
            children: [
              SectionItem(icon: Icons.email_outlined, label: u.email),
              SectionItem(icon: Icons.badge_outlined, label: u.fullName),
              if (u.phone != null && u.phone!.isNotEmpty)
                SectionItem(icon: Icons.phone_outlined, label: u.phone!),
              SectionItem(
                icon: Icons.shield_outlined,
                label: ProfileNavigationHelper.accountTypeLabel(auth),
                isLast: true,
              ),
            ],
          ),

          // ── Gestión de cuenta ─────────────────────────────
          ExpandableSection(
            icon: Icons.manage_accounts_outlined,
            title: 'Gestión de cuenta',
            children: [
              SectionItem(
                icon: Icons.edit_outlined,
                label: 'Editar información',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const EditProfileScreen()),
                ),
              ),
              SectionItem(
                icon: Icons.lock_outline,
                label: 'Cambiar contraseña',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const ChangePasswordScreen(),
                  ),
                ),
              ),
              // Feature OCULTA (kSubastasEnabled): entrada a Mis solicitudes.
              if (kSubastasEnabled)
                SectionItem(
                  icon: Icons.assignment_outlined,
                  label: 'Mis solicitudes',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ChangeNotifierProvider(
                        create: (_) => SubastasProvider(),
                        child: const MyRequestsScreen(),
                      ),
                    ),
                  ),
                ),
              SectionItem(
                icon: Icons.forum_outlined,
                label: 'Mis mensajes',
                // scope:'client' — la entrada a "Mis mensajes" desde el
                // perfil cliente vive en la bandeja del cliente, no
                // mezcla con los mensajes recibidos como proveedor.
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const ChatListScreen(scope: 'client'),
                  ),
                ),
              ),
              SectionItem(
                icon: Icons.event_available_outlined,
                label: 'Mis citas',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const MyAppointmentsScreen(),
                  ),
                ),
              ),
              SectionItem(
                icon: Icons.request_quote_outlined,
                label: 'Mis cotizaciones',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const MyQuotationsScreen()),
                ),
              ),
              SectionItem(
                icon: Icons.card_giftcard_rounded,
                label: 'Promociones y referidos',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ReferralScreen()),
                ),
                isLast: true,
              ),
            ],
          ),

          // ── Mis perfiles (solo si tiene alguno) ───────────
          if (auth.hasOficioProfile || auth.hasNegocioProfile)
            ExpandableSection(
              icon: Icons.work_outline_rounded,
              title: 'Mis perfiles',
              children: [
                if (auth.hasOficioProfile) ...[
                  if (auth.verificationStatusFor('OFICIO') == 'APROBADO')
                    SectionItem(
                      icon: Icons.handyman_rounded,
                      label: 'Panel Profesional',
                      onTap: () => ProfileNavigationHelper.openProviderPanel(
                        context,
                        'OFICIO',
                      ),
                    )
                  else
                    PendingApprovalBanner(
                      providerType: 'OFICIO',
                      status:
                          auth.verificationStatusFor('OFICIO') ?? 'PENDIENTE',
                      rejectionReason: auth.rejectionReasonFor('OFICIO'),
                    ),
                  const SizedBox(height: 4),
                ],
                if (auth.hasNegocioProfile) ...[
                  if (auth.verificationStatusFor('NEGOCIO') == 'APROBADO')
                    SectionItem(
                      icon: Icons.storefront_rounded,
                      label: 'Panel de Negocio',
                      onTap: () => ProfileNavigationHelper.openProviderPanel(
                        context,
                        'NEGOCIO',
                      ),
                    )
                  else
                    PendingApprovalBanner(
                      providerType: 'NEGOCIO',
                      status:
                          auth.verificationStatusFor('NEGOCIO') ?? 'PENDIENTE',
                      rejectionReason: auth.rejectionReasonFor('NEGOCIO'),
                    ),
                  const SizedBox(height: 4),
                ],
                if (auth.hasApprovedProvider) ...[
                  if (auth.hasOficioProfile && !auth.hasNegocioProfile)
                    SectionItem(
                      icon: Icons.storefront_rounded,
                      label: 'Registrar un Negocio',
                      onTap: () => ProfileNavigationHelper.openAddProfile(
                        context,
                        'NEGOCIO',
                      ),
                      isLast: true,
                    ),
                  if (auth.hasNegocioProfile && !auth.hasOficioProfile)
                    SectionItem(
                      icon: Icons.handyman_rounded,
                      label: 'Ofrecer servicios como Profesional',
                      onTap: () => ProfileNavigationHelper.openAddProfile(
                        context,
                        'OFICIO',
                      ),
                      isLast: true,
                    ),
                ],
              ],
            ),

          // ── Conviértete en proveedor ─────────────────────
          if (auth.canBecomeRole('OFICIO') || auth.canBecomeRole('NEGOCIO'))
            ExpandableSection(
              icon: Icons.add_business_rounded,
              title: 'Conviértete en proveedor',
              children: [
                if (auth.canBecomeRole('OFICIO'))
                  SectionItem(
                    icon: Icons.handyman_rounded,
                    label: 'Ser profesional independiente',
                    onTap: () => ProfileNavigationHelper.openAddProfile(
                      context,
                      'OFICIO',
                    ),
                    isLast: !auth.canBecomeRole('NEGOCIO'),
                  ),
                if (auth.canBecomeRole('NEGOCIO'))
                  SectionItem(
                    icon: Icons.storefront_rounded,
                    label: 'Registrar un negocio',
                    onTap: () => ProfileNavigationHelper.openAddProfile(
                      context,
                      'NEGOCIO',
                    ),
                    isLast: true,
                  ),
              ],
            ),

          // ── Preferencias ─────────────────────────────────
          ExpandableSection(
            icon: Icons.tune_rounded,
            title: 'Preferencias',
            children: [
              ThemeToggleRow(theme: theme),
              const SizedBox(height: 8),
              CategoryFilterToggleRow(prov: context.watch<ProvidersProvider>()),
              const SizedBox(height: 8),
              SectionItem(
                icon: Icons.devices_rounded,
                label: 'Cuentas guardadas en este dispositivo',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const SavedAccountsScreen(),
                  ),
                ),
                isLast: true,
              ),
            ],
          ),

          // ── Soporte ──────────────────────────────────────
          ExpandableSection(
            icon: Icons.help_outline_rounded,
            title: 'Soporte',
            children: [
              SectionItem(
                icon: Icons.bug_report_rounded,
                label: 'Reportar un problema',
                onTap: () => ProfileDialogs.showReportProblem(context, auth),
                isLast: true,
              ),
            ],
          ),

          // ── Contáctanos (canales oficiales de soporte) ──────
          const SizedBox(height: 8),
          const ContactUsSection(),

          const SizedBox(height: 8),

          ActionButton(
            icon: Icons.logout_rounded,
            label: 'Cerrar sesión',
            color: AppColors.busy,
            onTap: () => ProfileDialogs.confirmLogout(context, auth),
          ),
          const SizedBox(height: 8),
          ActionButton(
            icon: Icons.delete_forever_rounded,
            label: 'Eliminar cuenta',
            color: AppColors.busy,
            onTap: () => ProfileDialogs.confirmDeleteAccount(context, auth),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
