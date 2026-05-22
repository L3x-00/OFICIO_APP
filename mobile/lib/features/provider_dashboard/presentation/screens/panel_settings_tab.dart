import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme_colors.dart';
import '../../../../core/theme/theme_provider.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../referrals/presentation/screens/referral_screen.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/settings/home_service_toggle.dart';
import '../widgets/settings/legal_sheet.dart';
import '../widgets/settings/logout_button.dart';
import '../widgets/settings/profile_header.dart';
import '../widgets/settings/settings_components.dart';
import '../widgets/settings/settings_dialogs.dart';
import '../widgets/settings/subscription_section.dart';
import 'package:flutter_svg/flutter_svg.dart';
/// Tab "Configuración" del panel del proveedor.
///
/// Orquesta el [CustomScrollView] con todas las secciones (Cuenta,
/// Promociones, Suscripción y planes, Servicio a domicilio, Apariencia,
/// Notificaciones, Legal, Soporte) + botón de logout. Cada sub-widget
/// vive en `settings/`.
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
                  SettingsProfileHeader(auth: auth, profile: profile),
                  const SizedBox(height: 20),

                  SettingsSection(
                    icon: Icons.person_rounded,
                    title: 'Cuenta',
                    children: [
                      SettingsTile(
                        icon: Icons.person_rounded,
                        label: 'Nombre de usuario',
                        subtitle: auth.user?.fullName ?? '',
                      ),
                      SettingsTile(
                        icon: Icons.email_rounded,
                        label: 'Correo electrónico',
                        subtitle: auth.user?.email ?? '',
                      ),
                      SettingsTile(
                        icon: Icons.phone_rounded,
                        label: 'Teléfono de cuenta',
                        subtitle: auth.user?.phone ?? 'No configurado',
                      ),
                      DangerTile(
                        icon: Icons.person_remove_rounded,
                        label: profile?.type == 'NEGOCIO'
                            ? 'Eliminar perfil de negocio'
                            : 'Eliminar perfil profesional',
                        subtitle: auth.hasOficioProfile && auth.hasNegocioProfile
                            ? 'Solo elimina este perfil, el otro se mantiene'
                            : 'Pasarás a ser cliente al eliminar este perfil',
                        onTap: () => showDeleteProfileDialog(context, dash, auth, profile?.type),
                      ),
                    ],
                  ),

                  SettingsSection(
                    icon: Icons.card_giftcard_rounded,
                    title: 'Promociones',
                    children: [
                      SettingsTile(
                        icon: Icons.monetization_on_rounded,
                        label: 'Referidos y monedas',
                        subtitle: 'Invita profesionales y canjea monedas por planes o servicios',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const ReferralScreen(),
                          ),
                        ),
                      ),
                    ],
                  ),

                  SettingsSection(
                    icon: Icons.workspace_premium_rounded,
                    title: 'Suscripción y planes',
                    children: [
                      if (profile?.subscription != null) ...[
                        SubscriptionCard(sub: profile!.subscription!),
                        const SizedBox(height: 10),
                      ],
                      CollapsiblePlansSection(
                        currentPlan: profile?.subscription?.plan ?? 'GRATIS',
                      ),
                      if (profile?.subscription != null &&
                          profile!.subscription!.isActive &&
                          profile.subscription!.plan != 'GRATIS') ...[
                        const SizedBox(height: 10),
                        CancelPlanButton(dash: dash),
                      ],
                    ],
                  ),

                  if (profile?.type == 'OFICIO')
                    SettingsSection(
                      icon: Icons.home_repair_service_rounded,
                      title: 'Servicio a domicilio',
                      children: [
                        HomeServiceToggle(profile: profile, dash: dash),
                      ],
                    ),

                  SettingsSection(
                    icon: Icons.palette_outlined,
                    title: 'Apariencia',
                    children: [
                      SettingsSwitch(
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

                  SettingsSection(
                    icon: Icons.notifications_outlined,
                    title: 'Notificaciones',
                    children: [
                      SettingsSwitch(
                        icon: Icons.notifications_rounded,
                        label: 'Nuevas reseñas',
                        subtitle: 'Recibir aviso cuando alguien te califica',
                        value: true,
                        onChanged: (_) {},
                      ),
                      SettingsSwitch(
                        svgAsset: 'assets/icons/whatsapp.svg',
                        label: 'Mensajes de WhatsApp',
                        subtitle: 'Notificación cuando alguien te contacta',
                        value: true,
                        onChanged: (_) {},
                      ),
                    ],
                  ),

                  SettingsSection(
                    icon: Icons.shield_outlined,
                    title: 'Legal y privacidad',
                    children: [
                      SettingsTile(
                        icon: Icons.privacy_tip_rounded,
                        label: 'Política de privacidad',
                        onTap: () => LegalSheet.show(
                          context,
                          type:    profile?.type ?? 'OFICIO',
                          section: LegalSection.privacy,
                        ),
                      ),
                      SettingsTile(
                        icon: Icons.description_rounded,
                        label: 'Términos y condiciones',
                        onTap: () => LegalSheet.show(
                          context,
                          type:    profile?.type ?? 'OFICIO',
                          section: LegalSection.terms,
                        ),
                      ),
                    ],
                  ),

                  SettingsSection(
                    icon: Icons.help_outline_rounded,
                    title: 'Soporte',
                    children: [
                      SettingsTile(
                        icon: Icons.help_outline_rounded,
                        label: 'Centro de ayuda',
                        onTap: () => LegalSheet.show(
                          context,
                          type:    profile?.type ?? 'OFICIO',
                          section: LegalSection.help,
                        ),
                      ),
                      SettingsTile(
                        icon: Icons.bug_report_rounded,
                        label: 'Reportar un problema',
                        onTap: () => showReportDialog(context),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  LogoutButton(onTap: () => showLogoutDialog(context, auth)),

                  const SizedBox(height: 20),
                  Center(
                    child: Text(
                      profile?.type == 'NEGOCIO'
                          ? 'Servi v1.0.0 — Panel de Negocios'
                          : 'Servi v1.0.0 — Panel Profesional',
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
}
